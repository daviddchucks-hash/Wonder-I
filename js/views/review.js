import * as db from '../db.js';
import { sectionHeader, escapeHtml } from '../components.js';
import { isoWeekRange, todayStr, fmtDate } from '../utils.js';

export function render() {
  const week = isoWeekRange(todayStr());
  const start = week[0], end = week[6];

  const tasksCompleted = db.Tasks.all().filter(t => t.completedAt && t.completedAt.slice(0, 10) >= start && t.completedAt.slice(0, 10) <= end);
  const habitLogsThisWeek = db.HabitLogs.all().filter(l => l.date >= start && l.date <= end);
  const milestonesThisWeek = db.Milestones.all().filter(m => m.done && m.completedAt && m.completedAt.slice(0, 10) >= start && m.completedAt.slice(0, 10) <= end);
  const goalsProgressed = new Set([
    ...db.Tasks.all().filter(t => t.goalId && t.completedAt && t.completedAt.slice(0, 10) >= start && t.completedAt.slice(0, 10) <= end).map(t => t.goalId),
    ...milestonesThisWeek.map(m => m.goalId)
  ]);
  const challengesCompleted = db.Challenges.all().filter(c => c.status === 'completed' && c.endDate >= start && c.endDate <= end);
  const streak = db.overallStreak();

  const catCounts = {};
  const bump = (cat, n = 1) => { if (!cat) return; catCounts[cat] = (catCounts[cat] || 0) + n; };
  tasksCompleted.forEach(t => bump(t.category));
  habitLogsThisWeek.forEach(l => { const h = db.Habits.get(l.habitId); if (h) bump(h.category); });
  const topCategories = Object.entries(catCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

  const overallActivity = tasksCompleted.length + habitLogsThisWeek.length + milestonesThisWeek.length + challengesCompleted.length;

  return `<div class="page">
    <h1 class="page-title">Weekly review</h1>
    <p class="muted-note">${fmtDate(start)} \u2013 ${fmtDate(end)}</p>

    <div class="stat-grid">
      <div class="stat-box"><strong>${tasksCompleted.length}</strong><span>Tasks completed</span></div>
      <div class="stat-box"><strong>${habitLogsThisWeek.length}</strong><span>Habits completed</span></div>
      <div class="stat-box"><strong>${goalsProgressed.size}</strong><span>Goals progressed</span></div>
      <div class="stat-box"><strong>${milestonesThisWeek.length}</strong><span>Milestones completed</span></div>
      <div class="stat-box"><strong>${challengesCompleted.length}</strong><span>Challenges completed</span></div>
      <div class="stat-box"><strong>${streak}</strong><span>Current streak</span></div>
    </div>

    ${sectionHeader('Overall activity')}
    <p class="muted-note">${overallActivity} completed item${overallActivity === 1 ? '' : 's'} logged this week across goals, habits, tasks and challenges.</p>

    ${sectionHeader('Areas with the most activity')}
    ${topCategories.length === 0 ? `<p class="muted-note">No activity logged yet this week.</p>` :
      `<div class="list">${topCategories.map(([name, count]) => `<div class="row-item static"><span>${escapeHtml(name)}</span><span class="meta-item">${count} item${count === 1 ? '' : 's'}</span></div>`).join('')}</div>`}
  </div>`;
}

export function mount() {}
