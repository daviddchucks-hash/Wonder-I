import * as db from '../db.js';
import { iconSvg, progressBar, statusBadge, emptyState, planTabs, inputField, textareaField, selectField, button, escapeHtml, toast } from '../components.js';
import { openSheet, closeModal, confirmAction } from '../modal.js';
import { todayStr, fmtDate, daysBetween } from '../utils.js';

let filterState = { status: 'active' };

function list() {
  let items = db.Challenges.all();
  if (filterState.status !== 'all') items = items.filter(c => c.status === filterState.status);
  return items.sort((a, b) => a.startDate.localeCompare(b.startDate));
}

function autoUpdateStatuses() {
  const today = todayStr();
  db.Challenges.all().forEach(c => {
    if (c.status === 'active' && today > c.endDate) {
      const s = db.challengeStats(c);
      db.Challenges.update(c.id, { status: s.progress >= 100 ? 'completed' : 'failed' });
    }
  });
}

export function render() {
  autoUpdateStatuses();
  const items = list();
  return `<div class="page">
    ${planTabs('challenges')}
    <div class="toolbar">
      <div></div>
      <button class="btn btn-primary" id="new-challenge-btn">${iconSvg('plus')}<span>New challenge</span></button>
    </div>
    <div class="chip-row">
      ${['active', 'completed', 'failed', 'all'].map(s => `<button class="chip ${filterState.status === s ? 'chip-active' : ''}" data-status="${s}">${s[0].toUpperCase() + s.slice(1)}</button>`).join('')}
    </div>
    ${items.length === 0 ? emptyState({ title: 'No challenges', body: 'Start a time-boxed challenge to build momentum fast.', actionLabel: 'New challenge', actionId: 'empty-new-challenge', icon: 'flag' }) :
      `<div class="list">${items.map(challengeRow).join('')}</div>`}
  </div>`;
}

function challengeRow(c) {
  const s = db.challengeStats(c);
  const today = todayStr();
  const inRange = today >= c.startDate && today <= c.endDate;
  const doneToday = db.ChallengeLogs.all().some(l => l.challengeId === c.id && l.date === today && l.completed);
  return `<div class="card-item">
    <div class="card-item-top">
      <span class="card-item-title">${escapeHtml(c.name)}</span>
      ${statusBadge(c.status)}
    </div>
    ${c.description ? `<p class="card-item-desc">${escapeHtml(c.description)}</p>` : ''}
    <div class="card-item-meta">
      <span class="meta-item">${c.targetType === 'daily' ? 'Daily target' : 'Weekly target'}: ${escapeHtml(c.targetDescription || '\u2014')}</span>
    </div>
    <div class="mini-progress">${progressBar(s.progress)}<em>${s.progress}%</em></div>
    <div class="card-item-meta">
      <span class="meta-item">Day ${s.dayNum}/${s.totalDays}</span>
      <span class="meta-item">${iconSvg('fire', 'inline-icon')}${s.streak}d streak</span>
      <span class="meta-item">${s.remaining} day${s.remaining === 1 ? '' : 's'} left</span>
    </div>
    <div class="habit-actions">
      ${c.status === 'active' && inRange ? `<button class="btn ${doneToday ? 'btn-secondary' : 'btn-primary'} btn-small" data-check-challenge="${c.id}">${doneToday ? 'Marked done today' : 'Mark today done'}</button>` : ''}
      <button class="btn btn-ghost btn-small" data-edit-challenge="${c.id}">Edit</button>
      <button class="btn btn-ghost btn-small" data-delete-challenge="${c.id}">Delete</button>
    </div>
  </div>`;
}

export function mount(rerender) {
  document.getElementById('new-challenge-btn')?.addEventListener('click', () => openChallengeForm(null, rerender));
  document.getElementById('empty-new-challenge')?.addEventListener('click', () => openChallengeForm(null, rerender));
  document.querySelectorAll('[data-status]').forEach(el => el.addEventListener('click', () => { filterState.status = el.dataset.status; rerender(); }));
  document.querySelectorAll('[data-check-challenge]').forEach(el => el.addEventListener('click', () => {
    const cid = el.dataset.checkChallenge;
    const today = todayStr();
    const existing = db.ChallengeLogs.all().find(l => l.challengeId === cid && l.date === today);
    if (existing) db.ChallengeLogs.remove(existing.id);
    else db.ChallengeLogs.add({ challengeId: cid, date: today, completed: true });
    rerender();
  }));
  document.querySelectorAll('[data-edit-challenge]').forEach(el => el.addEventListener('click', () => openChallengeForm(el.dataset.editChallenge, rerender)));
  document.querySelectorAll('[data-delete-challenge]').forEach(el => el.addEventListener('click', () => {
    confirmAction({
      title: 'Delete this challenge?', body: 'Its history will also be removed.',
      onConfirm: () => {
        db.ChallengeLogs.all().filter(l => l.challengeId === el.dataset.deleteChallenge).forEach(l => db.ChallengeLogs.remove(l.id));
        db.Challenges.remove(el.dataset.deleteChallenge);
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
      <div class="sheet-footer">${footer}</div>
    </div>
  </div>`;
}

function openChallengeForm(challengeId, rerender) {
  const c = challengeId ? db.Challenges.get(challengeId) : null;
  const body = `<form id="challenge-form">
    ${inputField({ label: 'Name', id: 'c-name', value: c?.name || '', placeholder: 'e.g. 30 days of writing', required: true })}
    ${textareaField({ label: 'Description', id: 'c-desc', value: c?.description || '' })}
    <div class="field-row">
      ${inputField({ label: 'Start date', id: 'c-start', type: 'date', value: c?.startDate || todayStr() })}
      ${inputField({ label: 'End date', id: 'c-end', type: 'date', value: c?.endDate || '' })}
    </div>
    <div class="field-row">
      ${selectField({ label: 'Target type', id: 'c-target-type', options: [{ value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }], value: c?.targetType || 'daily' })}
      ${inputField({ label: 'Target description', id: 'c-target-desc', value: c?.targetDescription || '', placeholder: 'e.g. Write 500 words' })}
    </div>
  </form>`;
  const footer = `${button({ label: 'Cancel', variant: 'ghost', id: 'c-cancel' })}${button({ label: c ? 'Save changes' : 'Create challenge', variant: 'primary', id: 'c-save' })}`;
  openSheet(sheet(c ? 'Edit challenge' : 'New challenge', body, footer));
  document.getElementById('c-cancel').addEventListener('click', closeModal);
  document.getElementById('c-save').addEventListener('click', () => {
    const name = document.getElementById('c-name').value.trim();
    const start = document.getElementById('c-start').value;
    const end = document.getElementById('c-end').value;
    if (!name) { toast('Give your challenge a name.'); return; }
    if (!start || !end || end < start) { toast('Pick a valid start and end date.'); return; }
    const payload = {
      name,
      description: document.getElementById('c-desc').value.trim(),
      startDate: start,
      endDate: end,
      targetType: document.getElementById('c-target-type').value,
      targetDescription: document.getElementById('c-target-desc').value.trim(),
    };
    if (c) db.Challenges.update(c.id, payload);
    else db.Challenges.add({ ...payload, status: 'active' });
    closeModal();
    toast(c ? 'Challenge updated' : 'Challenge created');
    rerender();
  });
}
