// auth.js — real accounts via Firebase Authentication (email/password).
// Session persistence, password hashing, and password-reset emails are all handled by Firebase.
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  updateProfile as fbUpdateProfile,
  sendPasswordResetEmail,
  reauthenticateWithCredential,
  updatePassword as fbUpdatePassword,
  updateEmail as fbUpdateEmail,
  EmailAuthProvider,
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { doc, setDoc, getDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import { auth, fs } from './firebase.js';

// A plain, view-friendly snapshot of the signed-in user: { uid, name, email }.
export let currentUser = null;

function syncCurrentUser(fbUser) {
  currentUser = fbUser ? { uid: fbUser.uid, name: fbUser.displayName || 'Friend', email: fbUser.email } : null;
  return currentUser;
}

// Fires immediately with the restored session (or null) on page load, and again on
// every login/logout. This replaces all custom "session" storage.
export function onAuthReady(callback) {
  return onAuthStateChanged(auth, async fbUser => {
    syncCurrentUser(fbUser);
    callback(currentUser);
  });
}

async function ensureUserDoc(uid, data) {
  const ref = doc(fs, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { ...data, createdAt: serverTimestamp() });
  }
}

export async function signup({ name, email, password }) {
  name = (name || '').trim();
  email = (email || '').trim().toLowerCase();
  if (!name || !email || !password) return { error: 'Please fill in your name, email and password.' };
  if (password.length < 6) return { error: 'Password must be at least 6 characters.' };
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await fbUpdateProfile(cred.user, { displayName: name });
    await ensureUserDoc(cred.user.uid, { name, email });
    syncCurrentUser({ ...cred.user, displayName: name });
    return { user: currentUser };
  } catch (e) {
    return { error: friendlyError(e) };
  }
}

export async function login({ email, password }) {
  email = (email || '').trim().toLowerCase();
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    syncCurrentUser(cred.user);
    return { user: currentUser };
  } catch (e) {
    return { error: friendlyError(e) };
  }
}

export async function logout() {
  await fbSignOut(auth);
  currentUser = null;
}

export async function sendReset(email) {
  try {
    await sendPasswordResetEmail(auth, (email || '').trim().toLowerCase());
    return { success: true };
  } catch (e) {
    return { error: friendlyError(e) };
  }
}

export async function updateProfile({ name, email }) {
  try {
    if (name && name !== currentUser.name) {
      await fbUpdateProfile(auth.currentUser, { displayName: name });
    }
    if (email && email !== currentUser.email) {
      await fbUpdateEmail(auth.currentUser, email);
    }
    await setDoc(doc(fs, 'users', currentUser.uid), { name, email }, { merge: true });
    syncCurrentUser(auth.currentUser);
    return { user: currentUser };
  } catch (e) {
    return { error: friendlyError(e) };
  }
}

export async function changePassword({ currentPassword, newPassword }) {
  if (!newPassword || newPassword.length < 6) return { error: 'New password must be at least 6 characters.' };
  try {
    const cred = EmailAuthProvider.credential(currentUser.email, currentPassword);
    await reauthenticateWithCredential(auth.currentUser, cred);
    await fbUpdatePassword(auth.currentUser, newPassword);
    return { success: true };
  } catch (e) {
    return { error: friendlyError(e) };
  }
}

function friendlyError(e) {
  const code = e?.code || '';
  const map = {
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/invalid-email': 'That email address doesn\u2019t look right.',
    'auth/user-not-found': 'No account found with that email.',
    'auth/wrong-password': 'Incorrect email or password.',
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/requires-recent-login': 'Please log out and back in, then try again.',
    'auth/network-request-failed': 'Network error \u2014 check your connection and try again.',
  };
  return map[code] || (e?.message ? e.message.replace(/^Firebase:\s*/, '') : 'Something went wrong. Please try again.');
}
