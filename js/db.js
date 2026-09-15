// db.js — persistence layer backed by Cloud Firestore. Each account's data lives in a
// single document at userData/{uid}, scoped by Firestore security rules to that uid only.
// The rest of the app (every view file) reads/writes through a synchronous in-memory
// cache — exactly like the old localStorage version — so no view code needs to change.
// Writes are pushed to Firestore in the background and retried by Firestore's own
// offline queue if the network is down.
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import { fs } from './firebase.js';
import { uid, todayStr, dowIndex, daysBetween, pct, clamp } from './utils.js';

export const DEFAULT_CATEGORIES = [
  'Career', 'Finance', 'Health', 'Personal', 'Learning', 'Relationships', 'Creativity', 'Other'
];

function emptyUserData() {
  return {
    goals: [],
    milestones: [],
    habits: [],
    habitLogs: [],
    tasks: [],
    challenges: [],
    challengeLogs: [],
    categories: DEFAULT_CATEGORIES.map(name => ({ id: uid(), name, custom: false })),
    unlockedAchievements: [],
    checkins: [],
    settings: {
      theme: 'light',
      notificationsEnabled: true,
      reminders: { tasks: true, habits: true, goalDeadlines: true, challenges: true, dailyCheckin: true },
      privacy: { shareProgress: false }
    }
  };
}

let cache = null;
let currentUid = null;
let saveTimer = null;
let onSaveError = null;

export function setSaveErrorHandler(fn) { onSaveError = fn; }

function docRef() { return doc(fs, 'userData', currentUid); }

// Loads (or creates) this user's data document. Call once right after sign-in.
export async function loadData(userId) {
  currentUid = userId;
  const ref = doc(fs, 'userData', userId);
  const snap = await getDoc(ref);
  const def = emptyUserData();
  if (snap.exists()) {
    cache = snap.data();
    for (const k in def) if (!(k in cache)) cache[k] = def[k];
  } else {
    cache = def;
    await setDoc(ref, cache);
  }
  return cache;
}

export function unloadData() {
  cache = null;
  currentUid = null;
  if (saveTimer) clearTimeout(saveTimer);
}

// Debounced write-through so rapid successive edits (e.g. reordering) don't fire a
// network write per keystroke, while still saving within a fraction of a second.
export function persist() {
  if (!currentUid) return;
  const snapshotUid = currentUid;
  const payload = JSON.parse(JSON.stringify(cache));
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    setDoc(doc(fs, 'userData', snapshotUid), payload).catch(err => {
      console.error('WonderI: failed to save to Firestore', err);
      if (onSaveError) onSaveError(err);
    });
  }, 250);
}

export function data() {
  return cache;
}

function collection(name) {
  return {
    all: () => cache[name],
    get: id => cache[name].find(x => x.id === id),
    add: item => {
      const withMeta = { id: uid(), createdAt: new Date().toISOString(), ...item };
      cache[name].push(withMeta);
      persist();
      return withMeta;
    },
    update: (id, patch) => {
      const i = cache[name].findIndex(x => x.id === id);
      if (i === -1) return null;
      cache[name][i] = { ...cache[name][i], ...patch };
      persist();
      return cache[name][i];
    },
    remove: id => {
      cache[name] = cache[name].filter(x => x.id !== id);
      persist();
    }
  };
}

export const Goals = collection('goals');
export const Milestones = collection('milestones');
export const Habits = collection('habits');
export const HabitLogs = collection('habitLogs');
export const Tasks = collection('tasks');
export const Challenges = collection('challenges');
export const ChallengeLogs = collection('challengeLogs');
export const Categories = collection('categories');
export const Checkins = collection('checkins');

export function settings() { return cache.settings; }
export function updateSettings(patch) {
  cache.settings = { ...cache.settings, ...patch };
  persist();
}

// ---------- derived / computed logic ----------

export function goalProgress(goal) {
  const milestones = Milestones.all().filter(m => m.goalId === goal.id);
  const hasTarget = goal.targetValue != null && goal.targetValue !== '' && Number(goal.targetValue) > 0;
  const hasMilestones = milestones.length > 0;
  if (goal.status === 'completed') return 100;
  if (hasTarget && hasMilestones) {
    const valuePct = pct(Number(goal.currentValue) || 0, Number(goal.targetValue));
    const msPct = pct(milestones.filter(m => m.done).length, milestones.length);
    return Math.round((valuePct + msPct) / 2);
  }
  if (hasTarget) return pct(Number(goal.currentValue) || 0, Number(goal.targetValue));
  if (hasMilestones) return pct(milestones.filter(m => m.done).length, milestones.length);
  return 0;
}

export function goalMilestones(goalId) {
  return Milestones.all()
    .filter(m => m.goalId === goalId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function habitScheduledOn(habit, dateStr) {
  const dow = dowIndex(dateStr);
  if (habit.frequency === 'daily') return true;
  if (habit.frequency === 'weekly' || habit.frequency === 'custom') {
    return (habit.scheduleDays || []).includes(dow);
  }
  return true;
}
export { habitScheduledOn };

export function habitLogFor(habitId, dateStr) {
  return HabitLogs.all().find(l => l.habitId === habitId && l.date === dateStr);
}

export function toggleHabitCompletion(habitId, dateStr) {
  const existing = habitLogFor(habitId, dateStr);
  if (existing) {
    HabitLogs.remove(existing.id);
    return false;
  } else {
    HabitLogs.add({ habitId, date: dateStr, completed: true });
    return true;
  }
}

export function habitStats(habit) {
  const logs = HabitLogs.all()
    .filter(l => l.habitId === habit.id)
    .map(l => l.date)
    .sort();
  const logSet = new Set(logs);

  let current = 0;
  let d = todayStr();
  const createdDate = habit.createdAt ? habit.createdAt.slice(0, 10) : '1970-01-01';
  let guard = 0;
  while (d >= createdDate && guard < 3650) {
    guard++;
    if (habitScheduledOn(habit, d)) {
      if (logSet.has(d)) {
        current++;
      } else if (d === todayStr()) {
        // today not done yet — skip without breaking streak
      } else {
        break;
      }
    }
    const prev = new Date(d);
    prev.setDate(prev.getDate() - 1);
    d = prev.toISOString().slice(0, 10);
  }

  let best = 0, run = 0;
  let scan = createdDate;
  const end = todayStr();
  guard = 0;
  while (scan <= end && guard < 3650) {
    guard++;
    if (habitScheduledOn(habit, scan)) {
      if (logSet.has(scan)) { run++; best = Math.max(best, run); }
      else run = 0;
    }
    const nx = new Date(scan);
    nx.setDate(nx.getDate() + 1);
    scan = nx.toISOString().slice(0, 10);
  }

  let scheduled = 0, completed = 0;
  scan = createdDate;
  guard = 0;
  while (scan <= end && guard < 3650) {
    guard++;
    if (habitScheduledOn(habit, scan)) {
      scheduled++;
      if (logSet.has(scan)) completed++;
    }
    const nx = new Date(scan);
    nx.setDate(nx.getDate() + 1);
    scan = nx.toISOString().slice(0, 10);
  }
  const rate = scheduled ? Math.round((completed / scheduled) * 100) : 0;

  return { currentStreak: current, bestStreak: best, completionRate: rate, totalCompletions: logs.length };
}

export function overallStreak() {
  const habitDates = new Set(HabitLogs.all().map(l => l.date));
  const taskDates = new Set(Tasks.all().filter(t => t.status === 'completed' && t.completedAt).map(t => t.completedAt.slice(0, 10)));
  const checkinDates = new Set(Checkins.all().map(c => c.date));
  const active = new Set([...habitDates, ...taskDates, ...checkinDates]);
  let streak = 0;
  let d = todayStr();
  let guard = 0;
  while (guard < 3650) {
    guard++;
    if (active.has(d)) { streak++; }
    else if (d === todayStr()) { /* today not logged yet, don't break */ }
    else break;
    const prev = new Date(d);
    prev.setDate(prev.getDate() - 1);
    d = prev.toISOString().slice(0, 10);
  }
  return streak;
}

export function challengeStats(challenge) {
  const logs = ChallengeLogs.all().filter(l => l.challengeId === challenge.id);
  const totalDays = daysBetween(challenge.startDate, challenge.endDate) + 1;
  const today = todayStr();
  const dayNum = clamp(daysBetween(challenge.startDate, today) + 1, 0, totalDays);
  const remaining = clamp(daysBetween(today, challenge.endDate), 0, totalDays);
  const progress = totalDays > 0 ? pct(logs.filter(l => l.completed).length, totalDays) : 0;
  let streak = 0;
  let d = today < challenge.endDate ? today : challenge.endDate;
  const logSet = new Set(logs.filter(l => l.completed).map(l => l.date));
  let guard = 0;
  while (d >= challenge.startDate && guard < 1000) {
    guard++;
    if (logSet.has(d)) streak++;
    else if (d === today) { /* skip today */ }
    else break;
    const prev = new Date(d);
    prev.setDate(prev.getDate() - 1);
    d = prev.toISOString().slice(0, 10);
  }
  return { totalDays, dayNum, remaining, progress, streak, completedCount: logSet.size };
}

export function taskSubtasks(taskId) {
  return Tasks.all().filter(t => t.parentId === taskId);
}

export function isOverdue(dateStr, status) {
  if (!dateStr || status === 'completed') return false;
  return dateStr < todayStr();
}
