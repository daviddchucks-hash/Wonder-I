import * as auth from './auth.js';
import * as db from './db.js';
import { iconSvg, avatarInitials, toast } from './components.js';
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

let authedUser = null; // null until Firebase resolves the session; then a {uid,name,email} or null

const NAV_ITEMS = [
  { key: 'dashboard', route: '#/dashboard', label: 'Home', icon: 'home' },
  { key: 'plan', route: '#/plan/goals', label: 'Plan', icon: 'plan' },
  { key: 'quickadd', label: '', icon: 'plus', isAction: true },
  { key: 'calendar', route: '#/calendar', label: 'Calendar', icon: 'calendar' },
  { key: 'profile', route: '#/profile', label: 'Profile', icon: 'profile' },
];

function getAppRoot() {
  // Always look this up live — never cache it, since the shell re-creates this
  // element every time renderShell() runs.
  return document.getElementById('app-root');
}

function currentRoute() {
  return location.hash || '#/dashboard';
}
function routeSegments() {
  return currentRoute().replace(/^#\//, '').split('/').filter(Boolean);
}

export function go(route) {
  location.hash = route;
}

function renderLoading(message) {
  document.getElementById('app').innerHTML = `<div class="loading-screen">
    <span class="auth-wordmark">WonderI</span>
    <div class="loading-spinner"></div>
    <p>${message || 'Loading\u2026'}</p>
  </div>`;
}

function renderShell() {
  const authed = !!authedUser;
  document.getElementById('app').innerHTML = `
    ${authed ? topBarHtml() : ''}
    <main id="app-root" class="app-root ${authed ? '' : 'no-nav'}"></main>
    ${authed ? bottomNavHtml() : ''}
  `;
}

function topBarHtml() {
  const seg = routeSegments();
  const titleMap = {
    dashboard: 'WonderI', plan: 'Plan', calendar: 'Calendar', progress: 'Progress',
    profile: 'Profile', checkin: 'Daily Check-in', review: 'Weekly Review',
    achievements: 'Achievements', goal: 'Goal',
  };
  const title = titleMap[seg[0]] || 'WonderI';
  const isHome = seg[0] === 'dashboard';
  return `<header class="topbar">
    <div class="topbar-title ${isHome ? 'topbar-brand' : ''}">${title}</div>
    <button class="avatar-btn" id="topbar-avatar" aria-label="Profile">${avatarInitials(authedUser.name)}</button>
  </header>`;
}

function bottomNavHtml() {
  const active = routeSegments()[0] || 'dashboard';
  return `<nav class="bottom-nav">
    ${NAV_ITEMS.map(item => {
      if (item.isAction) return `<button class="nav-fab" id="nav-quickadd" aria-label="Quick add">${iconSvg('plus')}</button>`;
      const isActive = active === item.key;
      return `<a class="nav-item ${isActive ? 'active' : ''}" href="${item.route}">${iconSvg(item.icon)}<span>${item.label}</span></a>`;
    }).join('')}
  </nav>`;
}

function attachShellEvents() {
  if (!authedUser) return;
  document.getElementById('nav-quickadd')?.addEventListener('click', () => openQuickAdd(rerender));
  document.getElementById('topbar-avatar')?.addEventListener('click', () => go('#/profile'));
}

function mountAuthPage(seg) {
  const root = getAppRoot();
  const page = seg[0] || 'login';
  if (page === 'signup') {
    root.innerHTML = authViews.renderSignup();
    authViews.mountSignup(() => go('#/dashboard'));
  } else if (page === 'forgot') {
    root.innerHTML = authViews.renderForgot();
    authViews.mountForgot(() => go('#/login'));
  } else {
    root.innerHTML = authViews.renderLogin();
    authViews.mountLogin(() => go('#/dashboard'));
  }
}

function runAchievementCheck() {
  const newly = achievements.evaluate();
  newly.forEach(a => toast(`Achievement unlocked: ${a.title}`));
}

export function rerender() {
  runAchievementCheck();
  mountAuthedPage(routeSegments());
}

function mountAuthedPage(seg) {
  const root = getAppRoot();
  if (!root) return;
  const [page, sub, id] = seg;
  switch (page) {
    case 'plan': {
      const tab = sub || 'goals';
      const map = { goals, habits, tasks, challenges };
      const mod = map[tab] || goals;
      root.innerHTML = mod.render();
      mod.mount(rerender);
      break;
    }
    case 'goal':
      root.innerHTML = goals.renderDetail(id);
      goals.mountDetail(id, rerender);
      break;
    case 'calendar':
      root.innerHTML = calendarView.render();
      calendarView.mount(rerender);
      break;
    case 'progress':
      root.innerHTML = progressView.render();
      progressView.mount(rerender);
      break;
    case 'checkin':
      root.innerHTML = checkin.render();
      checkin.mount(rerender);
      break;
    case 'review':
      root.innerHTML = review.render();
      review.mount(rerender);
      break;
    case 'achievements':
      root.innerHTML = achievementsView.render();
      achievementsView.mount(rerender);
      break;
    case 'profile':
      root.innerHTML = profile.render();
      profile.mount(rerender, async () => {
        await auth.logout();
        go('#/login');
      });
      break;
    case 'dashboard':
    default:
      root.innerHTML = dashboard.render();
      dashboard.mount(rerender);
      break;
  }
}

function refreshShellChrome() {
  const navBar = document.querySelector('.bottom-nav');
  if (navBar) navBar.outerHTML = bottomNavHtml();
  const tb = document.querySelector('.topbar');
  if (tb) tb.outerHTML = topBarHtml();
  attachShellEvents();
}

function route() {
  if (!authedUser) {
    mountAuthPage(routeSegments());
    return;
  }
  runAchievementCheck();
  mountAuthedPage(routeSegments());
  refreshShellChrome();
  window.scrollTo?.(0, 0);
}

window.addEventListener('hashchange', () => { closeModal(); route(); });

renderLoading('Loading WonderI\u2026');
db.setSaveErrorHandler(() => toast('Could not save \u2014 check your connection.'));

auth.onAuthReady(async user => {
  closeModal();
  if (user) {
    authedUser = user;
    try {
      renderLoading('Getting your data\u2026');
      await db.loadData(user.uid);
    } catch (e) {
      console.error('WonderI: failed to load data', e);
      toast('Could not load your data. Check your connection and refresh.');
    }
  } else {
    authedUser = null;
    db.unloadData();
    if (!['login', 'signup', 'forgot'].includes(routeSegments()[0])) {
      location.hash = '#/login';
    }
  }
  renderShell();
  attachShellEvents();
  route();
});
