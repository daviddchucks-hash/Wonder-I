import * as db from '../db.js';
import { progressBar, sectionHeader, escapeHtml } from '../components.js';
import { isoWeekRange, todayStr, pct, monthRange } from '../utils.js';

function bestStreakEver() {
  let best = 0;
  db.Habits.all().forEach(h => { best = Math.max(best, db.habitStats(h).bestStreak); });
  return best;
}

function categoryBreakdown() {
  const cats = db.Categories.all().map(c => c.name);
  return cats.map(name => {
    const goals = db.Goals.all().filter(g => g.category === name);
    const tasksDone = db.Tasks.all().filter(t => t.category === name && t.status === 'completed').length;
    const tasksTotal = db.Tasks.all().filter(t => t.category === name).length;
    const habits = db.Habits.all().filter(h => h.category === name);
    const habitRate = habits.length ? Math.round(habits.reduce((s, h) => s + db.habitStats(h).completionRate, 0) / habits.length) : 0;
    const activity = tasksTotal + goals.length + habits.length;
    return { name, goals: goals.length, tasksDone, tasksTotal, habitRate, activity };
  }).filter(c => c.activity > 0).sort((a, b) => b.activity - a.activity);
}

function last7DaysActivity() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const s = d.toISOString().slice(0, 10);
    const habitCount = db.HabitLogs.all().filter(l => l.date === s).length;
    const taskCount = db.Tasks.all().filter(t => t.completedAt?.slice(0, 10) === s).length;
    days.push({ date: s, count: habitCount + taskCount, label: d.toLocaleDateString('en-US', { weekday: 'narrow' }) });
  }
  return days;
}

export function render() {
  const week = isoWeekRange(todayStr());
  const habits = db.Habits.all().filter(h => h.status !== 'archived');
  const weekHabitDone = week.filter(d => d <= todayStr()).reduce((sum, d) => sum + habits.filter(h => db.habitScheduledOn(h, d) && db.habitLogFor(h.id, d)).length, 0);
  const weekHabitScheduled = week.filter(d => d <= todayStr()).reduce((sum, d) => sum + habits.filter(h => db.habitScheduledOn(h, d)).length, 0);

  const monthDates = monthRange(new Date().getFullYear(), new Date().getMonth());
  const monthTasksDone = db.Tasks.all().filter(t => t.completedAt && monthDates.includes(t.completedAt.slice(0, 10))).length;

  const goalsCompleted = db.Goals.all().filter(g => g.status === 'completed').length;
  const goalsActive = db.Goals.all().filter(g => g.status === 'active').length;
  const tasksCompleted = db.Tasks.all().filter(t => t.status === 'completed').length;
  const habitRate = habits.length ? Math.round(habits.reduce((s, h) => s + db.habitStats(h).completionRate, 0) / habits.length) : 0;
  const activeChallenges = db.Challenges.all().filter(c => c.status === 'active');
  const currentStreak = db.overallStreak();
  const best = bestStreakEver();
  const cats = categoryBreakdown();
  const week7 = last7DaysActivity();
  const maxCount = Math.max(1, ...week7.map(d => d.count));

  return `<div class="page">
    <h1 class="page-title">Progress</h1>

    <div class="stat-grid">
      <div class="stat-box"><strong>${currentStreak}</strong><span>Current streak</span></div>
      <div class="stat-box"><strong>${best}</strong><span>Best streak</span></div>
      <div class="stat-box"><strong>${goalsCompleted}</strong><span>Goals completed</span></div>
      <div class="stat-box"><strong>${goalsActive}</strong><span>Goals in progress</span></div>
      <div class="stat-box"><strong>${tasksCompleted}</strong><span>Tasks completed</span></div>
      <div class="stat-box"><strong>${habitRate}%</strong><span>Habit completion rate</span></div>
    </div>

    ${sectionHeader('Last 7 days')}
    <div class="bar-chart">
      ${week7.map(d => `<div class="bar-col"><div class="bar" style="height:${Math.max(6, (d.count / maxCount) * 64)}px"></div><span>${d.label}</span></div>`).join('')}
    </div>

    ${sectionHeader('This week')}
    <div class="progress-block">
      <div class="progress-block-row"><span>Habits completed</span><strong>${weekHabitScheduled ? pct(weekHabitDone, weekHabitScheduled) : 0}%</strong></div>
      ${progressBar(weekHabitScheduled ? pct(weekHabitDone, weekHabitScheduled) : 0)}
    </div>

    ${sectionHeader('This month')}
    <p class="muted-note">${monthTasksDone} task${monthTasksDone === 1 ? '' : 's'} completed so far this month.</p>

    ${activeChallenges.length ? sectionHeader('Challenge progress') : ''}
    ${activeChallenges.length ? `<div class="list">${activeChallenges.map(c => {
      const s = db.challengeStats(c);
      return `<div class="row-item static"><span class="row-main"><span>${escapeHtml(c.name)}</span></span><span class="mini-progress">${progressBar(s.progress)}<em>${s.progress}%</em></span></div>`;
    }).join('')}</div>` : ''}

    ${cats.length ? sectionHeader('Progress by category') : ''}
    ${cats.length ? `<div class="list">${cats.map(c => `
      <div class="row-item static">
        <span class="row-main"><span>${escapeHtml(c.name)}</span></span>
        <span class="meta-item">${c.tasksDone}/${c.tasksTotal} tasks \u2022 ${c.habitRate}% habits</span>
      </div>`).join('')}</div>` : ''}
  </div>`;
}

export function mount() {}
