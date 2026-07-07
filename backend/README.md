# EqualView — Backend

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
│   ├── index.js                # Mount /api and /problems routers
│   ├── scan.js                 # POST /api/scan, GET /api/scan-results
│   └── problems.js             # GET /problems/:id
├── controllers/
│   └── scanController.js       # Request/response only — class with bound methods
├── services/
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
| `GITHUB_APP_ID`          | —                        | GitHub App id (OAuth registration)           |
| `GITHUB_APP_CLIENT_SECRET` | —                      | GitHub App OAuth client secret               |
| `GITHUB_REDIRECT_URI`    | `http://localhost:3000/api/auth/github/callback` | GitHub OAuth callback URL |
| `ENCRYPTION_KEY`         | —                        | AES-256-GCM key for tokens at rest (base64)  |

Generate secrets:

```bash
openssl rand -base64 32   # SESSION_SECRET and/or ENCRYPTION_KEY
```

Google OAuth and `GOOGLE_PICKER_API_KEY` are deferred to Phase 3 — not read by
the server yet. Phase 5 placeholders (`JWT_SECRET`, `DATABASE_URL`) remain in
[`.env.example`](.env.example) comments only.

## Endpoints

| Method | Path                      | Notes                                          |
| ------ | ------------------------- | ---------------------------------------------- |
| GET    | `/health`                 | liveness probe                                 |
| POST   | `/api/scan`               | run a live Puppeteer + axe-core scan           |
| GET    | `/api/scan-results?url=`  | re-run a scan for a URL (used by deep links)   |
| GET    | `/problems/:id`           | look up a single problem (legacy mock lookup)  |

## See also

- [`docs/plans/architecture-map.md`](../docs/plans/architecture-map.md) §6 — code architecture
- [`docs/guides/axecore-integration.md`](../docs/guides/axecore-integration.md) — `this`-binding bug pattern
