# Implementation TODO — GitHub/Google Auth & Portable Storage

> Checklist for the design in
> `[githubGoogleAuthStorageImplementation.md](githubGoogleAuthStorageImplementation.md)`
> and the on-disk contract in
> `[accountStorageContract.md](accountStorageContract.md)`.
> Verify each item against the actual code before ticking it.
>
> **Model in one line:** the user's GitHub repo / Drive folder *is* the account.
> Flow is **browse → select → validate (fit-check) → load or init**. No project DB.

---

## Phase 0: Decisions to lock before coding

- [x] **GitHub**: classic OAuth App (`repo` = broad) **or** GitHub App
  ```
  (per-repo `Contents:rw` + `Metadata:r`)? Pick one; it changes the picker UX.
  ```
  - **Choice:** GitHub App
- [x] **Google**: Google Picker (`drive.file`, recommended) **or** app-rendered
  ```
  browse (`drive.metadata.readonly`)? Pick one; document the privacy cost.
  ```
  - **Choice:** Google Picker
- [x] **Identity**: possession-based (default) vs. subject-bound load. Default =
  ```
  possession-based; record `storage.ownerId` regardless.
  ```
  - **Choice:** Possession-based

---



## Implementation sequencing

Ship **GitHub first**, **Google second** — not both providers in one PR. Phase 0
choices for both providers still stand; Google is deferred, not dropped.

- **Phase 1–2:** auth + storage abstraction with **GitHub adapter only**.
- **Routes, controller, and frontend** stay provider-neutral; Google surfaces as
a stub behind the same interface.
- **Phase 3:** Google backend adapter + Google Picker (one adapter, not a rewrite).
- **GitHub App** means GitHub's OAuth registration type (per-repo least privilege),
not the EqualView storage app. Storage stays provider-agnostic.

---



## Phase 1: Backend — Auth & Storage (GitHub)



### Dependencies

- [x] `npm install express-session passport passport-github2 @octokit/rest crypto-js dotenv` (in `backend/`)
- [x] `npm install --save-dev @types/express-session @types/passport @types/passport-github2`
- [x] Defer Google deps (`passport-google-oauth20`, `googleapis`) to Phase 3



### Environment

- [x] Add vars to `.env.example` (`SESSION_SECRET`, GitHub App id+secret, redirect
  ```
  URIs, `ENCRYPTION_KEY`) and document in `backend/README.md`
  ```
- [x] Generate `ENCRYPTION_KEY` with `openssl rand -base64 32`
- [X] Defer `GOOGLE_PICKER_API_KEY` and Google OAuth vars to Phase 3



### Auth Service (`backend/services/authService.js`)

- [ ] Passport GitHub strategy + session middleware (Google strategy stubbed)
- [ ] AES-256-GCM encrypt/decrypt using `ENCRYPTION_KEY`
- [ ] `middleware()` → `[session(), passport.initialize(), passport.session()]`
- [ ] `getGitHubClient(user)` → authenticated Octokit
- [ ] `getGoogleDriveClient(user)` → stub (throws or returns `null` until Phase 3)
- [ ] `refreshGoogleToken(user)` → stub until Phase 3
- [ ] `clientsFor(user)` helper → `{ githubClient?, driveClient? }` for routes/controller
- [ ] `deserializeUser` returns the session payload (identity + encrypted tokens +
  ```
  attached `storage`); **no user DB** in this model
  ```



### Storage Service (`backend/services/storageService.js`) — speaks the contract

Provider-neutral interface; **GitHub adapter implemented**, Google adapter stubbed.

- [ ] **Browse**: `listGitHubRepos(githubClient)` → `{ id(nodeId), full_name, private, html_url }[]`
  ```
  (Google folders come from the client-side Picker in Phase 3, not the backend)
  ```
- [ ] **Fit-check**: `validateStorage(provider, storageRef, clients)` →
  ```
  `{ status, reason?, capabilities, manifestSummary? }` per
  [accountStorageContract.md → Validation rules](accountStorageContract.md#validation-rules-the-fit-check)
  ```
- [ ] **Load**: `loadAccount(provider, storageRef, clients)` — read manifest +
  ```
  `scans/index.json`, **reconcile drift** by rebuilding from `scans/*.json`
  ```
- [ ] **Init**: `initStorage(provider, storageRef, owner, clients)` — **revalidate**,
  ```
  then conditionally create `equalview.json` + `scans/` skeleton
  ```
- [ ] **Save**: `saveScanResults(account, scanResult, url, clients)` — write immutable
  ```
  `scans/<scanId>_<host>.json`, then update index + manifest summary
  ```
- [ ] GitHub writes pass blob `sha` (optimistic concurrency); prefer a single commit
- [ ] Drive writes stubbed until Phase 3 (generation/ETag preconditions; scan file first)
- [ ] **Accepts pre-built clients** — no direct `AuthService` calls
- [ ] Scan files immutable; `index.json` + `scanCount` treated as caches
- [ ] **No** `repos.getForAuthenticatedUser` for existence (use `repos.getContent`/`repos.get`)
- [ ] **No** `GoogleAuth({ credentials:{access_token} })` (use `OAuth2` + `setCredentials` when Drive lands)
- [ ] **Never** write tokens/secrets into the store



### Auth Routes (`backend/routes/auth.js`)

Provider-neutral routes; Google OAuth endpoints stubbed until Phase 3.

- [ ] Factory `makeAuthRouter()`; apply `authService.middleware()` at router level
- [ ] `GET /github` — initiate OAuth (store provider in session)
- [ ] `GET /github/callback` — redirect `/connect?provider=github`
- [ ] `GET /google`, `GET /google/callback` — stub (501 or redirect with "coming soon")
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
  ```
  `saveScanResults(...)` — a storage failure logs a warning, **never** fails the scan
  ```

---



## Phase 2: Frontend — Auth + GitHub Connect

Provider-neutral API shape; **GitHub picker wired**, Google deferred to Phase 3.

### API Client (`frontend/src/lib/apiClient.js`)

- [ ] `credentials: 'include'` on all calls; **remove** any Bearer/localStorage token
- [ ] `githubLogin()` → full redirect to `/api/auth/github`
- [ ] `googleLogin()` → stub or disabled until Phase 3
- [ ] `getAuthStatus()`, `getUser()`, `logout()`
- [ ] `listStorages(provider)` → `GET /api/auth/storages?provider=…`
- [ ] `validateStorage(provider, storageRef)` → `POST /api/auth/storage/validate`
- [ ] `setupStorage(provider, storageRef, action)` → `POST /api/auth/storage`
- [ ] Keep `runScan`, `getScanResults`, `getProblem`



### ConnectView (`frontend/src/views/ConnectView.jsx`) — the picker

- [ ] GitHub: list repos via `listStorages('github')`
- [ ] Google Picker deferred to Phase 3 (hide or disable Google connect path)
- [ ] Persistent **"Create new"** option (the `init` path on a fresh store)
- [ ] On select → `validateStorage` → render fit-check status + scan count
- [ ] Action button follows status: `loadable`→"Load my account",
  ```
  `initializable`/new→"Set up & continue", `incompatible`/`invalid`→blocked + guidance
  ```
- [ ] Disable init when `capabilities.canWrite === false`
- [ ] On confirm → `setupStorage(provider, storageRef, action)` → dashboard
- [ ] Replace hard-coded `existing` lists in `frontend/src/data/placeholders.js`



### App Routes (`frontend/src/App.jsx`)

- [ ] State: `user` (from `/api/auth/user`, includes `storage`), `provider`, selection
- [ ] On mount: `getAuthStatus()` → if authed, `getUser()`
- [ ] `auth(provider)` → full OAuth redirect (GitHub only for now)
- [ ] `connectDone()` → `setupStorage(...)` → dashboard
- [ ] `signOut()` → `logout()` → clear state → landing
- [ ] Remove `setAuthed` / placeholder-only wiring



### Views

- [ ] `AccountView` — real `user` + `storage` (not `PLACEHOLDER_USER`); "saved scans" from index
- [ ] `DashboardView` — saved scans from the loaded index (not `PLACEHOLDER_SAVED_SCANS`)
- [ ] `ConnectView` — accept a `storageError` prop for failures

---



## Phase 3: Google — Backend adapter + Picker

One adapter behind the existing provider-neutral interface; no rewrite of Phases 1–2.

### Backend

- [ ] `npm install passport-google-oauth20 googleapis` (+ dev types)
- [ ] Add Google OAuth vars + `GOOGLE_PICKER_API_KEY` to `.env.example` and `backend/README.md`
- [ ] Passport Google strategy; wire `GET /google` + `GET /google/callback`
- [ ] `getGoogleDriveClient(user)` + `refreshGoogleToken(user)` — real implementations
- [ ] Drive adapter in `storageService`: fit-check, load, init, save with generation/ETag
- [ ] Backend scopes: `drive.file` only (per Phase 0 choice)



### Frontend

- [ ] `googleLogin()` → full redirect to `/api/auth/google`
- [ ] ConnectView: launch **Google Picker** for folder selection
- [ ] Enable Google connect path in `App.jsx` / landing

---



## Phase 4: Testing & Documentation



### Tests

- [ ] `backend/tests/auth.test.js` — OAuth redirects, callbacks, status/logout
- [ ] `backend/tests/storage.test.js` — fit-check matrix (loadable / initializable /
  ```
  unrelated / incompatible / invalid), load-time reconcile, init race guard,
  atomic save (mock authenticated user + mock clients)
  ```
- [ ] `frontend/tests/apiClient.test.js` — auth + storage methods
- [ ] `frontend/tests/connectView.test.jsx` — picker + fit-check rendering per status



### Documentation

- [ ] `backend/README.md`: auth/storage endpoints table, env setup, OAuth/Picker
  ```
  config, scopes, testing
  ```
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
- `[githubGoogleAuthStorageImplementation.md](githubGoogleAuthStorageImplementation.md)`
(flow/API) and `[accountStorageContract.md](accountStorageContract.md)` (bytes)
are the source of truth — update them if the implementation diverges.

