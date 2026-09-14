import * as db from '../db.js';
import { iconSvg, escapeHtml, sectionHeader } from '../components.js';
import { monthRange, todayStr, fmtDate } from '../utils.js';

let viewMonth = new Date().getMonth();
let viewYear = new Date().getFullYear();
let selectedDate = todayStr();

function activityForDate(dateStr) {
  const items = [];
  db.Tasks.all().filter(t => t.status === 'completed' && t.completedAt?.slice(0, 10) === dateStr).forEach(t => items.push({ type: 'Task completed', label: t.title }));
  db.HabitLogs.all().filter(l => l.date === dateStr).forEach(l => {
    const h = db.Habits.get(l.habitId);
    if (h) items.push({ type: 'Habit', label: h.name });
  });
  db.Milestones.all().filter(m => m.done && m.completedAt?.slice(0, 10) === dateStr).forEach(m => {
    const g = db.Goals.get(m.goalId);
    items.push({ type: 'Milestone', label: `${m.title}${g ? ' \u2014 ' + g.title : ''}` });
  });
  db.ChallengeLogs.all().filter(l => l.date === dateStr && l.completed).forEach(l => {
    const c = db.Challenges.get(l.challengeId);
    if (c) items.push({ type: 'Challenge', label: c.name });
  });
  db.Tasks.all().filter(t => t.status !== 'completed' && t.dueDate === dateStr).forEach(t => items.push({ type: 'Task due', label: t.title }));
  db.Goals.all().filter(g => g.status === 'active' && g.deadline === dateStr).forEach(g => items.push({ type: 'Goal deadline', label: g.title }));
  return items;
}

export function render() {
  const dates = monthRange(viewYear, viewMonth);
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const dayItems = activityForDate(selectedDate);

  return `<div class="page">
    <div class="calendar-header">
      <button class="icon-btn" id="cal-prev">${iconSvg('chevronLeft')}</button>
      <h2>${monthLabel}</h2>
      <button class="icon-btn" id="cal-next">${iconSvg('chevronRight')}</button>
    </div>
    <div class="calendar-grid">
      ${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => `<div class="cal-dow">${d}</div>`).join('')}
      ${Array.from({ length: firstDow }).map(() => `<div class="cal-cell empty"></div>`).join('')}
      ${dates.map(d => {
        const items = activityForDate(d);
        const isToday = d === todayStr();
        const isSelected = d === selectedDate;
        return `<button class="cal-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}" data-date="${d}">
          <span>${Number(d.slice(8, 10))}</span>
          ${items.length ? `<span class="cal-dot"></span>` : ''}
        </button>`;
      }).join('')}
    </div>
    ${sectionHeader(fmtDate(selectedDate, { weekday: 'long', month: 'long', day: 'numeric' }))}
    ${dayItems.length === 0 ? `<p class="muted-note">Nothing logged this day.</p>` :
      `<div class="list">${dayItems.map(i => `<div class="row-item static"><span class="row-main"><span class="tag-mini">${escapeHtml(i.type)}</span><span>${escapeHtml(i.label)}</span></span></div>`).join('')}</div>`}
  </div>`;
}

export function mount(rerender) {
  document.getElementById('cal-prev').addEventListener('click', () => {
    viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; }
    rerender();
  });
  document.getElementById('cal-next').addEventListener('click', () => {
    viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; }
    rerender();
  });
  document.querySelectorAll('[data-date]').forEach(el => el.addEventListener('click', () => { selectedDate = el.dataset.date; rerender(); }));
}
