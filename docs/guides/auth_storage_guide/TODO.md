# Implementation TODO — GitHub/Google Auth & Portable Storage

> Checklist for the design in
> [`githubGoogleAuthStorageImplementation.md`](githubGoogleAuthStorageImplementation.md)
> and the on-disk contract in
> [`accountStorageContract.md`](accountStorageContract.md).
> Verify each item against the actual code before ticking it.
>
> **Model in one line:** the user's GitHub repo / Drive folder *is* the account.
> Flow is **browse → select → validate (fit-check) → load or init**. No project DB.

---

## Phase 0: Decisions to lock before coding

- [ ] **GitHub**: classic OAuth App (`repo` = broad) **or** GitHub App
      (per-repo `Contents:rw` + `Metadata:r`)? Pick one; it changes the picker UX.
- [ ] **Google**: Google Picker (`drive.file`, recommended) **or** app-rendered
      browse (`drive.metadata.readonly`)? Pick one; document the privacy cost.
- [ ] **Identity**: possession-based (default) vs. subject-bound load. Default =
      possession-based; record `storage.ownerId` regardless.

---

## Phase 1: Backend — Auth & Storage Services

### Dependencies
- [ ] `npm install express-session passport passport-github2 passport-google-oauth20 @octokit/rest googleapis crypto-js dotenv` (in `backend/`)
- [ ] `npm install --save-dev @types/express-session @types/passport @types/passport-github2 @types/passport-google-oauth20`

### Environment
- [ ] Add vars to `.env.example` (`SESSION_SECRET`, GitHub/Google client id+secret,
      redirect URIs, `GOOGLE_PICKER_API_KEY`, `ENCRYPTION_KEY`) and document in `backend/README.md`
- [ ] Generate `ENCRYPTION_KEY` with `openssl rand -base64 32`

### Auth Service (`backend/services/authService.js`)
- [ ] Passport strategies (GitHub, Google) + session middleware
- [ ] AES-256-GCM encrypt/decrypt using `ENCRYPTION_KEY`
- [ ] `middleware()` → `[session(), passport.initialize(), passport.session()]`
- [ ] `getGitHubClient(user)` → authenticated Octokit
- [ ] `getGoogleDriveClient(user)` → OAuth2 + `setCredentials({ access_token })`
- [ ] `refreshGoogleToken(user)`
- [ ] `clientsFor(user)` helper → `{ githubClient?, driveClient? }` for routes/controller
- [ ] `deserializeUser` returns the session payload (identity + encrypted tokens +
      attached `storage`); **no user DB** in this model

### Storage Service (`backend/services/storageService.js`) — speaks the contract
- [ ] **Browse**: `listGitHubRepos(githubClient)` → `{ id(nodeId), full_name, private, html_url }[]`
      (Google folders come from the client-side Picker, not the backend)
- [ ] **Fit-check**: `validateStorage(provider, storageRef, clients)` →
      `{ status, reason?, capabilities, manifestSummary? }` per
      [accountStorageContract.md → Validation rules](accountStorageContract.md#validation-rules-the-fit-check)
- [ ] **Load**: `loadAccount(provider, storageRef, clients)` — read manifest +
      `scans/index.json`, **reconcile drift** by rebuilding from `scans/*.json`
- [ ] **Init**: `initStorage(provider, storageRef, owner, clients)` — **revalidate**,
      then conditionally create `equalview.json` + `scans/` skeleton
- [ ] **Save**: `saveScanResults(account, scanResult, url, clients)` — write immutable
      `scans/<scanId>_<host>.json`, then update index + manifest summary
- [ ] GitHub writes pass blob `sha` (optimistic concurrency); prefer a single commit
- [ ] Drive writes use generation/ETag preconditions; scan file written first
- [ ] **Accepts pre-built clients** — no direct `AuthService` calls
- [ ] Scan files immutable; `index.json` + `scanCount` treated as caches
- [ ] **No** `repos.getForAuthenticatedUser` for existence (use `repos.getContent`/`repos.get`)
- [ ] **No** `GoogleAuth({ credentials:{access_token} })` (use `OAuth2` + `setCredentials`)
- [ ] **Never** write tokens/secrets into the store

### Auth Routes (`backend/routes/auth.js`)
- [ ] Factory `makeAuthRouter()`; apply `authService.middleware()` at router level
- [ ] `GET /github`, `GET /google` — initiate OAuth (store provider in session)
- [ ] `GET /github/callback`, `GET /google/callback` — redirect `/connect?provider=…`
- [ ] `GET /storages?provider=github` — list repos (GitHub only)
- [ ] `POST /storage/validate` — fit-check the selected storage
- [ ] `POST /storage` — `action: "load" | "init"`; **revalidate** then act; attach `req.user.storage`
- [ ] `GET /user` — safe profile (+ `storage`), **no tokens**
- [ ] `GET /status` — `{ authenticated, user }`
- [ ] `POST /logout` — `req.logout()`, destroy session, clear cookie
- [ ] **No frontend import** (`PROVIDERS` not used here)
- [ ] `module.exports = makeAuthRouter`

### Routes Index (`backend/routes/index.js`)
- [ ] `const makeAuthRouter = require('./auth')`
- [ ] Mount once: `app.use('/api/auth', makeAuthRouter())`
- [ ] Keep existing `/api` (scan) and `/problems` mounts
- [ ] **No dual mounting**

### App.js (`backend/app.js`)
- [ ] Construct `authService` + `storageService`; pass both to `ScanController` deps
- [ ] Import path `require('./services/storageService')` (not `../services`)

### Scan Controller (`backend/controllers/scanController.js`)
- [ ] Accept `storageService` + `authService` in deps
- [ ] In `postScan`: if authenticated and `req.user.storage`, build clients and
      `saveScanResults(...)` — a storage failure logs a warning, **never** fails the scan

---

## Phase 2: Frontend — Real Auth + Picker + Fit-check

### API Client (`frontend/src/lib/apiClient.js`)
- [ ] `credentials: 'include'` on all calls; **remove** any Bearer/localStorage token
- [ ] `githubLogin()` / `googleLogin()` → full redirect to `/api/auth/{provider}`
- [ ] `getAuthStatus()`, `getUser()`, `logout()`
- [ ] `listStorages(provider)` → `GET /api/auth/storages?provider=…`
- [ ] `validateStorage(provider, storageRef)` → `POST /api/auth/storage/validate`
- [ ] `setupStorage(provider, storageRef, action)` → `POST /api/auth/storage`
- [ ] Keep `runScan`, `getScanResults`, `getProblem`

### ConnectView (`frontend/src/views/ConnectView.jsx`) — the picker
- [ ] GitHub: list repos via `listStorages('github')`; Google: launch **Google Picker**
- [ ] Persistent **"Create new"** option (the `init` path on a fresh store)
- [ ] On select → `validateStorage` → render fit-check status + scan count
- [ ] Action button follows status: `loadable`→"Load my account",
      `initializable`/new→"Set up & continue", `incompatible`/`invalid`→blocked + guidance
- [ ] Disable init when `capabilities.canWrite === false`
- [ ] On confirm → `setupStorage(provider, storageRef, action)` → dashboard
- [ ] Replace hard-coded `existing` lists in `frontend/src/data/placeholders.js`

### App Routes (`frontend/src/App.jsx`)
- [ ] State: `user` (from `/api/auth/user`, includes `storage`), `provider`, selection
- [ ] On mount: `getAuthStatus()` → if authed, `getUser()`
- [ ] `auth(provider)` → full OAuth redirect
- [ ] `connectDone()` → `setupStorage(...)` → dashboard
- [ ] `signOut()` → `logout()` → clear state → landing
- [ ] Remove `setAuthed` / placeholder-only wiring

### Views
- [ ] `AccountView` — real `user` + `storage` (not `PLACEHOLDER_USER`); "saved scans" from index
- [ ] `DashboardView` — saved scans from the loaded index (not `PLACEHOLDER_SAVED_SCANS`)
- [ ] `ConnectView` — accept a `storageError` prop for failures

---

## Phase 3: Testing & Documentation

### Tests
- [ ] `backend/tests/auth.test.js` — OAuth redirects, callbacks, status/logout
- [ ] `backend/tests/storage.test.js` — fit-check matrix (loadable / initializable /
      unrelated / incompatible / invalid), load-time reconcile, init race guard,
      atomic save (mock authenticated user + mock clients)
- [ ] `frontend/tests/apiClient.test.js` — auth + storage methods
- [ ] `frontend/tests/connectView.test.jsx` — picker + fit-check rendering per status

### Documentation
- [ ] `backend/README.md`: auth/storage endpoints table, env setup, OAuth/Picker
      config, scopes, testing
- [ ] Keep this TODO and the design/contract docs in sync if implementation diverges

---

## Verification checklist (run before marking complete)

- [ ] `grep -r "makeAuthRouter" backend/routes/` — factory used, mounted once
- [ ] `grep -r "mountAuthRoutes" backend/` — **zero** (no dual mount)
- [ ] `grep -r "credentials: 'include'" frontend/src/lib/apiClient.js` — present
- [ ] `grep -rn "validateStorage\|listStorages\|setupStorage" frontend/src/lib/apiClient.js` — all present
- [ ] `grep -r "getForAuthenticatedUser" backend/` — **zero** (use `repos.get`/`getContent`)
- [ ] `grep -r "credentials.*access_token" backend/` — **zero** (use `setCredentials`)
- [ ] `grep -r "PROVIDERS" backend/routes/auth.js` — **zero** (no frontend import)
- [ ] `grep -rn "drive.file\|drive.metadata.readonly" backend/` — scope matches the locked decision
- [ ] `grep -rn "sha" backend/services/storageService.js` — GitHub writes pass a blob sha
- [ ] No tokens written to the store: review `initStorage` / `saveScanResults` payloads

---

## Notes

- Each checkbox is a verifiable claim. If you can't verify it in real code, it's not done.
- Prefer small, testable PRs.
- [`githubGoogleAuthStorageImplementation.md`](githubGoogleAuthStorageImplementation.md)
  (flow/API) and [`accountStorageContract.md`](accountStorageContract.md) (bytes)
  are the source of truth — update them if the implementation diverges.
