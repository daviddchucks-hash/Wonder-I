# WonderI — setup & deployment

WonderI now uses **Firebase** for real accounts and cloud storage instead of the browser's
local storage. Before it will work, do this once in the Firebase console for the
`wonder-i` project:

## 1. Turn on Email/Password sign-in
Firebase console → **Authentication → Sign-in method → Email/Password → Enable**.

## 2. Create the Firestore database
Firebase console → **Firestore Database → Create database** (Production mode is fine).

## 3. Set security rules
Firestore console → **Rules** tab → paste the contents of `firestore.rules` (included in
this folder) → **Publish**. This makes sure every account can only read/write its own data.

## 4. Add your GitHub Pages domain as an authorized domain
Firebase console → **Authentication → Settings → Authorized domains → Add domain**, and add
your Pages domain, e.g. `yourusername.github.io`. Without this, sign-up/login will fail
with an `auth/unauthorized-domain` error on the deployed site (it works fine when you're
testing on `localhost`, which is authorized by default).

## 5. Password reset emails
`sendPasswordResetEmail` works out of the box — Firebase emails the user a link to its own
hosted reset page. No extra setup needed. If you'd rather customize the sender name/domain
or redirect back into your app, that's under **Authentication → Templates**.

## Deploying to GitHub Pages
1. Push this whole folder to a GitHub repo, with `index.html` at the repo root (or the root
   of whichever folder you point Pages at).
2. Repo → **Settings → Pages** → set the source branch/folder → save.
3. The included `.nojekyll` file stops GitHub from running its default Jekyll processing,
   which can otherwise skip or mangle plain static sites like this one.
4. Visit `https://yourusername.github.io/your-repo/` — sign up, and you're in.

### Why it looked blank before
Two bugs in the earlier build caused the blank screen, both now fixed:
- `app.js` grabbed the `#app-root` element from the page *before* it had been created,
  so it silently held `null` forever and every page render threw an error.
- Data lived only in the browser's local storage, so there was nothing to sync across
  devices — now everything is in Firestore instead.

If you ever see a blank page again, open the browser dev tools console (F12) — any JS
error will show there and points straight at the problem.

## Testing locally
Because the app is built from ES modules, open it through a local server rather than
double-clicking `index.html` (browsers block module `import` over the `file://` protocol).
For example, from this folder: `python3 -m http.server 8080`, then visit
`http://localhost:8080`.
