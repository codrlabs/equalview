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

| Var               | Default                  | Meaning                        |
| ----------------- | ------------------------ | ------------------------------ |
| `PORT`            | `3000`                   | Port the API listens on        |
| `FRONTEND_ORIGIN` | `http://localhost:5173`  | CORS allow-origin for the SPA  |

See [`.env.example`](.env.example) for the full list (Phase 5 adds
`JWT_SECRET` and `DATABASE_URL`).

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
