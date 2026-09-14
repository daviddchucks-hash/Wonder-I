import * as db from '../db.js';
import * as auth from '../auth.js';
import { ACHIEVEMENTS, isUnlocked } from '../achievements.js';
import { iconSvg, avatarInitials, sectionHeader, inputField, button, escapeHtml, toast } from '../components.js';
import { openSheet, closeModal, confirmAction } from '../modal.js';

export function render() {
  const u = auth.currentUser;
  const s = db.settings();
  const goalsCompleted = db.Goals.all().filter(g => g.status === 'completed').length;
  const tasksCompleted = db.Tasks.all().filter(t => t.status === 'completed').length;
  const challengesCompleted = db.Challenges.all().filter(c => c.status === 'completed').length;
  const bestStreak = Math.max(0, ...db.Habits.all().map(h => db.habitStats(h).bestStreak), db.overallStreak());
  const unlockedCount = ACHIEVEMENTS.filter(a => isUnlocked(a.id)).length;

  return `<div class="page">
    <div class="profile-head">
      <div class="avatar-lg">${avatarInitials(u.name)}</div>
      <div>
        <h1>${escapeHtml(u.name)}</h1>
        <p class="muted-note">${escapeHtml(u.email)}</p>
      </div>
      <button class="btn btn-ghost btn-small" id="edit-profile">Edit</button>
    </div>

    <div class="stat-grid">
      <div class="stat-box"><strong>${goalsCompleted}</strong><span>Goals completed</span></div>
      <div class="stat-box"><strong>${tasksCompleted}</strong><span>Tasks completed</span></div>
      <div class="stat-box"><strong>${challengesCompleted}</strong><span>Challenges completed</span></div>
      <div class="stat-box"><strong>${db.overallStreak()}</strong><span>Current streak</span></div>
      <div class="stat-box"><strong>${bestStreak}</strong><span>Best streak</span></div>
      <div class="stat-box"><strong>${unlockedCount}/${ACHIEVEMENTS.length}</strong><span>Achievements</span></div>
    </div>

    <a class="row-item" href="#/achievements"><span class="row-main">${iconSvg('trophy')}<span>View achievements</span></span>${iconSvg('chevronRight')}</a>
    <a class="row-item" href="#/review"><span class="row-main">${iconSvg('note')}<span>Weekly review</span></span>${iconSvg('chevronRight')}</a>

    ${sectionHeader('Notifications')}
    <label class="row-item"><span>Enable reminders</span><input type="checkbox" id="notif-master" ${s.notificationsEnabled ? 'checked' : ''}></label>
    <label class="row-item"><span>Task reminders</span><input type="checkbox" id="notif-tasks" ${s.reminders.tasks ? 'checked' : ''}></label>
    <label class="row-item"><span>Habit reminders</span><input type="checkbox" id="notif-habits" ${s.reminders.habits ? 'checked' : ''}></label>
    <label class="row-item"><span>Goal deadline reminders</span><input type="checkbox" id="notif-goals" ${s.reminders.goalDeadlines ? 'checked' : ''}></label>
    <label class="row-item"><span>Challenge check-in reminders</span><input type="checkbox" id="notif-challenges" ${s.reminders.challenges ? 'checked' : ''}></label>
    <label class="row-item"><span>Daily check-in reminder</span><input type="checkbox" id="notif-checkin" ${s.reminders.dailyCheckin ? 'checked' : ''}></label>

    ${sectionHeader('Appearance')}
    <label class="row-item"><span>Dark theme</span><input type="checkbox" id="theme-toggle" ${s.theme === 'dark' ? 'checked' : ''}></label>

    ${sectionHeader('Privacy')}
    <label class="row-item"><span>Share progress publicly</span><input type="checkbox" id="privacy-share" ${s.privacy.shareProgress ? 'checked' : ''}></label>

    ${sectionHeader('Account')}
    <button class="row-item" id="change-password"><span>Change password</span>${iconSvg('chevronRight')}</button>
    <button class="row-item danger" id="logout-btn"><span>${iconSvg('logout')}Log out</span></button>
  </div>`;
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

export function mount(rerender, onLogout) {
  document.getElementById('edit-profile').addEventListener('click', () => {
    const u = auth.currentUser;
    const body = `<form id="profile-form">${inputField({ label: 'Name', id: 'p-name', value: u.name, required: true })}${inputField({ label: 'Email', id: 'p-email', type: 'email', value: u.email, required: true })}</form>`;
    const footer = `${button({ label: 'Cancel', variant: 'ghost', id: 'p-cancel' })}${button({ label: 'Save', variant: 'primary', id: 'p-save' })}`;
    openSheet(sheet('Edit profile', body, footer));
    document.getElementById('p-cancel').addEventListener('click', closeModal);
    document.getElementById('p-save').addEventListener('click', () => {
      const name = document.getElementById('p-name').value.trim();
      const email = document.getElementById('p-email').value.trim();
      if (!name || !email) { toast('Name and email are required.'); return; }
      auth.updateProfile({ name, email });
      closeModal();
      rerender();
    });
  });

  const bind = (id, patchFn) => document.getElementById(id).addEventListener('change', e => { patchFn(e.target.checked); rerender(); });
  bind('notif-master', v => db.updateSettings({ notificationsEnabled: v }));
  bind('notif-tasks', v => db.updateSettings({ reminders: { ...db.settings().reminders, tasks: v } }));
  bind('notif-habits', v => db.updateSettings({ reminders: { ...db.settings().reminders, habits: v } }));
  bind('notif-goals', v => db.updateSettings({ reminders: { ...db.settings().reminders, goalDeadlines: v } }));
  bind('notif-challenges', v => db.updateSettings({ reminders: { ...db.settings().reminders, challenges: v } }));
  bind('notif-checkin', v => db.updateSettings({ reminders: { ...db.settings().reminders, dailyCheckin: v } }));
  bind('privacy-share', v => db.updateSettings({ privacy: { ...db.settings().privacy, shareProgress: v } }));
  document.getElementById('theme-toggle').addEventListener('change', e => {
    const theme = e.target.checked ? 'dark' : 'light';
    db.updateSettings({ theme });
    document.documentElement.setAttribute('data-theme', theme);
    rerender();
  });

  document.getElementById('change-password').addEventListener('click', () => {
    const body = `<form id="pw-form">
      ${inputField({ label: 'Current password', id: 'cur-pass', type: 'password' })}
      ${inputField({ label: 'New password', id: 'new-pass', type: 'password' })}
    </form>`;
    const footer = `${button({ label: 'Cancel', variant: 'ghost', id: 'pw-cancel' })}${button({ label: 'Update', variant: 'primary', id: 'pw-save' })}`;
    openSheet(sheet('Change password', body, footer));
    document.getElementById('pw-cancel').addEventListener('click', closeModal);
    document.getElementById('pw-save').addEventListener('click', () => {
      const cur = document.getElementById('cur-pass').value;
      const next = document.getElementById('new-pass').value;
      const res = auth.login({ email: auth.currentUser.email, password: cur });
      if (res.error) { toast('Current password is incorrect.'); return; }
      if (next.length < 6) { toast('New password must be at least 6 characters.'); return; }
      import('../utils.js').then(({ simpleHash }) => {
        auth.updateProfile({ passwordHash: simpleHash(next) });
        closeModal();
        toast('Password updated');
      });
    });
  });

  document.getElementById('logout-btn').addEventListener('click', () => {
    confirmAction({ title: 'Log out?', body: 'You can log back in anytime.', confirmLabel: 'Log out', tone: 'primary', onConfirm: onLogout });
  });
}
