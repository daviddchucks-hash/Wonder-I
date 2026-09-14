import * as db from '../db.js';
import { iconSvg, progressBar, emptyState, sectionHeader, planTabs, inputField, textareaField, selectField, button, escapeHtml, toast } from '../components.js';
import { openSheet, closeModal, confirmAction } from '../modal.js';
import { todayStr, dowIndex } from '../utils.js';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
let filterState = { status: 'active' };

function categoryList() { return db.Categories.all(); }

function list() {
  let habits = db.Habits.all();
  if (filterState.status !== 'all') habits = habits.filter(h => h.status === filterState.status);
  return habits;
}

export function render() {
  const habits = list();
  return `<div class="page">
    ${planTabs('habits')}
    <div class="toolbar">
      <div></div>
      <button class="btn btn-primary" id="new-habit-btn">${iconSvg('plus')}<span>New habit</span></button>
    </div>
    <div class="chip-row">
      ${['active', 'archived', 'all'].map(s => `<button class="chip ${filterState.status === s ? 'chip-active' : ''}" data-status="${s}">${s[0].toUpperCase() + s.slice(1)}</button>`).join('')}
    </div>
    ${habits.length === 0 ? emptyState({ title: 'No habits yet', body: 'Add a daily or weekly habit you want to build consistency with.', actionLabel: 'New habit', actionId: 'empty-new-habit', icon: 'flag' }) :
      `<div class="list">${habits.map(habitRow).join('')}</div>`}
  </div>`;
}

function habitRow(h) {
  const stats = db.habitStats(h);
  const doneToday = !!db.habitLogFor(h.id, todayStr());
  const scheduledToday = db.habitScheduledOn(h, todayStr());
  return `<div class="card-item habit-item" data-hid="${h.id}">
    <div class="card-item-top">
      <label class="row-main">
        ${scheduledToday ? `<input type="checkbox" class="check-toggle" data-habit-toggle="${h.id}" ${doneToday ? 'checked' : ''}>` : `<span class="pdot dot-neutral"></span>`}
        <span class="card-item-title">${escapeHtml(h.name)}</span>
      </label>
      <span class="badge badge-neutral">${iconSvg('fire', 'inline-icon')}${stats.currentStreak}</span>
    </div>
    <div class="card-item-meta">
      <span class="tag-mini">${escapeHtml(h.category || 'Other')}</span>
      <span class="meta-item">${scheduleLabel(h)}</span>
      <span class="meta-item">Best ${stats.bestStreak}d \u2022 ${stats.completionRate}% rate</span>
    </div>
    <div class="habit-actions">
      <button class="btn btn-ghost btn-small" data-history="${h.id}">History</button>
      <button class="btn btn-ghost btn-small" data-edit-habit="${h.id}">Edit</button>
      <button class="btn btn-ghost btn-small" data-archive-habit="${h.id}">${h.status === 'archived' ? 'Unarchive' : 'Archive'}</button>
      <button class="btn btn-ghost btn-small" data-delete-habit="${h.id}">Delete</button>
    </div>
  </div>`;
}

function scheduleLabel(h) {
  if (h.frequency === 'daily') return 'Every day';
  if ((h.scheduleDays || []).length === 7) return 'Every day';
  return (h.scheduleDays || []).sort().map(d => DOW[d]).join(', ') || 'Custom';
}

export function mount(rerender) {
  document.getElementById('new-habit-btn')?.addEventListener('click', () => openHabitForm(null, rerender));
  document.getElementById('empty-new-habit')?.addEventListener('click', () => openHabitForm(null, rerender));
  document.querySelectorAll('[data-status]').forEach(el => el.addEventListener('click', () => { filterState.status = el.dataset.status; rerender(); }));
  document.querySelectorAll('[data-habit-toggle]').forEach(el => el.addEventListener('change', () => { db.toggleHabitCompletion(el.dataset.habitToggle, todayStr()); rerender(); }));
  document.querySelectorAll('[data-edit-habit]').forEach(el => el.addEventListener('click', () => openHabitForm(el.dataset.editHabit, rerender)));
  document.querySelectorAll('[data-history]').forEach(el => el.addEventListener('click', () => openHistory(el.dataset.history)));
  document.querySelectorAll('[data-archive-habit]').forEach(el => el.addEventListener('click', () => {
    const h = db.Habits.get(el.dataset.archiveHabit);
    db.Habits.update(h.id, { status: h.status === 'archived' ? 'active' : 'archived' });
    rerender();
  }));
  document.querySelectorAll('[data-delete-habit]').forEach(el => el.addEventListener('click', () => {
    confirmAction({
      title: 'Delete this habit?', body: 'Its history will also be removed. This cannot be undone.',
      onConfirm: () => {
        db.HabitLogs.all().filter(l => l.habitId === el.dataset.deleteHabit).forEach(l => db.HabitLogs.remove(l.id));
        db.Habits.remove(el.dataset.deleteHabit);
        rerender();
      }
    });
  }));
}

function sheet(title, body, footer) {
  return `<div class="modal-overlay" id="sheet-overlay">
    <div class="sheet">
      <div class="sheet-handle"></div>
      <div class="sheet-header"><h3>${escapeHtml(title)}</h3><button class="icon-btn" data-close-modal>${iconSvg('x')}</button></div>
      <div class="sheet-body">${body}</div>
      ${footer ? `<div class="sheet-footer">${footer}</div>` : ''}
    </div>
  </div>`;
}

export function openHabitForm(habitId, rerender) {
  const h = habitId ? db.Habits.get(habitId) : null;
  const cats = categoryList();
  const days = h?.scheduleDays || [];
  const body = `<form id="habit-form">
    ${inputField({ label: 'Name', id: 'h-name', value: h?.name || '', placeholder: 'e.g. Drink water', required: true })}
    ${textareaField({ label: 'Description', id: 'h-desc', value: h?.description || '', placeholder: 'Optional details' })}
    ${selectField({ label: 'Category', id: 'h-category', options: cats.map(c => ({ value: c.name, label: c.name })), value: h?.category || cats[0].name })}
    ${selectField({ label: 'Frequency', id: 'h-frequency', options: [{ value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly (choose days)' }, { value: 'custom', label: 'Custom days' }], value: h?.frequency || 'daily' })}
    <div id="h-days-wrap" class="field" style="${(h?.frequency === 'daily' || !h) ? 'display:none' : ''}">
      <span class="field-label">Days</span>
      <div class="day-picker">${DOW.map((d, i) => `<button type="button" class="day-btn ${days.includes(i) ? 'active' : ''}" data-day="${i}">${d}</button>`).join('')}</div>
    </div>
    ${inputField({ label: 'Reminder time (optional)', id: 'h-reminder', type: 'time', value: h?.reminder || '' })}
  </form>`;
  const footer = `${button({ label: 'Cancel', variant: 'ghost', id: 'h-cancel' })}${button({ label: h ? 'Save changes' : 'Create habit', variant: 'primary', id: 'h-save' })}`;
  openSheet(sheet(h ? 'Edit habit' : 'New habit', body, footer));

  const freqSel = document.getElementById('h-frequency');
  const daysWrap = document.getElementById('h-days-wrap');
  freqSel.addEventListener('change', () => { daysWrap.style.display = freqSel.value === 'daily' ? 'none' : 'block'; });
  const selectedDays = new Set(days);
  document.querySelectorAll('.day-btn').forEach(btn => btn.addEventListener('click', () => {
    const d = Number(btn.dataset.day);
    if (selectedDays.has(d)) { selectedDays.delete(d); btn.classList.remove('active'); }
    else { selectedDays.add(d); btn.classList.add('active'); }
  }));

  document.getElementById('h-cancel').addEventListener('click', closeModal);
  document.getElementById('h-save').addEventListener('click', () => {
    const name = document.getElementById('h-name').value.trim();
    if (!name) { toast('Give your habit a name.'); return; }
    const frequency = freqSel.value;
    if (frequency !== 'daily' && selectedDays.size === 0) { toast('Pick at least one day.'); return; }
    const payload = {
      name,
      description: document.getElementById('h-desc').value.trim(),
      category: document.getElementById('h-category').value,
      frequency,
      scheduleDays: frequency === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : Array.from(selectedDays),
      reminder: document.getElementById('h-reminder').value || null,
    };
    if (h) db.Habits.update(h.id, payload);
    else db.Habits.add({ ...payload, status: 'active' });
    closeModal();
    toast(h ? 'Habit updated' : 'Habit created');
    rerender();
  });
}

function openHistory(habitId) {
  const h = db.Habits.get(habitId);
  const days = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const s = d.toISOString().slice(0, 10);
    days.push({ date: s, done: !!db.habitLogFor(habitId, s), scheduled: db.habitScheduledOn(h, s) });
  }
  const stats = db.habitStats(h);
  const body = `<div class="history-stats">
      <div><strong>${stats.currentStreak}</strong><span>Current streak</span></div>
      <div><strong>${stats.bestStreak}</strong><span>Best streak</span></div>
      <div><strong>${stats.completionRate}%</strong><span>Completion</span></div>
    </div>
    <div class="history-grid">${days.map(d => `<span class="history-cell ${d.done ? 'done' : d.scheduled ? 'missed' : 'off'}" title="${d.date}"></span>`).join('')}</div>
    <p class="muted-note">Last 28 days \u2014 filled means completed, hollow means scheduled but missed.</p>`;
  openSheet(sheet(`${h.name} \u2014 history`, body));
}
