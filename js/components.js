// components.js — small reusable markup builders shared across views.
import { escapeHtml, fmtDate, daysUntil } from './utils.js';
export { escapeHtml };

export function iconSvg(name, cls = '') {
  const paths = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
    plan: '<path d="M4 6h16"/><path d="M4 12h10"/><path d="M4 18h7"/><circle cx="19" cy="17" r="2.5"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/>',
    progress: '<path d="M4 20V10"/><path d="M11 20V4"/><path d="M18 20v-7"/>',
    profile: '<circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6"/>',
    plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
    check: '<path d="M4 12l5 5L20 6"/>',
    chevronRight: '<path d="M9 6l6 6-6 6"/>',
    chevronLeft: '<path d="M15 6l-6 6 6 6"/>',
    x: '<path d="M6 6l12 12"/><path d="M18 6L6 18"/>',
    edit: '<path d="M4 20h4L18 10l-4-4L4 16v4z"/><path d="M13 7l4 4"/>',
    trash: '<path d="M4 7h16"/><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/><path d="M9 7V4h6v3"/>',
    flag: '<path d="M6 3v18"/><path d="M6 4h11l-2 4 2 4H6"/>',
    fire: '<path d="M12 3c1 3-3 4-3 7a3 3 0 0 0 6 0c1 1 1 3 0 4.5A5 5 0 0 1 5 11c0-4 3-5 4-8 1 1 1 2 3 0z"/>',
    search: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
    filter: '<path d="M4 6h16"/><path d="M7 12h10"/><path d="M10 18h4"/>',
    bell: '<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    lock: '<rect x="5" y="10" width="14" height="10" rx="1.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    logout: '<path d="M9 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
    grip: '<circle cx="8" cy="6" r="1"/><circle cx="8" cy="12" r="1"/><circle cx="8" cy="18" r="1"/><circle cx="16" cy="6" r="1"/><circle cx="16" cy="12" r="1"/><circle cx="16" cy="18" r="1"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="0.5"/>',
    trophy: '<path d="M8 4h8v4a4 4 0 0 1-8 0V4z"/><path d="M8 4H5a3 3 0 0 0 3 4"/><path d="M16 4h3a3 3 0 0 1-3 4"/><path d="M10 14h4v3h-4z"/><path d="M8 20h8"/>',
    note: '<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M8 8h8"/><path d="M8 12h8"/><path d="M8 16h5"/>',
  };
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name] || ''}</svg>`;
}

export function button({ label, variant = 'primary', icon, id, cls = '', type = 'button', full = false }) {
  return `<button type="${type}" ${id ? `id="${id}"` : ''} class="btn btn-${variant} ${full ? 'btn-full' : ''} ${cls}">${icon ? iconSvg(icon) : ''}<span>${escapeHtml(label)}</span></button>`;
}

export function progressBar(percent, tone = 'default') {
  const p = Math.max(0, Math.min(100, percent));
  return `<div class="progress-track" role="progressbar" aria-valuenow="${p}" aria-valuemin="0" aria-valuemax="100">
    <div class="progress-fill progress-${tone}" style="width:${p}%"></div>
  </div>`;
}

export function badge(text, tone = 'neutral') {
  return `<span class="badge badge-${tone}">${escapeHtml(text)}</span>`;
}

export function statusBadge(status) {
  const map = {
    active: ['Active', 'accent'],
    paused: ['Paused', 'warn'],
    completed: ['Completed', 'success'],
    archived: ['Archived', 'neutral'],
    pending: ['Pending', 'neutral'],
    failed: ['Missed', 'danger'],
  };
  const [label, tone] = map[status] || [status, 'neutral'];
  return badge(label, tone);
}

export function emptyState({ title, body, actionLabel, actionId, icon = 'target' }) {
  return `<div class="empty-state">
    <div class="empty-icon">${iconSvg(icon)}</div>
    <h3>${escapeHtml(title)}</h3>
    <p>${escapeHtml(body)}</p>
    ${actionLabel ? `<button class="btn btn-primary" id="${actionId}">${iconSvg('plus')}<span>${escapeHtml(actionLabel)}</span></button>` : ''}
  </div>`;
}

export function sectionHeader(title, actionHtml = '') {
  return `<div class="section-header"><h2>${escapeHtml(title)}</h2>${actionHtml}</div>`;
}

export function deadlineNote(dateStr, status) {
  if (!dateStr) return '';
  const n = daysUntil(dateStr);
  if (status === 'completed') return `<span class="meta-item">${escapeHtml(fmtDate(dateStr))}</span>`;
  if (n < 0) return `<span class="meta-item text-danger">Overdue \u2022 ${escapeHtml(fmtDate(dateStr))}</span>`;
  if (n === 0) return `<span class="meta-item text-accent">Due today</span>`;
  if (n === 1) return `<span class="meta-item">Due tomorrow</span>`;
  return `<span class="meta-item">Due ${escapeHtml(fmtDate(dateStr))}</span>`;
}

export function priorityDot(p) {
  const cls = { high: 'dot-danger', medium: 'dot-warn', low: 'dot-neutral' }[p] || 'dot-neutral';
  return `<span class="pdot ${cls}" title="${escapeHtml(p || 'medium')} priority"></span>`;
}

export function categoryOptions(categories, selected) {
  return categories.map(c => `<option value="${escapeHtml(c.name)}" ${c.name === selected ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('');
}

export function modalShell(id, title, bodyHtml, footerHtml = '') {
  return `<div class="modal-overlay" id="${id}-overlay">
    <div class="sheet" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
      <div class="sheet-handle"></div>
      <div class="sheet-header">
        <h3>${escapeHtml(title)}</h3>
        <button class="icon-btn" data-close-modal>${iconSvg('x')}</button>
      </div>
      <div class="sheet-body">${bodyHtml}</div>
      ${footerHtml ? `<div class="sheet-footer">${footerHtml}</div>` : ''}
    </div>
  </div>`;
}

export function confirmDialog({ title, body, confirmLabel = 'Delete', tone = 'danger' }) {
  return `<div class="modal-overlay" id="confirm-overlay">
    <div class="confirm-box" role="alertdialog" aria-modal="true">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(body)}</p>
      <div class="confirm-actions">
        <button class="btn btn-ghost" data-close-modal>Cancel</button>
        <button class="btn btn-${tone}" id="confirm-yes">${escapeHtml(confirmLabel)}</button>
      </div>
    </div>
  </div>`;
}

export function inputField({ label, id, type = 'text', value = '', placeholder = '', required = false, min, step }) {
  return `<label class="field">
    <span class="field-label">${escapeHtml(label)}</span>
    <input class="field-input" id="${id}" type="${type}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" ${required ? 'required' : ''} ${min !== undefined ? `min="${min}"` : ''} ${step !== undefined ? `step="${step}"` : ''} />
  </label>`;
}

export function textareaField({ label, id, value = '', placeholder = '', rows = 3 }) {
  return `<label class="field">
    <span class="field-label">${escapeHtml(label)}</span>
    <textarea class="field-input" id="${id}" rows="${rows}" placeholder="${escapeHtml(placeholder)}">${escapeHtml(value)}</textarea>
  </label>`;
}

export function selectField({ label, id, options, value }) {
  return `<label class="field">
    <span class="field-label">${escapeHtml(label)}</span>
    <select class="field-input" id="${id}">${options.map(o => `<option value="${escapeHtml(o.value)}" ${o.value === value ? 'selected' : ''}>${escapeHtml(o.label)}</option>`).join('')}</select>
  </label>`;
}

export function toast(message) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  document.getElementById('toast-root').appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 250);
  }, 2600);
}

export function planTabs(active) {
  const tabs = [
    { key: 'goals', label: 'Goals' },
    { key: 'habits', label: 'Habits' },
    { key: 'tasks', label: 'Tasks' },
    { key: 'challenges', label: 'Challenges' },
  ];
  return `<div class="plan-tabs">
    ${tabs.map(t => `<a class="plan-tab ${t.key === active ? 'active' : ''}" href="#/plan/${t.key}">${t.label}</a>`).join('')}
  </div>`;
}

export function avatarInitials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map(p => p[0].toUpperCase()).join('');
}
