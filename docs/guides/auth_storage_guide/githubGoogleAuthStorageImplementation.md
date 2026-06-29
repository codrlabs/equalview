# GitHub/Google Authentication and Storage Integration — Design Doc

## Overview

This document describes the design for implementing complete GitHub and Google authentication flows along with storage integration for saving scan results to either GitHub repositories or Google Drive folders.

**Status**: Design phase — implementation tracked in `TODO.md`

---

## Architecture

### High-Level Flow

```
User clicks "Sign in with GitHub/Google"
         │
         ▼
Backend initiates OAuth flow (passport-github2 / passport-google-oauth20)
         │
         ▼
Provider redirects to /api/auth/{provider}/callback with auth code
         │
         ▼
Backend exchanges code for tokens → encrypts tokens → stores in session
         │
         ▼
User redirected to ConnectView for storage selection
         │
         ▼
User selects provider (github/google) + mode (new/existing) + name
         │
         ▼
Backend creates/retrieves storage (GitHub repo or Google Drive folder)
         │
         ▼
Storage info attached to user session → User redirected to Dashboard
         │
         ▼
On scan: if authenticated, results saved to user's configured storage
```

### Security Model

- **Session-based auth**: Uses `express-session` with secure cookies (`credentials: 'include'`)
- **Token encryption**: All OAuth tokens encrypted at rest using AES-256-GCM
- **Token refresh**: Google refresh tokens supported; GitHub tokens are long-lived
- **Scope minimization**: Only request required scopes (`repo`, `user:email` for GitHub; `drive.file`, `profile`, `email` for Google)

---

## Backend Design

### 1. Auth Service (`backend/services/authService.js`)

**Responsibilities:**
- Configure Passport strategies (GitHub, Google)
- Encrypt/decrypt OAuth tokens
- Provide authenticated API clients (Octokit, Google Drive)
- Handle token refresh (Google)

**Key Methods:**
- `middleware()` — returns `[session(), passport.initialize(), passport.session()]`
- `getGitHubClient(user)` — returns authenticated Octokit instance
- `getGoogleDriveClient(user)` — returns authenticated Google Drive client
- `refreshGoogleToken(user)` — refreshes expired Google access token

**Note**: `deserializeUser` is a stub returning `{ id }`. In production, this should fetch the full user (including encrypted tokens) from a database.

---

### 2. Storage Service (`backend/services/storageService.js`)

**Responsibilities:**
- GitHub: create repos, create/update files
- Google Drive: create folders, upload files
- Get-or-create storage for a user
- Save scan results to configured storage

**Key Methods:**
- `createGitHubRepo(githubClient, repoName, private)`
- `createGitHubFile(githubClient, owner, repo, path, content, branch)`
- `createGoogleDriveFolder(driveClient, folderName, parentId)`
- `uploadToGoogleDrive(driveClient, fileName, mimeType, content, parentId)`
- `getOrCreateStorage(user, storageType, storageName)` — **accepts pre-built clients**
- `saveScanResults(user, storageInfo, scanResults, url)`

**Design Decision**: `getOrCreateStorage` and `saveScanResults` receive authenticated clients as arguments (built by `AuthService`) rather than calling `AuthService` methods directly. This avoids circular dependencies and keeps services decoupled.

---

### 3. Auth Routes (`backend/routes/auth.js`)

**Convention**: Factory function `makeAuthRouter()` returning an Express Router (matching `makeScanRouter`, `makeProblemsRouter`).

**Endpoints:**
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/github` | Initiate GitHub OAuth |
| GET | `/api/auth/google` | Initiate Google OAuth |
| GET | `/api/auth/github/callback` | GitHub OAuth callback |
| GET | `/api/auth/google/callback` | Google OAuth callback |
| POST | `/api/auth/storage` | Configure user's storage |
| GET | `/api/auth/user` | Get current user profile |
| POST | `/api/auth/logout` | Logout and destroy session |
| GET | `/api/auth/status` | Check auth status |

**Mounting**: In `backend/routes/index.js`:
```js
const makeAuthRouter = require('./auth');
function mountRoutes(app, { scanController }) {
  app.use('/api/auth', makeAuthRouter());
  app.use('/api', makeScanRouter(scanController));
  app.use('/problems', makeProblemsRouter(scanController));
}
```

**No dual mounting** — auth routes registered exactly once via the factory.

---

### 4. Scan Controller Integration

`ScanController` receives `storageService` as a dependency. In `postScan`:
```js
if (req.isAuthenticated() && req.user && req.user.storage) {
  await storageService.saveScanResults(req.user, req.user.storage, result, url);
}
```

---

## Frontend Design

### 1. API Client (`frontend/src/lib/apiClient.js`)

**Auth Model**: Session cookies (not Bearer tokens). The frontend:
- Calls `/api/auth/...` endpoints with `credentials: 'include'`
- Does **not** store access tokens in localStorage
- Relies on browser automatically sending session cookie

**Endpoints match backend routes** (all prefixed with `/api/auth/`):
- `githubLogin()` → `window.location.href = '/api/auth/github'`
- `googleLogin()` → `window.location.href = '/api/auth/google'`
- `getAuthStatus()` → `GET /api/auth/status`
- `getUser()` → `GET /api/auth/user`
- `setupStorage(provider, mode, name)` → `POST /api/auth/storage`
- `logout()` → `POST /api/auth/logout`

---

### 2. App Routes (`frontend/src/App.jsx`)

**State**: `user` object from `/api/auth/user` (includes `storage` when configured).

**Flow:**
1. On load: `apiClient.getAuthStatus()` → if authenticated, `apiClient.getUser()` → set user
2. Sign in: redirect to `/api/auth/{provider}` (full page redirect for OAuth)
3. Callback: backend redirects to `/connect?provider={provider}`
4. Connect: user selects storage → `apiClient.setupStorage()` → redirect to dashboard
5. Scan: `apiClient.runScan()` automatically includes session cookie

---

## API Contracts

### POST `/api/auth/storage`
**Request:**
```json
{
  "provider": "github" | "google",
  "mode": "new" | "existing",
  "name": "repository-or-folder-name"
}
```
**Response (200):**
```json
{
  "success": true,
  "provider": "github",
  "storage": {
    "type": "github",
    "id": "123",
    "name": "my-repo",
    "full_name": "user/my-repo",
    "html_url": "https://github.com/user/my-repo",
    "clone_url": "https://github.com/user/my-repo.git"
  }
}
```

### GET `/api/auth/user`
**Response (200):**
```json
{
  "id": "12345",
  "username": "samuel",
  "email": "sam@example.com",
  "displayName": "Samuel",
  "provider": "github",
  "avatarUrl": "https://...",
  "storage": { /* storage info if configured */ }
}
```

### GET `/api/auth/status`
**Response (200):**
```json
{
  "authenticated": true,
  "user": { "id": "12345", "username": "samuel", ... }
}
```

---

## Environment Variables

```env
# Authentication
SESSION_SECRET=your_super_secret_session_key_min_32_chars
GITHUB_CLIENT_ID=your_github_oauth_app_client_id
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET=your_github_oauth_app_client_secret
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
GITHUB_REDIRECT_URI=http://localhost:3000/api/auth/github/callback

# Encryption (generate with: openssl rand -base64 32)
ENCRYPTION_KEY=your_32_byte_base64_encoded_encryption_key
```

---

## OAuth App Configuration

### GitHub OAuth App
1. Settings → Developer settings → OAuth Apps → New OAuth App
2. Authorization callback URL: `http://localhost:3000/api/auth/github/callback`
3. Scopes: `repo`, `user:email`

### Google OAuth Client
1. Google Cloud Console → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Authorized redirect URI: `http://localhost:3000/api/auth/google/callback`
4. Scopes: `https://www.googleapis.com/auth/drive.file`, `profile`, `email`

---

## Library Usage Notes (Verified)

### GitHub (Octokit)
```js
// ✅ Correct - get repository by owner/repo
const { data } = await octokit.repos.get({ owner, repo });

// ✅ Correct - create repository for authenticated user
await octokit.repos.createForAuthenticatedUser({ name, private: true });

// ✅ Correct - create or update file
await octokit.repos.createOrUpdateFileContents({ owner, repo, path, message, content, branch });
```

### Google Drive (googleapis)
```js
// ✅ Correct - OAuth2 client with access token
const oauth2 = new google.auth.OAuth2();
oauth2.setCredentials({ access_token: decryptedToken });
const drive = google.drive({ version: 'v3', auth: oauth2 });

// ✅ Correct - create folder
await drive.files.create({ resource: { name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] }, fields: 'id,name,webViewLink' });

// ✅ Correct - upload file
await drive.files.create({ resource: { name, parents: [folderId] }, media: { mimeType, body: content }, fields: 'id,name,webViewLink,size' });
```

---

## Acceptance Criteria

- ✅ Users can sign in with GitHub (OAuth flow)
- ✅ Users can sign in with Google (OAuth flow)
- ✅ User sessions remain valid and are handled securely (express-session + secure cookies + encrypted tokens)
- ✅ GitHub repository creation works (Octokit `repos.createForAuthenticatedUser`)
- ✅ Google Drive folder creation works (googleapis `drive.files.create`)
- ✅ Scan results saved to GitHub repo (`repos.createOrUpdateFileContents` to `scans/{hostname}_{timestamp}.json`)
- ✅ Scan results saved to Google Drive folder (`drive.files.create` to folder)
- ✅ Appropriate error messages on auth/storage failures
- ✅ Backend endpoints documented and tested
- ⚠️ **Frontend changes ARE required** — this design includes frontend integration (see TODO.md)

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| `redirect_uri_mismatch` | OAuth callback URL mismatch | Verify `.env` redirect URIs match OAuth app console exactly |
| `InvalidKeyException` / `BadPaddingException` | Invalid encryption key | Ensure `ENCRYPTION_KEY` is 32-byte base64 (`openssl rand -base64 32`) |
| `403 Rate Limit Exceeded` | GitHub/Google API rate limits | Implement exponential backoff, cache tokens |
| `403 Insufficient Permissions` | Missing OAuth scopes | Verify requested scopes match app requirements |
| Session not persisting | Missing `credentials: 'include'` | Ensure all fetch calls include credentials |

---

## Future Enhancements

1. **Database Persistence**: Replace in-memory session with PostgreSQL/MongoDB
2. **Auto Token Refresh**: Background Google token refresh before expiry
3. **Storage Metrics**: Track usage per user
4. **Additional Providers**: Bitbucket, GitLab, Dropbox
5. **Advanced GitHub**: Issues, Projects, Actions integration
6. **Google Workspace**: Sheets/Docs for reports