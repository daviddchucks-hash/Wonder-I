// modal.js — bottom-sheet & confirm dialog plumbing used across views.
import { confirmDialog } from './components.js';

const root = () => document.getElementById('modal-root');

export function openSheet(html, onMount) {
  closeModal();
  root().insertAdjacentHTML('beforeend', html);
  document.body.classList.add('modal-open');
  const overlay = root().querySelector('.modal-overlay');
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  overlay.querySelectorAll('[data-close-modal]').forEach(b => b.addEventListener('click', closeModal));
  requestAnimationFrame(() => overlay.classList.add('open'));
  if (onMount) onMount(overlay);
}

export function closeModal() {
  root().innerHTML = '';
  document.body.classList.remove('modal-open');
}

export function confirmAction({ title, body, confirmLabel, tone = 'danger', onConfirm }) {
  openSheet(confirmDialog({ title, body, confirmLabel, tone }));
  document.getElementById('confirm-yes').addEventListener('click', () => {
    closeModal();
    onConfirm();
  });
}
