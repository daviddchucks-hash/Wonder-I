import * as db from '../db.js';
import * as auth from '../auth.js';
import { iconSvg, progressBar, priorityDot, emptyState, sectionHeader } from '../components.js';
import { todayStr, fmtDate, daysUntil, pct, isoWeekRange } from '../utils.js';
import { go } from '../app.js';

function greeting() {
  const h = new Date().getHours();
  const name = auth.currentUser.name.split(' ')[0];
  const g = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  return `${g}, ${name}`;
}

function todaysTasks() {
  const today = todayStr();
  return db.Tasks.all()
    .filter(t => t.status !== 'completed' && !t.parentId && (t.dueDate === today || (t.dueDate && t.dueDate < today)))
    .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
}

function todaysHabits() {
  const today = todayStr();
  return db.Habits.all()
    .filter(h => h.status !== 'archived' && db.habitScheduledOn(h, today));
}

function activeGoals() {
  return db.Goals.all().filter(g => g.status === 'active');
}
function activeChallenges() {
  return db.Challenges.all().filter(c => c.status === 'active');
}

function weeklyProgressPercent() {
  const week = isoWeekRange(todayStr());
  let scheduled = 0, done = 0;
  db.Habits.all().filter(h => h.status !== 'archived').forEach(h => {
    week.forEach(d => {
      if (db.habitScheduledOn(h, d) && d <= todayStr()) {
        scheduled++;
        if (db.habitLogFor(h.id, d)) done++;
      }
    });
  });
  const tasksThisWeek = db.Tasks.all().filter(t => !t.parentId && t.dueDate && week.includes(t.dueDate));
  tasksThisWeek.forEach(t => { scheduled++; if (t.status === 'completed') done++; });
  return scheduled ? pct(done, scheduled) : 0;
}
function upcomingDeadlines() {
  const today = todayStr();
  const in7 = [];
  db.Goals.all().filter(g => g.status === 'active' && g.deadline).forEach(g => in7.push({ type: 'Goal', title: g.title, date: g.deadline, route: `#/goal/${g.id}` }));
  db.Tasks.all().filter(t => t.status !== 'completed' && t.dueDate && !t.parentId).forEach(t => in7.push({ type: 'Task', title: t.title, date: t.dueDate, route: '#/plan/tasks' }));
  db.Challenges.all().filter(c => c.status === 'active').forEach(c => in7.push({ type: 'Challenge', title: c.name, date: c.endDate, route: '#/plan/challenges' }));
  return in7.filter(x => x.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
}

function recentlyCompleted() {
  const items = [];
  db.Tasks.all().filter(t => t.status === 'completed' && t.completedAt).forEach(t => items.push({ label: t.title, when: t.completedAt, kind: 'Task' }));
  db.Goals.all().filter(g => g.status === 'completed' && g.completedAt).forEach(g => items.push({ label: g.title, when: g.completedAt, kind: 'Goal' }));
  return items.sort((a, b) => b.when.localeCompare(a.when)).slice(0, 5);
}

export function render() {
  const tasks = todaysTasks();
  const habitsToday = todaysHabits();
  const gActive = activeGoals();
  const cActive = activeChallenges();
  const streak = db.overallStreak();
  const weekPct = weeklyProgressPercent();
  const deadlines = upcomingDeadlines();
  const recent = recentlyCompleted();

  return `<div class="page dashboard">
    <div class="greeting-row">
      <div>
        <h1 class="greeting">${greeting()}</h1>
        <p class="greeting-sub">${fmtDate(todayStr(), { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>
      <button class="streak-chip" id="go-checkin">${iconSvg('fire')}<span>${streak} day streak</span></button>
    </div>

    <div class="week-card">
      <div class="week-card-row">
        <span>This week's progress</span>
        <strong>${weekPct}%</strong>
      </div>
      ${progressBar(weekPct)}
    </div>

    ${sectionHeader("Today's tasks", `<a class="link" href="#/plan/tasks">See all</a>`)}
    ${tasks.length === 0 ? `<p class="muted-note">Nothing due today. Enjoy the clear runway.</p>` :
      `<div class="list">${tasks.slice(0, 5).map(t => `
        <label class="row-item">
          <input type="checkbox" class="check-toggle" data-task-toggle="${t.id}" ${t.status === 'completed' ? 'checked' : ''}>
          <span class="row-main">${priorityDot(t.priority)}<span>${escape(t.title)}</span></span>
          ${t.dueDate && t.dueDate < todayStr() ? '<span class="badge badge-danger">Overdue</span>' : ''}
        </label>`).join('')}</div>`}

    ${sectionHeader("Today's habits", `<a class="link" href="#/plan/habits">See all</a>`)}
    ${habitsToday.length === 0 ? `<p class="muted-note">No habits scheduled today.</p>` :
      `<div class="list">${habitsToday.map(h => {
        const done = !!db.habitLogFor(h.id, todayStr());
        return `<label class="row-item">
          <input type="checkbox" class="check-toggle" data-habit-toggle="${h.id}" ${done ? 'checked' : ''}>
          <span class="row-main"><span>${escape(h.name)}</span></span>
          <span class="badge badge-neutral">${db.habitStats(h).currentStreak}d</span>
        </label>`;
      }).join('')}</div>`}

    ${sectionHeader('Active goals', `<a class="link" href="#/plan/goals">See all</a>`)}
    ${gActive.length === 0 ? emptyState({ title: 'No active goals yet', body: 'Set your first goal to start tracking progress.', actionLabel: 'New goal', actionId: 'dash-new-goal', icon: 'target' }) :
      `<div class="list">${gActive.slice(0, 3).map(g => `
        <a class="row-item" href="#/goal/${g.id}">
          <span class="row-main"><span>${escape(g.title)}</span></span>
          <span class="mini-progress">${progressBar(db.goalProgress(g))}<em>${db.goalProgress(g)}%</em></span>
        </a>`).join('')}</div>`}

    ${cActive.length ? sectionHeader('Active challenges', `<a class="link" href="#/plan/challenges">See all</a>`) : ''}
    ${cActive.length ? `<div class="list">${cActive.slice(0, 2).map(c => {
      const s = db.challengeStats(c);
      return `<a class="row-item" href="#/plan/challenges">
        <span class="row-main"><span>${escape(c.name)}</span></span>
        <span class="badge badge-accent">Day ${s.dayNum}/${s.totalDays}</span>
      </a>`;
    }).join('')}</div>` : ''}

    ${deadlines.length ? sectionHeader('Upcoming deadlines') : ''}
    ${deadlines.length ? `<div class="list">${deadlines.map(d => `
      <a class="row-item" href="${d.route}">
        <span class="row-main"><span class="tag-mini">${d.type}</span><span>${escape(d.title)}</span></span>
        <span class="meta-item">${fmtDate(d.date)}</span>
      </a>`).join('')}</div>` : ''}

    ${recent.length ? sectionHeader('Recently completed') : ''}
    ${recent.length ? `<div class="list">${recent.map(r => `
      <div class="row-item static">
        <span class="row-main">${iconSvg('check', 'text-success')}<span>${escape(r.label)}</span></span>
        <span class="meta-item">${fmtDate(r.when.slice(0, 10))}</span>
      </div>`).join('')}</div>` : ''}
  </div>`;
}

function escape(s) { return s == null ? '' : String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

export function mount(rerender) {
  document.getElementById('go-checkin')?.addEventListener('click', () => go('#/checkin'));
  document.getElementById('dash-new-goal')?.addEventListener('click', () => go('#/plan/goals'));
  document.querySelectorAll('[data-task-toggle]').forEach(el => {
    el.addEventListener('change', () => {
      const t = db.Tasks.get(el.dataset.taskToggle);
      db.Tasks.update(t.id, { status: t.status === 'completed' ? 'pending' : 'completed', completedAt: t.status === 'completed' ? null : new Date().toISOString() });
      rerender();
    });
  });
  document.querySelectorAll('[data-habit-toggle]').forEach(el => {
    el.addEventListener('change', () => {
      db.toggleHabitCompletion(el.dataset.habitToggle, todayStr());
      rerender();
    });
  });
}
