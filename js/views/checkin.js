import * as db from '../db.js';
import { iconSvg, progressBar, textareaField, button, escapeHtml, toast } from '../components.js';
import { todayStr } from '../utils.js';
import { go } from '../app.js';

export function render() {
  const today = todayStr();
  const tasks = db.Tasks.all().filter(t => !t.parentId && t.dueDate === today);
  const habits = db.Habits.all().filter(h => h.status !== 'archived' && db.habitScheduledOn(h, today));
  const goals = db.Goals.all().filter(g => g.status === 'active');
  const challenges = db.Challenges.all().filter(c => c.status === 'active' && today >= c.startDate && today <= c.endDate);
  const existing = db.Checkins.all().find(c => c.date === today);

  const totalItems = tasks.length + habits.length + challenges.length;
  const doneItems = tasks.filter(t => t.status === 'completed').length
    + habits.filter(h => db.habitLogFor(h.id, today)).length
    + challenges.filter(c => db.ChallengeLogs.all().some(l => l.challengeId === c.id && l.date === today && l.completed)).length;
  const percent = totalItems ? Math.round((doneItems / totalItems) * 100) : 100;

  return `<div class="page">
    <h1 class="page-title">Today's check-in</h1>
    <div class="progress-block">
      ${progressBar(percent)}
      <div class="progress-block-row"><strong>${percent}%</strong> of today done</div>
    </div>

    ${tasks.length ? section('Tasks', tasks.map(t => rowToggle('task', t.id, t.title, t.status === 'completed'))) : ''}
    ${habits.length ? section('Habits', habits.map(h => rowToggle('habit', h.id, h.name, !!db.habitLogFor(h.id, today)))) : ''}
    ${goals.length ? section('Active goals', goals.map(g => `<div class="row-item static"><span>${escapeHtml(g.title)}</span><span class="meta-item">${db.goalProgress(g)}%</span></div>`)) : ''}
    ${challenges.length ? section('Challenges', challenges.map(c => rowToggle('challenge', c.id, c.name, db.ChallengeLogs.all().some(l => l.challengeId === c.id && l.date === today && l.completed)))) : ''}
    ${!totalItems && !goals.length ? `<p class="muted-note">Nothing scheduled today \u2014 a good day to plan ahead.</p>` : ''}

    <div class="field">
      ${textareaField({ label: 'Daily note (optional)', id: 'checkin-note', value: existing?.note || '', placeholder: 'How did today go?' })}
    </div>
    ${button({ label: existing ? 'Update check-in' : 'Save check-in', variant: 'primary', id: 'save-checkin', full: true })}
  </div>`;
}

function section(title, rowsHtml) {
  return `<h3 class="checkin-section-title">${escapeHtml(title)}</h3><div class="list">${rowsHtml.join('')}</div>`;
}

function rowToggle(kind, id, label, done) {
  return `<label class="row-item">
    <input type="checkbox" class="check-toggle" data-checkin-toggle="${kind}:${id}" ${done ? 'checked' : ''}>
    <span class="${done ? 'strike' : ''}">${escapeHtml(label)}</span>
  </label>`;
}

export function mount(rerender) {
  document.querySelectorAll('[data-checkin-toggle]').forEach(el => {
    el.addEventListener('change', () => {
      const [kind, id] = el.dataset.checkinToggle.split(':');
      const today = todayStr();
      if (kind === 'task') {
        const t = db.Tasks.get(id);
        db.Tasks.update(id, { status: t.status === 'completed' ? 'pending' : 'completed', completedAt: t.status === 'completed' ? null : new Date().toISOString() });
      } else if (kind === 'habit') {
        db.toggleHabitCompletion(id, today);
      } else if (kind === 'challenge') {
        const existing = db.ChallengeLogs.all().find(l => l.challengeId === id && l.date === today);
        if (existing) db.ChallengeLogs.remove(existing.id);
        else db.ChallengeLogs.add({ challengeId: id, date: today, completed: true });
      }
      rerender();
    });
  });
  document.getElementById('save-checkin').addEventListener('click', () => {
    const today = todayStr();
    const note = document.getElementById('checkin-note').value.trim();
    const tasks = db.Tasks.all().filter(t => !t.parentId && t.dueDate === today);
    const habits = db.Habits.all().filter(h => h.status !== 'archived' && db.habitScheduledOn(h, today));
    const total = tasks.length + habits.length;
    const done = tasks.filter(t => t.status === 'completed').length + habits.filter(h => db.habitLogFor(h.id, today)).length;
    const percent = total ? Math.round((done / total) * 100) : 100;
    const existing = db.Checkins.all().find(c => c.date === today);
    if (existing) db.Checkins.update(existing.id, { note, completionPercent: percent });
    else db.Checkins.add({ date: today, note, completionPercent: percent });
    toast('Check-in saved');
    go('#/dashboard');
  });
}
