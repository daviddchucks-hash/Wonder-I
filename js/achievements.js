// achievements.js — predefined rules, checked after every relevant action.
import * as db from './db.js';
import { uid } from './utils.js';

export const ACHIEVEMENTS = [
  { id: 'first_goal', title: 'First Goal', desc: 'Create your first goal', check: d => d.goals.length >= 1 },
  { id: 'first_habit', title: 'First Habit', desc: 'Create your first habit', check: d => d.habits.length >= 1 },
  { id: 'first_challenge', title: 'First Challenge', desc: 'Start your first challenge', check: d => d.challenges.length >= 1 },
  { id: 'first_task_done', title: 'First Completed Task', desc: 'Complete your first task', check: d => d.tasks.filter(t => t.status === 'completed').length >= 1 },
  { id: 'streak_7', title: '7-Day Streak', desc: 'Reach a 7-day activity streak', check: () => db.overallStreak() >= 7 },
  { id: 'streak_30', title: '30-Day Streak', desc: 'Reach a 30-day activity streak', check: () => db.overallStreak() >= 30 },
  { id: 'goals_10', title: '10 Goals Completed', desc: 'Complete 10 goals', check: d => d.goals.filter(g => g.status === 'completed').length >= 10 },
  { id: 'tasks_100', title: '100 Tasks Completed', desc: 'Complete 100 tasks', check: d => d.tasks.filter(t => t.status === 'completed').length >= 100 },
  { id: 'first_challenge_done', title: 'First Challenge Completed', desc: 'Finish a challenge', check: d => d.challenges.filter(c => c.status === 'completed').length >= 1 },
];

export function unlockedIds() {
  return new Set(db.data().unlockedAchievements.map(a => a.achievementId));
}

// returns newly unlocked achievement objects (for a toast/notification)
export function evaluate() {
  const d = db.data();
  const already = unlockedIds();
  const newly = [];
  for (const rule of ACHIEVEMENTS) {
    if (already.has(rule.id)) continue;
    let pass = false;
    try { pass = !!rule.check(d); } catch { pass = false; }
    if (pass) {
      const rec = { id: uid(), achievementId: rule.id, unlockedAt: new Date().toISOString() };
      d.unlockedAchievements.push(rec);
      newly.push(rule);
    }
  }
  if (newly.length) db.persist();
  return newly;
}

export function isUnlocked(id) {
  return unlockedIds().has(id);
}

export function unlockedAt(id) {
  const rec = db.data().unlockedAchievements.find(a => a.achievementId === id);
  return rec ? rec.unlockedAt : null;
}
