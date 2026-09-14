import * as db from '../db.js';
import { iconSvg, progressBar, statusBadge, emptyState, sectionHeader, planTabs, inputField, textareaField, selectField, button, escapeHtml, categoryOptions, toast } from '../components.js';
import { openSheet, closeModal, confirmAction } from '../modal.js';
import { fmtDate, priorityLabel, priorityRank, todayStr, uid } from '../utils.js';
import { go } from '../app.js';

let filterState = { status: 'active', category: 'all', query: '' };

function categoryList() { return db.Categories.all(); }

function filteredGoals() {
  let list = db.Goals.all();
  if (filterState.status !== 'all') list = list.filter(g => g.status === filterState.status);
  if (filterState.category !== 'all') list = list.filter(g => g.category === filterState.category);
  if (filterState.query) {
    const q = filterState.query.toLowerCase();
    list = list.filter(g => g.title.toLowerCase().includes(q) || (g.description || '').toLowerCase().includes(q));
  }
  return list.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || (a.deadline || '9999').localeCompare(b.deadline || '9999'));
}

export function render() {
  const list = filteredGoals();
  const cats = categoryList();
  return `<div class="page">
    ${planTabs('goals')}
    <div class="toolbar">
      <div class="search-box">${iconSvg('search')}<input id="goal-search" placeholder="Search goals" value="${escapeHtml(filterState.query)}"></div>
      <button class="btn btn-primary" id="new-goal-btn">${iconSvg('plus')}<span>New goal</span></button>
    </div>
    <div class="chip-row">
      ${['active', 'paused', 'completed', 'archived', 'all'].map(s => `<button class="chip ${filterState.status === s ? 'chip-active' : ''}" data-status="${s}">${s[0].toUpperCase() + s.slice(1)}</button>`).join('')}
    </div>
    <div class="chip-row">
      <button class="chip ${filterState.category === 'all' ? 'chip-active' : ''}" data-cat="all">All categories</button>
      ${cats.map(c => `<button class="chip ${filterState.category === c.name ? 'chip-active' : ''}" data-cat="${escapeHtml(c.name)}">${escapeHtml(c.name)}</button>`).join('')}
    </div>
    ${list.length === 0 ? emptyState({ title: 'No goals here', body: 'Create a goal to start tracking progress toward something that matters.', actionLabel: 'New goal', actionId: 'empty-new-goal', icon: 'target' }) :
      `<div class="list">${list.map(goalRow).join('')}</div>`}
  </div>`;
}

function goalRow(g) {
  const p = db.goalProgress(g);
  const ms = db.goalMilestones(g.id);
  return `<a class="card-item" href="#/goal/${g.id}">
    <div class="card-item-top">
      <span class="card-item-title">${escapeHtml(g.title)}</span>
      ${statusBadge(g.status)}
    </div>
    <div class="card-item-meta">
      <span class="tag-mini">${escapeHtml(g.category || 'Other')}</span>
      ${g.deadline ? `<span class="meta-item">${fmtDate(g.deadline)}</span>` : ''}
      ${ms.length ? `<span class="meta-item">${ms.filter(m => m.done).length}/${ms.length} milestones</span>` : ''}
    </div>
    <div class="mini-progress">${progressBar(p)}<em>${p}%</em></div>
  </a>`;
}

export function mount(rerender) {
  document.getElementById('new-goal-btn')?.addEventListener('click', () => openGoalForm(null, rerender));
  document.getElementById('empty-new-goal')?.addEventListener('click', () => openGoalForm(null, rerender));
  document.getElementById('goal-search')?.addEventListener('input', e => { filterState.query = e.target.value; rerender(); });
  document.querySelectorAll('[data-status]').forEach(el => el.addEventListener('click', () => { filterState.status = el.dataset.status; rerender(); }));
  document.querySelectorAll('[data-cat]').forEach(el => el.addEventListener('click', () => { filterState.category = el.dataset.cat; rerender(); }));
}

// ---------- create/edit form ----------
export function openGoalForm(goalId, rerender) {
  const g = goalId ? db.Goals.get(goalId) : null;
  const cats = categoryList();
  const body = `<form id="goal-form">
    ${inputField({ label: 'Title', id: 'g-title', value: g?.title || '', placeholder: 'e.g. Save \u20a6500,000', required: true })}
    ${textareaField({ label: 'Description', id: 'g-desc', value: g?.description || '', placeholder: 'What does success look like?' })}
    <div class="field-row">
      ${selectField({ label: 'Category', id: 'g-category', options: cats.map(c => ({ value: c.name, label: c.name })), value: g?.category || cats[0].name })}
      ${selectField({ label: 'Priority', id: 'g-priority', options: ['high', 'medium', 'low'].map(p => ({ value: p, label: priorityLabel(p) })), value: g?.priority || 'medium' })}
    </div>
    ${inputField({ label: 'Deadline', id: 'g-deadline', type: 'date', value: g?.deadline || '' })}
    <div class="field-row">
      ${inputField({ label: 'Target value (optional)', id: 'g-target', type: 'number', value: g?.targetValue ?? '', min: 0 })}
      ${inputField({ label: 'Current value', id: 'g-current', type: 'number', value: g?.currentValue ?? 0, min: 0 })}
    </div>
    <p class="form-hint">Add a target and current value for goals you can measure, like savings or word count. Leave blank for goals tracked purely by milestones.</p>
  </form>`;
  const footer = `${button({ label: 'Cancel', variant: 'ghost', id: 'goal-cancel' })}${button({ label: g ? 'Save changes' : 'Create goal', variant: 'primary', id: 'goal-save' })}`;
  openSheet(sheet(g ? 'Edit goal' : 'New goal', body, footer));
  document.getElementById('goal-cancel').addEventListener('click', closeModal);
  document.getElementById('goal-save').addEventListener('click', () => {
    const title = document.getElementById('g-title').value.trim();
    if (!title) { toast('Give your goal a title.'); return; }
    const payload = {
      title,
      description: document.getElementById('g-desc').value.trim(),
      category: document.getElementById('g-category').value,
      priority: document.getElementById('g-priority').value,
      deadline: document.getElementById('g-deadline').value || null,
      targetValue: document.getElementById('g-target').value === '' ? null : Number(document.getElementById('g-target').value),
      currentValue: Number(document.getElementById('g-current').value) || 0,
    };
    if (g) db.Goals.update(g.id, payload);
    else db.Goals.add({ ...payload, status: 'active' });
    closeModal();
    toast(g ? 'Goal updated' : 'Goal created');
    rerender();
  });
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

// ---------- detail page ----------
export function renderDetail(goalId) {
  const g = db.Goals.get(goalId);
  if (!g) return `<div class="page">${emptyState({ title: 'Goal not found', body: 'It may have been deleted.', icon: 'target' })}</div>`;
  const p = db.goalProgress(g);
  const ms = db.goalMilestones(g.id);
  return `<div class="page">
    <a class="back-link" href="#/plan/goals">${iconSvg('chevronLeft')}<span>Goals</span></a>
    <div class="detail-head">
      <h1>${escapeHtml(g.title)}</h1>
      ${statusBadge(g.status)}
    </div>
    ${g.description ? `<p class="detail-desc">${escapeHtml(g.description)}</p>` : ''}
    <div class="detail-meta-row">
      <span class="tag-mini">${escapeHtml(g.category || 'Other')}</span>
      <span class="tag-mini">${priorityLabel(g.priority)} priority</span>
      ${g.deadline ? `<span class="meta-item">Due ${fmtDate(g.deadline)}</span>` : ''}
    </div>
    <div class="progress-block">
      ${progressBar(p)}
      <div class="progress-block-row"><strong>${p}%</strong> complete</div>
      ${g.targetValue ? `<div class="muted-note">${escapeHtml(String(g.currentValue || 0))} of ${escapeHtml(String(g.targetValue))}</div>` : ''}
    </div>
    ${g.targetValue ? `<div class="value-update-row">
      ${inputField({ label: 'Update current value', id: 'update-current', type: 'number', value: g.currentValue ?? 0, min: 0 })}
      <button class="btn btn-secondary" id="save-current">Update</button>
    </div>` : ''}

    ${sectionHeader('Milestones', `<button class="btn btn-ghost btn-small" id="add-milestone">${iconSvg('plus')}<span>Add</span></button>`)}
    ${ms.length === 0 ? `<p class="muted-note">Break this goal into smaller steps.</p>` :
      `<div class="list" id="milestone-list">${ms.map((m, i) => milestoneRow(m, i, ms.length)).join('')}</div>`}

    <div class="detail-actions">
      ${g.status === 'active' ? button({ label: 'Pause', variant: 'secondary', id: 'act-pause' }) : ''}
      ${g.status === 'paused' ? button({ label: 'Resume', variant: 'secondary', id: 'act-resume' }) : ''}
      ${g.status !== 'completed' && g.status !== 'archived' ? button({ label: 'Mark complete', variant: 'primary', id: 'act-complete' }) : ''}
      ${g.status !== 'archived' ? button({ label: 'Archive', variant: 'ghost', id: 'act-archive' }) : ''}
      ${button({ label: 'Edit', variant: 'ghost', id: 'act-edit', icon: 'edit' })}
      ${button({ label: 'Delete', variant: 'danger', id: 'act-delete', icon: 'trash' })}
    </div>
  </div>`;
}

function milestoneRow(m, i, total) {
  return `<div class="row-item milestone-row" data-mid="${m.id}">
    <input type="checkbox" class="check-toggle" data-milestone-toggle="${m.id}" ${m.done ? 'checked' : ''}>
    <span class="row-main ${m.done ? 'strike' : ''}">${escapeHtml(m.title)}</span>
    <span class="reorder-btns">
      <button class="icon-btn small" data-move-up="${m.id}" ${i === 0 ? 'disabled' : ''}>\u2191</button>
      <button class="icon-btn small" data-move-down="${m.id}" ${i === total - 1 ? 'disabled' : ''}>\u2193</button>
      <button class="icon-btn small" data-del-milestone="${m.id}">${iconSvg('trash')}</button>
    </span>
  </div>`;
}

export function mountDetail(goalId, rerender) {
  const g = db.Goals.get(goalId);
  if (!g) return;
  document.getElementById('save-current')?.addEventListener('click', () => {
    const val = Number(document.getElementById('update-current').value) || 0;
    db.Goals.update(g.id, { currentValue: val });
    rerender();
  });
  document.getElementById('add-milestone')?.addEventListener('click', () => openMilestoneForm(g.id, null, rerender));
  document.querySelectorAll('[data-milestone-toggle]').forEach(el => el.addEventListener('change', () => {
    const m = db.Milestones.get(el.dataset.milestoneToggle);
    db.Milestones.update(m.id, { done: !m.done, completedAt: !m.done ? new Date().toISOString() : null });
    rerender();
  }));
  document.querySelectorAll('[data-del-milestone]').forEach(el => el.addEventListener('click', () => {
    confirmAction({ title: 'Delete milestone?', body: 'This cannot be undone.', onConfirm: () => { db.Milestones.remove(el.dataset.delMilestone); rerender(); } });
  }));
  document.querySelectorAll('[data-move-up]').forEach(el => el.addEventListener('click', () => reorder(g.id, el.dataset.moveUp, -1, rerender)));
  document.querySelectorAll('[data-move-down]').forEach(el => el.addEventListener('click', () => reorder(g.id, el.dataset.moveDown, 1, rerender)));

  document.getElementById('act-pause')?.addEventListener('click', () => { db.Goals.update(g.id, { status: 'paused' }); rerender(); });
  document.getElementById('act-resume')?.addEventListener('click', () => { db.Goals.update(g.id, { status: 'active' }); rerender(); });
  document.getElementById('act-complete')?.addEventListener('click', () => { db.Goals.update(g.id, { status: 'completed', completedAt: new Date().toISOString() }); toast('Goal completed \u2014 nice work.'); rerender(); });
  document.getElementById('act-archive')?.addEventListener('click', () => { db.Goals.update(g.id, { status: 'archived' }); rerender(); });
  document.getElementById('act-edit')?.addEventListener('click', () => openGoalForm(g.id, rerender));
  document.getElementById('act-delete')?.addEventListener('click', () => {
    confirmAction({
      title: 'Delete this goal?', body: 'Its milestones will also be deleted. This cannot be undone.',
      onConfirm: () => {
        db.Milestones.all().filter(m => m.goalId === g.id).forEach(m => db.Milestones.remove(m.id));
        db.Goals.remove(g.id);
        go('#/plan/goals');
      }
    });
  });
}

function reorder(goalId, milestoneId, dir, rerender) {
  const ms = db.goalMilestones(goalId);
  const idx = ms.findIndex(m => m.id === milestoneId);
  const swapIdx = idx + dir;
  if (swapIdx < 0 || swapIdx >= ms.length) return;
  const a = ms[idx], b = ms[swapIdx];
  const orderA = a.order ?? idx, orderB = b.order ?? swapIdx;
  db.Milestones.update(a.id, { order: orderB });
  db.Milestones.update(b.id, { order: orderA });
  rerender();
}

function openMilestoneForm(goalId, milestoneId, rerender) {
  const m = milestoneId ? db.Milestones.get(milestoneId) : null;
  const body = `<form id="milestone-form">${inputField({ label: 'Milestone title', id: 'm-title', value: m?.title || '', placeholder: 'e.g. Learn variables', required: true })}</form>`;
  const footer = `${button({ label: 'Cancel', variant: 'ghost', id: 'm-cancel' })}${button({ label: m ? 'Save' : 'Add milestone', variant: 'primary', id: 'm-save' })}`;
  openSheet(sheet(m ? 'Edit milestone' : 'New milestone', body, footer));
  document.getElementById('m-cancel').addEventListener('click', closeModal);
  document.getElementById('m-save').addEventListener('click', () => {
    const title = document.getElementById('m-title').value.trim();
    if (!title) { toast('Give the milestone a title.'); return; }
    if (m) db.Milestones.update(m.id, { title });
    else db.Milestones.add({ goalId, title, done: false, order: db.goalMilestones(goalId).length });
    closeModal();
    rerender();
  });
}
