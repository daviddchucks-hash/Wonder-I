import * as auth from './auth.js';
import * as db from './db.js';
import { iconSvg, avatarInitials } from './components.js';
import { closeModal } from './modal.js';
import * as authViews from './views/authViews.js';
import * as dashboard from './views/dashboard.js';
import * as goals from './views/goals.js';
import * as habits from './views/habits.js';
import * as tasks from './views/tasks.js';
import * as challenges from './views/challenges.js';
import * as achievementsView from './views/achievementsView.js';
import * as calendarView from './views/calendar.js';
import * as progressView from './views/progress.js';
import * as checkin from './views/checkin.js';
import * as review from './views/review.js';
import * as profile from './views/profile.js';
import { openQuickAdd } from './views/quickadd.js';
import * as achievements from './achievements.js';

const appRoot = document.getElementById('app-root');

const NAV_ITEMS = [
  { key: 'dashboard', route: '#/dashboard', label: 'Home', icon: 'home' },
  { key: 'plan', route: '#/plan/goals', label: 'Plan', icon: 'plan' },
  { key: 'quickadd', label: '', icon: 'plus', isAction: true },
  { key: 'calendar', route: '#/calendar', label: 'Calendar', icon: 'calendar' },
  { key: 'profile', route: '#/profile', label: 'Profile', icon: 'profile' },
];

function currentRoute() {
  return location.hash || '#/dashboard';
}

function routeSegments() {
  return currentRoute().replace(/^#\//, '').split('/').filter(Boolean);
}

export function go(route) {
  location.hash = route;
}

function isAuthed() {
  return !!auth.currentUser;
}

function renderShell() {
  const authed = isAuthed();
  document.getElementById('app').innerHTML = `
    ${authed ? topBarHtml() : ''}
    <main id="app-root" class="app-root ${authed ? '' : 'no-nav'}"></main>
    ${authed ? bottomNavHtml() : ''}
  `;
}

function topBarHtml() {
  const seg = routeSegments();
  const titleMap = {
    dashboard: 'WonderI',
    plan: 'Plan',
    calendar: 'Calendar',
    progress: 'Progress',
    profile: 'Profile',
    checkin: 'Daily Check-in',
    review: 'Weekly Review',
    achievements: 'Achievements',
    goal: 'Goal',
  };
  const title = titleMap[seg[0]] || 'WonderI';
  const isHome = seg[0] === 'dashboard';
  return `<header class="topbar">
    <div class="topbar-title ${isHome ? 'topbar-brand' : ''}">${title}</div>
    <button class="avatar-btn" id="topbar-avatar" aria-label="Profile">${avatarInitials(auth.currentUser.name)}</button>
  </header>`;
}

function bottomNavHtml() {
  const active = routeSegments()[0] || 'dashboard';
  return `<nav class="bottom-nav">
    ${NAV_ITEMS.map(item => {
      if (item.isAction) {
        return `<button class="nav-fab" id="nav-quickadd" aria-label="Quick add">${iconSvg('plus')}</button>`;
      }
      const isActive = active === item.key;
      return `<a class="nav-item ${isActive ? 'active' : ''}" href="${item.route}">
        ${iconSvg(item.icon)}<span>${item.label}</span>
      </a>`;
    }).join('')}
  </nav>`;
}

function attachShellEvents() {
  if (!isAuthed()) return;
  const fab = document.getElementById('nav-quickadd');
  if (fab) fab.addEventListener('click', () => openQuickAdd(rerender));
  const avatarBtn = document.getElementById('topbar-avatar');
  if (avatarBtn) avatarBtn.addEventListener('click', () => go('#/profile'));
}

function mountAuthPage(seg) {
  const page = seg[0] || 'login';
  if (page === 'signup') {
    appRoot.innerHTML = authViews.renderSignup();
    authViews.mountSignup(() => { runAchievementCheck(); go('#/dashboard'); rerenderFull(); });
  } else if (page === 'forgot') {
    appRoot.innerHTML = authViews.renderForgot();
    authViews.mountForgot(() => go('#/login'));
  } else {
    appRoot.innerHTML = authViews.renderLogin();
    authViews.mountLogin(() => { go('#/dashboard'); rerenderFull(); });
  }
}

function runAchievementCheck() {
  const newly = achievements.evaluate();
  newly.forEach(a => {
    import('./components.js').then(({ toast }) => toast(`Achievement unlocked: ${a.title}`));
  });
}

export function rerender() {
  runAchievementCheck();
  const seg = routeSegments();
  mountAuthedPage(seg);
}

function mountAuthedPage(seg) {
  const [page, sub, id] = seg;
  switch (page) {
    case 'plan': {
      const tab = sub || 'goals';
      const map = { goals, habits, tasks, challenges };
      const mod = map[tab] || goals;
      appRoot.innerHTML = mod.render();
      mod.mount(rerender);
      break;
    }
    case 'goal':
      appRoot.innerHTML = goals.renderDetail(id);
      goals.mountDetail(id, rerender);
      break;
    case 'calendar':
      appRoot.innerHTML = calendarView.render();
      calendarView.mount(rerender);
      break;
    case 'progress':
      appRoot.innerHTML = progressView.render();
      progressView.mount(rerender);
      break;
    case 'checkin':
      appRoot.innerHTML = checkin.render();
      checkin.mount(rerender);
      break;
    case 'review':
      appRoot.innerHTML = review.render();
      review.mount(rerender);
      break;
    case 'achievements':
      appRoot.innerHTML = achievementsView.render();
      achievementsView.mount(rerender);
      break;
    case 'profile':
      appRoot.innerHTML = profile.render();
      profile.mount(rerender, () => { auth.logout(); go('#/login'); rerenderFull(); });
      break;
    case 'dashboard':
    default:
      appRoot.innerHTML = dashboard.render();
      dashboard.mount(rerender);
      break;
  }
}

function rerenderFull() {
  closeModal();
  renderShell();
  route();
}

function route() {
  if (!isAuthed()) {
    if (!auth.restoreSession()) {
      mountAuthPage(routeSegments());
      return;
    }
    rerenderFull();
    return;
  }
  const seg = routeSegments();
  runAchievementCheck();
  mountAuthedPage(seg);
  // reattach nav state (active tab) since hash changed
  const navBar = document.querySelector('.bottom-nav');
  if (navBar) navBar.outerHTML = bottomNavHtml();
  attachShellEvents();
  const tb = document.querySelector('.topbar');
  if (tb) tb.outerHTML = topBarHtml();
  document.getElementById('topbar-avatar')?.addEventListener('click', () => go('#/profile'));
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
window.addEventListener('DOMContentLoaded', () => {
  auth.restoreSession();
  if (isAuthed()) document.documentElement.setAttribute('data-theme', db.settings().theme || 'light');
  renderShell();
  attachShellEvents();
  route();
});

// expose for view modules that need to trigger a full nav refresh (e.g. after logout/login)
export { rerenderFull, runAchievementCheck };
