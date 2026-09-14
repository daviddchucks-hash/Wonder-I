// auth.js — account management. There is no server in this build, so "forgot password"
// is handled via a security question set at signup rather than an email link.
import { uid, simpleHash } from './utils.js';
import * as db from './db.js';

export let currentUser = null;

export function restoreSession() {
  const session = db.getSession();
  if (!session) return false;
  const user = db.getUsers().find(u => u.id === session.userId);
  if (!user) { db.clearSession(); return false; }
  currentUser = user;
  db.loadData(user.id);
  return true;
}

export function signup({ name, email, password, securityQuestion, securityAnswer }) {
  email = email.trim().toLowerCase();
  if (!name || !email || !password) return { error: 'Please fill in your name, email and password.' };
  if (password.length < 6) return { error: 'Password must be at least 6 characters.' };
  if (db.findUserByEmail(email)) return { error: 'An account with this email already exists.' };
  const user = {
    id: uid(),
    name: name.trim(),
    email,
    passwordHash: simpleHash(password),
    securityQuestion: securityQuestion || 'What city were you born in?',
    securityAnswerHash: simpleHash((securityAnswer || '').trim().toLowerCase()),
    createdAt: new Date().toISOString(),
    theme: 'light'
  };
  db.createUser(user);
  currentUser = user;
  db.loadData(user.id);
  db.setSession(user.id);
  return { user };
}

export function login({ email, password }) {
  email = (email || '').trim().toLowerCase();
  const user = db.findUserByEmail(email);
  if (!user || user.passwordHash !== simpleHash(password)) {
    return { error: 'Incorrect email or password.' };
  }
  currentUser = user;
  db.loadData(user.id);
  db.setSession(user.id);
  return { user };
}

export function logout() {
  currentUser = null;
  db.clearSession();
}

export function getSecurityQuestion(email) {
  const user = db.findUserByEmail((email || '').trim().toLowerCase());
  return user ? user.securityQuestion : null;
}

export function resetPassword({ email, securityAnswer, newPassword }) {
  const user = db.findUserByEmail((email || '').trim().toLowerCase());
  if (!user) return { error: 'No account found with that email.' };
  if (user.securityAnswerHash !== simpleHash((securityAnswer || '').trim().toLowerCase())) {
    return { error: 'That answer doesn\u2019t match our records.' };
  }
  if (!newPassword || newPassword.length < 6) return { error: 'New password must be at least 6 characters.' };
  db.updateUser(user.id, { passwordHash: simpleHash(newPassword) });
  return { success: true };
}

export function updateProfile(patch) {
  currentUser = db.updateUser(currentUser.id, patch);
  return currentUser;
}
