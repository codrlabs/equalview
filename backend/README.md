# EqualView — Backend

Express API that today serves the mock fixture from
`backend/data/mockScanResults.js`. Phase 2 of the
[project roadmap](../docs/plans/project-roadmap.md) replaces it with a
real Puppeteer + axe-core scanner without changing the HTTP shape.

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
│   ├── axeTransformer.js       # Pure: axe results → API ScanResult shape
│   └── ssrfGuard.js            # Pure: URL allow/deny rules
├── data/
│   └── mockScanResults.js      # Phase-1 fixture
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

| Method | Path                      | Notes                                      |
| ------ | ------------------------- | ------------------------------------------ |
| GET    | `/health`                 | liveness probe                             |
| POST   | `/api/scan`               | run a scan (mock today; axe in Phase 2)    |
| GET    | `/api/scan-results?url=`  | fetch scan results for a URL               |
| GET    | `/problems/:id`           | look up a single problem                   |

## See also

- [`docs/plans/architecture-map.md`](../docs/plans/architecture-map.md) §6 — code architecture
- [`docs/guides/axecore-integration.md`](../docs/guides/axecore-integration.md) — `this`-binding bug pattern
