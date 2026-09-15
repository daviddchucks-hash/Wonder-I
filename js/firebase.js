// firebase.js — initializes Firebase using the modular v12 CDN SDK (no bundler needed,
// works as plain <script type="module"> on GitHub Pages or any static host).
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAnalytics, isSupported as analyticsIsSupported } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-analytics.js';
import { getAuth, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore, enableIndexedDbPersistence } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyDVkDaoJrBE2F5I1kV4tMtAxQdeW4t_HoA",
  authDomain: "wonder-i.firebaseapp.com",
  projectId: "wonder-i",
  storageBucket: "wonder-i.firebasestorage.app",
  messagingSenderId: "153335770769",
  appId: "1:153335770769:web:a738fd3e3f3efb7bc6d930",
  measurementId: "G-LEKKELQMDK"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const fs = getFirestore(app);

// Analytics only works over https with a real domain and can throw in some
// environments (ad blockers, unsupported browsers) — never let it break the app.
analyticsIsSupported().then(ok => { if (ok) { try { getAnalytics(app); } catch { /* ignore */ } } }).catch(() => {});

// Keep users signed in across visits/tabs (this is Firebase's own persistent session,
// so we no longer need any custom localStorage session code).
setPersistence(auth, browserLocalPersistence).catch(() => {});

// Let the app keep working offline and sync when back online.
enableIndexedDbPersistence(fs).catch(() => { /* multiple tabs open, or unsupported browser — fine to ignore */ });
