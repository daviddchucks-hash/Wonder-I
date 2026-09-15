import * as auth from '../auth.js';
import { toast } from '../components.js';

function wordmark() {
  return `<div class="auth-brand"><span class="auth-wordmark">WonderI</span><span class="auth-tag">Steady progress, one day at a time</span></div>`;
}

function setBusy(form, busy) {
  form.querySelectorAll('button, input').forEach(el => el.disabled = busy);
}

export function renderLogin() {
  return `<div class="auth-screen">
    ${wordmark()}
    <form id="login-form" class="auth-form">
      <h1>Welcome back</h1>
      <label class="field"><span class="field-label">Email</span><input class="field-input" type="email" id="login-email" required autocomplete="email"></label>
      <label class="field"><span class="field-label">Password</span><input class="field-input" type="password" id="login-password" required autocomplete="current-password"></label>
      <p class="auth-error" id="login-error"></p>
      <button class="btn btn-primary btn-full" type="submit" id="login-submit">Log in</button>
      <div class="auth-links">
        <a href="#/forgot">Forgot password?</a>
        <a href="#/signup">Create an account</a>
      </div>
    </form>
  </div>`;
}

export function mountLogin(onSuccess) {
  const form = document.getElementById('login-form');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const err = document.getElementById('login-error');
    err.textContent = '';
    setBusy(form, true);
    document.getElementById('login-submit').textContent = 'Logging in\u2026';
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const res = await auth.login({ email, password });
    setBusy(form, false);
    document.getElementById('login-submit').textContent = 'Log in';
    if (res.error) { err.textContent = res.error; return; }
    onSuccess();
  });
}

export function renderSignup() {
  return `<div class="auth-screen">
    ${wordmark()}
    <form id="signup-form" class="auth-form">
      <h1>Create your account</h1>
      <label class="field"><span class="field-label">Name</span><input class="field-input" id="signup-name" required autocomplete="name"></label>
      <label class="field"><span class="field-label">Email</span><input class="field-input" type="email" id="signup-email" required autocomplete="email"></label>
      <label class="field"><span class="field-label">Password</span><input class="field-input" type="password" id="signup-password" required autocomplete="new-password" minlength="6"></label>
      <p class="auth-error" id="signup-error"></p>
      <button class="btn btn-primary btn-full" type="submit" id="signup-submit">Sign up</button>
      <div class="auth-links"><a href="#/login">Already have an account? Log in</a></div>
    </form>
  </div>`;
}

export function mountSignup(onSuccess) {
  const form = document.getElementById('signup-form');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const err = document.getElementById('signup-error');
    err.textContent = '';
    setBusy(form, true);
    document.getElementById('signup-submit').textContent = 'Creating account\u2026';
    const res = await auth.signup({
      name: document.getElementById('signup-name').value,
      email: document.getElementById('signup-email').value,
      password: document.getElementById('signup-password').value,
    });
    setBusy(form, false);
    document.getElementById('signup-submit').textContent = 'Sign up';
    if (res.error) { err.textContent = res.error; return; }
    onSuccess();
  });
}

export function renderForgot() {
  return `<div class="auth-screen">
    ${wordmark()}
    <form id="forgot-form" class="auth-form">
      <h1>Reset your password</h1>
      <p class="muted-note" style="margin-bottom:16px">Enter your account email and we'll send a link to reset your password.</p>
      <label class="field"><span class="field-label">Email</span><input class="field-input" type="email" id="forgot-email" required></label>
      <p class="auth-error" id="forgot-error"></p>
      <button class="btn btn-primary btn-full" type="submit" id="forgot-submit">Send reset link</button>
      <div class="auth-links"><a href="#/login">Back to log in</a></div>
    </form>
  </div>`;
}

export function mountForgot(onSuccess) {
  const form = document.getElementById('forgot-form');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const err = document.getElementById('forgot-error');
    err.textContent = '';
    setBusy(form, true);
    document.getElementById('forgot-submit').textContent = 'Sending\u2026';
    const res = await auth.sendReset(document.getElementById('forgot-email').value);
    setBusy(form, false);
    document.getElementById('forgot-submit').textContent = 'Send reset link';
    if (res.error) { err.textContent = res.error; return; }
    toast('Check your inbox for a reset link.');
    onSuccess();
  });
}
