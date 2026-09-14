import * as auth from '../auth.js';
import { toast } from '../components.js';

function wordmark() {
  return `<div class="auth-brand"><span class="auth-wordmark">WonderI</span><span class="auth-tag">Steady progress, one day at a time</span></div>`;
}

export function renderLogin(navigate) {
  return `<div class="auth-screen">
    ${wordmark()}
    <form id="login-form" class="auth-form">
      <h1>Welcome back</h1>
      <label class="field"><span class="field-label">Email</span><input class="field-input" type="email" id="login-email" required autocomplete="email"></label>
      <label class="field"><span class="field-label">Password</span><input class="field-input" type="password" id="login-password" required autocomplete="current-password"></label>
      <p class="auth-error" id="login-error"></p>
      <button class="btn btn-primary btn-full" type="submit">Log in</button>
      <div class="auth-links">
        <a href="#/forgot">Forgot password?</a>
        <a href="#/signup">Create an account</a>
      </div>
    </form>
  </div>`;
}

export function mountLogin(onSuccess) {
  document.getElementById('login-form').addEventListener('submit', e => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const res = auth.login({ email, password });
    if (res.error) { document.getElementById('login-error').textContent = res.error; return; }
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
      <label class="field"><span class="field-label">Security question <small>(used to reset your password)</small></span>
        <select class="field-input" id="signup-question">
          <option>What city were you born in?</option>
          <option>What was your first pet's name?</option>
          <option>What is your mother's maiden name?</option>
          <option>What was the name of your first school?</option>
        </select>
      </label>
      <label class="field"><span class="field-label">Answer</span><input class="field-input" id="signup-answer" required></label>
      <p class="auth-error" id="signup-error"></p>
      <button class="btn btn-primary btn-full" type="submit">Sign up</button>
      <div class="auth-links"><a href="#/login">Already have an account? Log in</a></div>
    </form>
  </div>`;
}

export function mountSignup(onSuccess) {
  document.getElementById('signup-form').addEventListener('submit', e => {
    e.preventDefault();
    const res = auth.signup({
      name: document.getElementById('signup-name').value,
      email: document.getElementById('signup-email').value,
      password: document.getElementById('signup-password').value,
      securityQuestion: document.getElementById('signup-question').value,
      securityAnswer: document.getElementById('signup-answer').value,
    });
    if (res.error) { document.getElementById('signup-error').textContent = res.error; return; }
    onSuccess();
  });
}

export function renderForgot() {
  return `<div class="auth-screen">
    ${wordmark()}
    <form id="forgot-form" class="auth-form">
      <h1>Reset your password</h1>
      <label class="field"><span class="field-label">Email</span><input class="field-input" type="email" id="forgot-email" required></label>
      <button type="button" class="btn btn-secondary btn-full" id="forgot-find">Find account</button>
      <div id="forgot-step2" style="display:none">
        <label class="field"><span class="field-label" id="forgot-question"></span><input class="field-input" id="forgot-answer"></label>
        <label class="field"><span class="field-label">New password</span><input class="field-input" type="password" id="forgot-newpass" minlength="6"></label>
        <button class="btn btn-primary btn-full" type="submit">Reset password</button>
      </div>
      <p class="auth-error" id="forgot-error"></p>
      <div class="auth-links"><a href="#/login">Back to log in</a></div>
    </form>
  </div>`;
}

export function mountForgot(onSuccess) {
  const err = document.getElementById('forgot-error');
  document.getElementById('forgot-find').addEventListener('click', () => {
    const email = document.getElementById('forgot-email').value;
    const q = auth.getSecurityQuestion(email);
    if (!q) { err.textContent = 'No account found with that email.'; return; }
    err.textContent = '';
    document.getElementById('forgot-question').textContent = q;
    document.getElementById('forgot-step2').style.display = 'block';
  });
  document.getElementById('forgot-form').addEventListener('submit', e => {
    e.preventDefault();
    const res = auth.resetPassword({
      email: document.getElementById('forgot-email').value,
      securityAnswer: document.getElementById('forgot-answer').value,
      newPassword: document.getElementById('forgot-newpass').value,
    });
    if (res.error) { err.textContent = res.error; return; }
    toast('Password updated. Please log in.');
    onSuccess();
  });
}
