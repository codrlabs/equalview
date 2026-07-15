# Vizably — Backend

Express API that runs real accessibility scans: `services/scanRunner.js`
drives a headless Chromium via Puppeteer, injects axe-core into the
target page, and returns results transformed into the shared
`ScanResult` shape. The mock fixture in `backend/data/mockScanResults.js`
remains only as the data source for the legacy `/problems/:id` lookup
and for tests.

## Layout

```
backend/
├── index.js                    # Bootstrap: builds app, listens on $PORT
├── app.js                      # Composition root (DI wiring)
├── routes/
│   ├── index.js                # Mount /api/auth, /api, and /problems routers
│   ├── auth.js                 # OAuth + storage picker API
│   ├── scan.js                 # POST /api/scan, GET /api/scan-results
│   └── problems.js             # GET /problems/:id
├── controllers/
│   └── scanController.js       # Request/response only — class with bound methods
├── services/
│   ├── authService.js          # Passport, sessions, token encryption
│   ├── storageService.js       # Portable-account GitHub adapter
│   ├── scanRunner.js           # Puppeteer + axe-core scan lifecycle
│   ├── axeTransformer.js       # Pure: axe results → API ScanResult shape
│   └── ssrfGuard.js            # Pure: URL allow/deny rules
├── data/
│   └── mockScanResults.js      # Legacy fixture (problems route + tests)
├── tests/                      # node:test + supertest
│   ├── health.test.js
│   ├── scan.test.js
│   ├── ssrfGuard.test.js
│   └── axeTransformer.test.js
├── .env.example
├── Dockerfile
└── package.json
```

## Run

```bash
cd backend
npm install
npm run dev      # nodemon
npm start        # plain node
npm test         # node --test
```

API is on `http://localhost:3000` by default.

## Environment

Copy [`.env.example`](.env.example) to `.env` and fill in values before running
auth (Phase 1).

| Var                      | Default                  | Meaning                                      |
| ------------------------ | ------------------------ | -------------------------------------------- |
| `PORT`                   | `3000`                   | Port the API listens on                      |
| `FRONTEND_ORIGIN`        | `http://localhost:5173`  | CORS allow-origin for the SPA                |
| `SESSION_SECRET`         | —                        | Session cookie signing key (min 32 chars)    |
| `GITHUB_APP_CLIENT_ID`   | —                        | GitHub App OAuth **Client ID**               |
| `GITHUB_APP_CLIENT_SECRET` | —                      | GitHub App OAuth **Client secret**           |
| `GITHUB_REDIRECT_URI`    | `http://localhost:3000/api/auth/github/callback` | GitHub OAuth callback URL |
| `ENCRYPTION_KEY`         | —                        | AES-256-GCM key for tokens at rest (base64)  |

Generate secrets (required — the server refuses to start without both):

```bash
openssl rand -base64 32   # SESSION_SECRET and/or ENCRYPTION_KEY
```

`index.js` throws on startup if either is missing. Tests inject their own values
via `tests/helpers/testEnv.js`; never commit real secrets to the repo.

**Phase 1 limitation — in-memory sessions:** `express-session` uses the default
MemoryStore. Restarts log everyone out; multiple server instances do not share
sessions. Switch to a persistent store (Redis, etc.) before production deploy.

Google OAuth and `GOOGLE_PICKER_API_KEY` are deferred to Phase 3 — not read by
the server yet. Phase 5 placeholders (`JWT_SECRET`, `DATABASE_URL`) remain in
[`.env.example`](.env.example) comments only.

### GitHub App setup (Phase 1)

Phase 0 locked **GitHub App** (not a classic OAuth App) for least-privilege,
per-repo access. For local development, **each developer creates their own
personal GitHub App** and puts the credentials in `backend/.env` — nothing is
shared via the repo.

**Local dev (do this now)**

1. GitHub → **Settings → Developer settings → GitHub Apps → New GitHub App**.
2. Set **Callback URL** to `http://localhost:3000/api/auth/github/callback`.
3. Under **Permissions**, grant at least **Contents: Read & write** and
   **Metadata: Read** (per the auth/storage design).
4. Create the app, then open **OAuth credentials** and copy the **Client ID**
   and generate a **Client secret**.
5. Add to `backend/.env`:
   - `GITHUB_APP_CLIENT_ID` — the OAuth Client ID (not the numeric App ID)
   - `GITHUB_APP_CLIENT_SECRET`
   - `GITHUB_REDIRECT_URI=http://localhost:3000/api/auth/github/callback`
   - `SESSION_SECRET` and `ENCRYPTION_KEY` (see above)

Install the app on your account and select the repos you want to test with when
prompted during sign-in.

**Production (TBD — finalize before shipping Vizably)**

The personal apps above are for **testing only**. Before Vizably runs on a
real domain, the team must register a **project-owned GitHub App** (under the
codrlabs/vizably org or equivalent) with:

- Production callback URL(s) on the deployed backend (e.g.
  `https://api.vizably.example/api/auth/github/callback`)
- The same permission model (`Contents: rw`, `Metadata: r`)
- Client ID/secret stored in deployment secrets — **never** committed to git

See also [`docs/guides/auth_storage_guide/githubGoogleAuthStorageImplementation.md`](../docs/guides/auth_storage_guide/githubGoogleAuthStorageImplementation.md) § OAuth App Configuration.

## Endpoints

| Method | Path                      | Notes                                          |
| ------ | ------------------------- | ---------------------------------------------- |
| GET    | `/health`                 | liveness probe                                 |
| GET    | `/api/auth/github`        | start GitHub OAuth                             |
| GET    | `/api/auth/github/callback` | GitHub OAuth callback                        |
| GET    | `/api/auth/google`        | stub (501) until Phase 3                       |
| GET    | `/api/auth/storages`      | list GitHub repos (`?provider=github`)         |
| POST   | `/api/auth/storage/validate` | fit-check selected storage                  |
| POST   | `/api/auth/storage`       | load or init account storage                   |
| GET    | `/api/auth/user`          | current user profile (no tokens)               |
| GET    | `/api/auth/status`        | `{ authenticated, user }`                      |
| POST   | `/api/auth/logout`        | end session                                    |
| POST   | `/api/scan`               | run a live Puppeteer + axe-core scan           |
| GET    | `/api/scan-results?url=`  | re-run a scan for a URL (used by deep links)   |
| GET    | `/problems/:id`           | look up a single problem (legacy mock lookup)  |

## See also

- [`docs/plans/architecture-map.md`](../docs/plans/architecture-map.md) §6 — code architecture
- [`docs/guides/axecore-integration.md`](../docs/guides/axecore-integration.md) — `this`-binding bug pattern
