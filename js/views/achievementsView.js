import { ACHIEVEMENTS, isUnlocked, unlockedAt } from '../achievements.js';
import { iconSvg, escapeHtml } from '../components.js';
import { fmtDate } from '../utils.js';

export function render() {
  const unlockedCount = ACHIEVEMENTS.filter(a => isUnlocked(a.id)).length;
  return `<div class="page">
    <a class="back-link" href="#/profile">${iconSvg('chevronLeft')}<span>Profile</span></a>
    <h1 class="page-title">Achievements</h1>
    <p class="muted-note">${unlockedCount} of ${ACHIEVEMENTS.length} unlocked</p>
    <div class="achievement-grid">
      ${ACHIEVEMENTS.map(a => {
        const done = isUnlocked(a.id);
        return `<div class="achievement-card ${done ? 'unlocked' : 'locked'}">
          <div class="achievement-mark">${done ? iconSvg('trophy') : iconSvg('lock')}</div>
          <div class="achievement-title">${escapeHtml(a.title)}</div>
          <div class="achievement-desc">${escapeHtml(a.desc)}</div>
          ${done ? `<div class="achievement-date">${fmtDate(unlockedAt(a.id).slice(0, 10))}</div>` : ''}
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

export function mount() {}
