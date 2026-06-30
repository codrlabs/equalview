# Implementation TODO — GitHub/Google Auth & Storage

> Checklist for implementing the design in `githubGoogleAuthStorageImplementation.md`.
> Each item should be verified against the actual codebase before marking complete.

---

## Phase 1: Backend — Auth & Storage Services

### Dependencies
- [ ] `npm install express-session passport passport-github2 passport-google-oauth20 @octokit/rest googleapis crypto-js dotenv` (in `backend/`)
- [ ] `npm install --save-dev @types/express-session @types/passport @types/passport-github2 @types/passport-google-oauth20`

### Environment
- [ ] Add required vars to `.env.example` and document in `backend/README.md`
- [ ] Generate `ENCRYPTION_KEY` with `openssl rand -base64 32`

### Auth Service (`backend/services/authService.js`)
- [ ] Create file with Passport strategies (GitHub, Google)
- [ ] Implement AES-256-GCM encrypt/decrypt using `ENCRYPTION_KEY`
- [ ] Export `middleware()` returning `[session(), passport.initialize(), passport.session()]`
- [ ] Export `getGitHubClient(user)` → authenticated Octokit
- [ ] Export `getGoogleDriveClient(user)` → authenticated Google Drive client (OAuth2 with access_token)
- [ ] Export `refreshGoogleToken(user)` for token refresh
- [ ] **Stub** `deserializeUser` with `// TODO: load full user from DB`

### Storage Service (`backend/services/storageService.js`)
- [ ] Create file with GitHub operations:
  - [ ] `createGitHubRepo(githubClient, repoName, private)`
  - [ ] `createGitHubFile(githubClient, owner, repo, path, content, branch)`
- [ ] Create file with Google Drive operations:
  - [ ] `createGoogleDriveFolder(driveClient, folderName, parentId)`
  - [ ] `uploadToGoogleDrive(driveClient, fileName, mimeType, content, parentId)`
- [ ] `getOrCreateStorage(user, storageType, storageName, githubClient, driveClient)` — **accepts pre-built clients**
- [ ] `saveScanResults(user, storageInfo, scanResults, url, githubClient, driveClient)` — **accepts pre-built clients**
- [ ] **No direct calls to `AuthService` methods** — clients passed in from routes

### Auth Routes (`backend/routes/auth.js`)
- [ ] Factory function `makeAuthRouter()` returning Express Router
- [ ] Apply `authService.middleware()` at router level
- [ ] `GET /github` — initiate GitHub OAuth (store provider in session)
- [ ] `GET /google` — initiate Google OAuth (store provider in session)
- [ ] `GET /github/callback` — handle callback, redirect to `/connect?provider=github`
- [ ] `GET /google/callback` — handle callback, redirect to `/connect?provider=google`
- [ ] `POST /storage` — validate body, call `storageService.getOrCreateStorage()` with clients from `authService`, attach `req.user.storage`
- [ ] `GET /user` — return safe user data (no tokens)
- [ ] `POST /logout` — `req.logout()`, destroy session, clear cookie
- [ ] `GET /status` — return `{ authenticated, user }`
- [ ] **No import from frontend** (`PROVIDERS` not used here)
- [ ] Export `module.exports = makeAuthRouter`

### Routes Index (`backend/routes/index.js`)
- [ ] Import `makeAuthRouter` from `./auth`
- [ ] Mount once: `app.use('/api/auth', makeAuthRouter())`
- [ ] Keep existing scan/problems mounts under `/api` and `/problems`
- [ ] **No dual mounting** of auth routes

### App.js (`backend/app.js`)
- [ ] Import `mountRoutes` only (auth routes mounted inside `mountRoutes`)
- [ ] Pass `storageService` to `ScanController` deps
- [ ] Import path: `require('./services/storageService')` (not `../services`)

### Scan Controller (`backend/controllers/scanController.js`)
- [ ] Accept `storageService` in constructor deps
- [ ] In `postScan`: if authenticated and `req.user.storage`, call `storageService.saveScanResults()` with clients from `authService`

---

## Phase 2: Frontend — Real Auth Integration

### API Client (`frontend/src/lib/apiClient.js`)
- [ ] Use `credentials: 'include'` on all fetch calls (session cookies)
- [ ] **Remove** Bearer token logic (no `localStorage` accessToken)
- [ ] `githubLogin()` → `window.location.href = '/api/auth/github'`
- [ ] `googleLogin()` → `window.location.href = '/api/auth/google'`
- [ ] `getAuthStatus()` → `GET /api/auth/status`
- [ ] `getUser()` → `GET /api/auth/user`
- [ ] `setupStorage(provider, mode, name)` → `POST /api/auth/storage`
- [ ] `logout()` → `POST /api/auth/logout`
- [ ] Keep `runScan`, `getScanResults`, `getProblem` unchanged (already use `/api/...`)

### App Routes (`frontend/src/App.jsx`)
- [ ] State: `user` (from `/api/auth/user`), `provider`, `storageProvider`, `storageName`
- [ ] On mount: `apiClient.getAuthStatus()` → if authenticated, `apiClient.getUser()` → set user
- [ ] Listen for `auth:logout` event → clear state, navigate to signin
- [ ] `auth(provider)` → call `apiClient.githubLogin()` or `googleLogin()` (full redirect)
- [ ] `connectDone(mode)` → `apiClient.setupStorage(provider, mode, name)` → set storage info → navigate to dashboard
- [ ] `signOut()` → `apiClient.logout()` → clear state → navigate to landing
- [ ] **Remove** `setAuthed` / bare `name` references — use `setUser` and `storageName`

### Views
- [ ] `SignInView` — accept `providerInfo` prop (optional)
- [ ] `AccountView` — use `user` prop (real data), not `PLACEHOLDER_USER`
- [ ] `ConnectView` — accept `storageError` prop for error display

---

## Phase 3: Testing & Documentation

### Tests
- [ ] `backend/tests/auth.test.js` — test OAuth redirects, callbacks
- [ ] `backend/tests/storage.test.js` — test storage creation (mock authenticated user)
- [ ] `frontend/tests/apiClient.test.js` — test auth methods

### Documentation
- [ ] Update `backend/README.md` with:
  - [ ] Auth endpoints table
  - [ ] Environment setup instructions
  - [ ] OAuth app configuration steps
  - [ ] Required scopes
  - [ ] Testing instructions
- [ ] Verify acceptance criteria match design doc (no "no frontend changes" claim)

---

## Verification Checklist (Run Before Marking Complete)

- [ ] `grep -r "makeAuthRouter" backend/routes/` — factory used, not instance
- [ ] `grep -r "mountAuthRoutes" backend/` — **zero matches** (no dual mount)
- [ ] `grep -r "/auth/github" frontend/src/lib/apiClient.js` — paths include `/api/auth/`
- [ ] `grep -r "credentials: 'include'" frontend/src/lib/apiClient.js` — present on fetch
- [ ] `grep -r "getGitHubClient" backend/services/storageService.js` — **zero matches** (clients passed in)
- [ ] `grep -r "PROVIDERS" backend/routes/auth.js` — **zero matches** (no frontend import)
- [ ] `grep -r "repos.getForAuthenticatedUser" backend/` — **zero matches** (use `repos.get({owner, repo})`)
- [ ] `grep -r "GoogleAuth.*credentials.*access_token" backend/` — **zero matches** (use OAuth2 + setCredentials)
- [ ] `grep -r "../services/storageService" backend/app.js` — **zero matches** (use `./services/storageService`)
- [ ] `grep -r "deserializeUser" backend/services/authService.js` — has `// TODO: load full user from DB`
- [ ] `grep -r "setAuthed" frontend/src/App.jsx` — **zero matches** (use `setUser`)

---

## Notes

- Each checkbox represents a verifiable claim. If you can't verify it in the actual code, it's not done.
- Prefer small, testable PRs over one big merge.
- Design doc (`githubGoogleAuthStorageImplementation.md`) is the source of truth — update it if implementation diverges.