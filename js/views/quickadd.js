import { iconSvg, escapeHtml } from '../components.js';
import { openSheet, closeModal } from '../modal.js';
import * as db from '../db.js';

export function openQuickAdd(rerender) {
  const goals = db.Goals.all().filter(g => g.status === 'active');
  const options = [
    { key: 'goal', label: 'Goal', icon: 'target' },
    { key: 'milestone', label: 'Milestone', icon: 'flag', disabled: goals.length === 0 },
    { key: 'habit', label: 'Habit', icon: 'flag' },
    { key: 'task', label: 'Task', icon: 'check' },
    { key: 'challenge', label: 'Challenge', icon: 'flag' },
  ];
  const html = `<div class="modal-overlay" id="qa-overlay">
    <div class="sheet">
      <div class="sheet-handle"></div>
      <div class="sheet-header"><h3>Quick add</h3><button class="icon-btn" data-close-modal>${iconSvg('x')}</button></div>
      <div class="sheet-body">
        <div class="quickadd-grid">
          ${options.map(o => `<button class="quickadd-btn" data-qa="${o.key}" ${o.disabled ? 'disabled' : ''}>${iconSvg(o.icon)}<span>${o.label}</span></button>`).join('')}
        </div>
        ${goals.length === 0 ? `<p class="muted-note">Create a goal first to add milestones to it.</p>` : ''}
      </div>
    </div>
  </div>`;
  openSheet(html);
  document.querySelectorAll('[data-qa]').forEach(btn => btn.addEventListener('click', async () => {
    const kind = btn.dataset.qa;
    closeModal();
    if (kind === 'goal') (await import('./goals.js')).openGoalForm(null, rerender);
    else if (kind === 'milestone') {
      openMilestonePicker(goals, rerender);
    }
    else if (kind === 'habit') (await import('./habits.js')).openHabitForm(null, rerender);
    else if (kind === 'task') (await import('./tasks.js')).openTaskForm(null, null, rerender);
    else if (kind === 'challenge') {
      location.hash = '#/plan/challenges';
      setTimeout(() => document.getElementById('new-challenge-btn')?.click(), 50);
    }
  }));
}

function openMilestonePicker(goals, rerender) {
  if (goals.length === 0) return;
  const html = `<div class="modal-overlay" id="pick-overlay">
    <div class="sheet">
      <div class="sheet-handle"></div>
      <div class="sheet-header"><h3>Add milestone to which goal?</h3><button class="icon-btn" data-close-modal>${iconSvg('x')}</button></div>
      <div class="sheet-body">
        <div class="list">${goals.map(g => `<button class="row-item" data-pick-goal="${g.id}"><span>${escapeHtml(g.title)}</span>${iconSvg('chevronRight')}</button>`).join('')}</div>
      </div>
    </div>
  </div>`;
  openSheet(html);
  document.querySelectorAll('[data-pick-goal]').forEach(btn => btn.addEventListener('click', () => {
    const goalId = btn.dataset.pickGoal;
    closeModal();
    location.hash = `#/goal/${goalId}`;
    setTimeout(() => document.getElementById('add-milestone')?.click(), 80);
  }));
}
