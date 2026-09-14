import * as db from '../db.js';
import { iconSvg, priorityDot, emptyState, planTabs, inputField, textareaField, selectField, button, escapeHtml, toast, deadlineNote } from '../components.js';
import { openSheet, closeModal, confirmAction } from '../modal.js';
import { todayStr, priorityLabel, priorityRank } from '../utils.js';

let filterState = { view: 'today', priority: 'all', goal: 'all', query: '' };

function categoryList() { return db.Categories.all(); }
function goalOptions() { return db.Goals.all().filter(g => g.status === 'active'); }

function topLevelTasks() {
  return db.Tasks.all().filter(t => !t.parentId);
}

function filteredTasks() {
  const today = todayStr();
  let list = topLevelTasks();
  if (filterState.view === 'today') list = list.filter(t => t.status !== 'completed' && t.dueDate && t.dueDate <= today);
  else if (filterState.view === 'upcoming') list = list.filter(t => t.status !== 'completed' && t.dueDate && t.dueDate > today);
  else if (filterState.view === 'completed') list = list.filter(t => t.status === 'completed');
  else if (filterState.view === 'nodate') list = list.filter(t => t.status !== 'completed' && !t.dueDate);
  if (filterState.priority !== 'all') list = list.filter(t => t.priority === filterState.priority);
  if (filterState.goal !== 'all') list = list.filter(t => t.goalId === filterState.goal);
  if (filterState.query) {
    const q = filterState.query.toLowerCase();
    list = list.filter(t => t.title.toLowerCase().includes(q));
  }
  return list.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));
}

export function render() {
  const list = filteredTasks();
  const goals = goalOptions();
  return `<div class="page">
    ${planTabs('tasks')}
    <div class="toolbar">
      <div class="search-box">${iconSvg('search')}<input id="task-search" placeholder="Search tasks" value="${escapeHtml(filterState.query)}"></div>
      <button class="btn btn-primary" id="new-task-btn">${iconSvg('plus')}<span>New task</span></button>
    </div>
    <div class="chip-row">
      ${[['today', 'Today'], ['upcoming', 'Upcoming'], ['nodate', 'No date'], ['completed', 'Completed']].map(([k, l]) => `<button class="chip ${filterState.view === k ? 'chip-active' : ''}" data-view="${k}">${l}</button>`).join('')}
    </div>
    <div class="chip-row">
      ${['all', 'high', 'medium', 'low'].map(p => `<button class="chip ${filterState.priority === p ? 'chip-active' : ''}" data-priority="${p}">${p === 'all' ? 'All priorities' : priorityLabel(p)}</button>`).join('')}
    </div>
    ${goals.length ? `<div class="chip-row">
      <button class="chip ${filterState.goal === 'all' ? 'chip-active' : ''}" data-goal="all">All goals</button>
      ${goals.map(g => `<button class="chip ${filterState.goal === g.id ? 'chip-active' : ''}" data-goal="${g.id}">${escapeHtml(g.title)}</button>`).join('')}
    </div>` : ''}
    ${list.length === 0 ? emptyState({ title: 'Nothing here', body: 'Add a task to keep track of what needs doing.', actionLabel: 'New task', actionId: 'empty-new-task', icon: 'check' }) :
      `<div class="list">${list.map(taskRow).join('')}</div>`}
  </div>`;
}

function taskRow(t) {
  const subs = db.taskSubtasks(t.id);
  const doneSubs = subs.filter(s => s.status === 'completed').length;
  const goal = t.goalId ? db.Goals.get(t.goalId) : null;
  return `<div class="card-item task-item" data-tid="${t.id}">
    <label class="card-item-top">
      <input type="checkbox" class="check-toggle" data-task-toggle="${t.id}" ${t.status === 'completed' ? 'checked' : ''}>
      <span class="card-item-title ${t.status === 'completed' ? 'strike' : ''}">${priorityDot(t.priority)}${escapeHtml(t.title)}</span>
    </label>
    <div class="card-item-meta">
      <span class="tag-mini">${escapeHtml(t.category || 'Other')}</span>
      ${goal ? `<span class="meta-item">${escapeHtml(goal.title)}</span>` : ''}
      ${t.recurring && t.recurring !== 'none' ? `<span class="meta-item">Repeats ${t.recurring}</span>` : ''}
      ${deadlineNote(t.dueDate, t.status)}
      ${subs.length ? `<span class="meta-item">${doneSubs}/${subs.length} subtasks</span>` : ''}
    </div>
    <div class="habit-actions">
      <button class="btn btn-ghost btn-small" data-add-sub="${t.id}">Add subtask</button>
      <button class="btn btn-ghost btn-small" data-edit-task="${t.id}">Edit</button>
      <button class="btn btn-ghost btn-small" data-delete-task="${t.id}">Delete</button>
    </div>
    ${subs.length ? `<div class="subtask-list">${subs.map(s => `
      <label class="row-item small">
        <input type="checkbox" class="check-toggle" data-task-toggle="${s.id}" ${s.status === 'completed' ? 'checked' : ''}>
        <span class="${s.status === 'completed' ? 'strike' : ''}">${escapeHtml(s.title)}</span>
        <button class="icon-btn small" data-delete-task="${s.id}">${iconSvg('trash')}</button>
      </label>`).join('')}</div>` : ''}
  </div>`;
}

export function mount(rerender) {
  document.getElementById('new-task-btn')?.addEventListener('click', () => openTaskForm(null, null, rerender));
  document.getElementById('empty-new-task')?.addEventListener('click', () => openTaskForm(null, null, rerender));
  document.getElementById('task-search')?.addEventListener('input', e => { filterState.query = e.target.value; rerender(); });
  document.querySelectorAll('[data-view]').forEach(el => el.addEventListener('click', () => { filterState.view = el.dataset.view; rerender(); }));
  document.querySelectorAll('[data-priority]').forEach(el => el.addEventListener('click', () => { filterState.priority = el.dataset.priority; rerender(); }));
  document.querySelectorAll('[data-goal]').forEach(el => el.addEventListener('click', () => { filterState.goal = el.dataset.goal; rerender(); }));
  document.querySelectorAll('[data-task-toggle]').forEach(el => el.addEventListener('change', () => {
    const t = db.Tasks.get(el.dataset.taskToggle);
    const completing = t.status !== 'completed';
    db.Tasks.update(t.id, { status: completing ? 'completed' : 'pending', completedAt: completing ? new Date().toISOString() : null });
    if (completing && t.recurring && t.recurring !== 'none') spawnNextRecurrence(t);
    rerender();
  }));
  document.querySelectorAll('[data-edit-task]').forEach(el => el.addEventListener('click', () => openTaskForm(el.dataset.editTask, null, rerender)));
  document.querySelectorAll('[data-add-sub]').forEach(el => el.addEventListener('click', () => openTaskForm(null, el.dataset.addSub, rerender)));
  document.querySelectorAll('[data-delete-task]').forEach(el => el.addEventListener('click', () => {
    confirmAction({
      title: 'Delete this task?', body: 'This cannot be undone.',
      onConfirm: () => {
        db.taskSubtasks(el.dataset.deleteTask).forEach(s => db.Tasks.remove(s.id));
        db.Tasks.remove(el.dataset.deleteTask);
        rerender();
      }
    });
  }));
}

function spawnNextRecurrence(t) {
  if (!t.dueDate) return;
  const d = new Date(t.dueDate);
  if (t.recurring === 'daily') d.setDate(d.getDate() + 1);
  else if (t.recurring === 'weekly') d.setDate(d.getDate() + 7);
  else return;
  db.Tasks.add({
    title: t.title, description: t.description, dueDate: d.toISOString().slice(0, 10),
    priority: t.priority, goalId: t.goalId, category: t.category, recurring: t.recurring,
    parentId: null, status: 'pending'
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

export function openTaskForm(taskId, parentId, rerender) {
  const t = taskId ? db.Tasks.get(taskId) : null;
  const isSubtask = !!parentId || !!t?.parentId;
  const cats = categoryList();
  const goals = db.Goals.all().filter(g => g.status !== 'archived');
  const body = `<form id="task-form">
    ${inputField({ label: isSubtask ? 'Subtask title' : 'Title', id: 't-title', value: t?.title || '', placeholder: 'e.g. Send invoice', required: true })}
    ${!isSubtask ? textareaField({ label: 'Description', id: 't-desc', value: t?.description || '', placeholder: 'Optional details' }) : ''}
    ${!isSubtask ? `<div class="field-row">
      ${inputField({ label: 'Due date', id: 't-due', type: 'date', value: t?.dueDate || '' })}
      ${selectField({ label: 'Priority', id: 't-priority', options: ['high', 'medium', 'low'].map(p => ({ value: p, label: priorityLabel(p) })), value: t?.priority || 'medium' })}
    </div>
    <div class="field-row">
      ${selectField({ label: 'Category', id: 't-category', options: cats.map(c => ({ value: c.name, label: c.name })), value: t?.category || cats[0].name })}
      ${selectField({ label: 'Goal (optional)', id: 't-goal', options: [{ value: '', label: 'None' }, ...goals.map(g => ({ value: g.id, label: g.title }))], value: t?.goalId || '' })}
    </div>
    ${selectField({ label: 'Repeats', id: 't-recurring', options: [{ value: 'none', label: 'Does not repeat' }, { value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }], value: t?.recurring || 'none' })}` : ''}
  </form>`;
  const footer = `${button({ label: 'Cancel', variant: 'ghost', id: 't-cancel' })}${button({ label: t ? 'Save changes' : 'Create', variant: 'primary', id: 't-save' })}`;
  openSheet(sheet(t ? 'Edit task' : (isSubtask ? 'New subtask' : 'New task'), body, footer));
  document.getElementById('t-cancel').addEventListener('click', closeModal);
  document.getElementById('t-save').addEventListener('click', () => {
    const title = document.getElementById('t-title').value.trim();
    if (!title) { toast('Give the task a title.'); return; }
    if (isSubtask) {
      if (t) db.Tasks.update(t.id, { title });
      else db.Tasks.add({ title, parentId, status: 'pending', priority: 'medium' });
    } else {
      const payload = {
        title,
        description: document.getElementById('t-desc').value.trim(),
        dueDate: document.getElementById('t-due').value || null,
        priority: document.getElementById('t-priority').value,
        category: document.getElementById('t-category').value,
        goalId: document.getElementById('t-goal').value || null,
        recurring: document.getElementById('t-recurring').value,
      };
      if (t) db.Tasks.update(t.id, payload);
      else db.Tasks.add({ ...payload, status: 'pending', parentId: null });
    }
    closeModal();
    toast(t ? 'Task updated' : 'Task created');
    rerender();
  });
}
