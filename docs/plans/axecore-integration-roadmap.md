# Axe-Core Integration Roadmap

**Status:** Not started
**Owner:** Eli Iguer
**Reference guide:** [`../guides/axecore-integration.md`](../guides/axecore-integration.md)

## Goal

Replace the hardcoded mock scan response in
`backend/data/mockScanResults.js` with a real Puppeteer + axe-core
scanner, end-to-end, behind the existing API surface
(`POST /api/scan`, `GET /api/scan-results`, `GET /problems/:id`).

## Non-goals (for the first iteration)

- Authentication / accounts
- Persistent storage of scan results
- Queueing, multi-tenant rate limiting
- PDF report generation

These are tracked as later phases below.

## Constraints / decisions to lock in before coding

These are open questions called out during housekeeping. Resolve them in
issues or a design comment before Phase 1.

- [ ] **Routing on the frontend**: keep the `window.location.pathname`
      switch in `App.jsx`, or introduce `react-router` now? Real scans
      will produce shareable URLs, which makes a router more attractive.
- [ ] **Scan response shape**: keep the current
      `{ problems: { visualAccessibility, structureAndSemantics, multimedia }, whatsGood }`
      shape, or expose raw axe-core categories (violations, passes,
      incomplete, inapplicable) and let the UI bucket them?
- [ ] **Sync vs async API**: does `POST /api/scan` block until the scan
      finishes (simpler), or return a job id that the client polls
      (better UX for slow sites)? First iteration: sync, with a
      generous timeout.
- [ ] **URL allow/deny policy**: at minimum block private IP ranges and
      `file://`/`data:` URLs to prevent SSRF.

## File layout (target)

These paths are referenced by the integration guide and should be
created during Phase 1:

```
backend/
├── controllers/
│   └── scanController.js       # request handling + Puppeteer driver
├── services/
│   └── axeTransformer.js       # axe-core results → frontend shape
├── routes/
│   └── scan.js                 # express.Router for /api/scan*
├── data/
│   └── mockScanResults.js      # kept as a fixture for tests
├── tests/
│   └── scan.test.js
├── Dockerfile
└── .env.example                # committed; .env stays gitignored
```

## Phases

### Phase 1 — Wire up a real scanner (MVP)

- [ ] Add `puppeteer` and `axe-core` to `backend/package.json`; pin
      versions
- [ ] Create `backend/controllers/scanController.js` with URL validation
      and an SSRF guard (reject non-http(s), private IPs, localhost)
- [ ] Create `backend/services/axeTransformer.js`; cover the mapping in
      `backend/tests/`
- [ ] Extract routes into `backend/routes/scan.js`; mount from
      `index.js`
- [ ] Add `backend/Dockerfile` (must include the system libs Puppeteer's
      bundled Chromium needs)
- [ ] Add `backend/.env.example` documenting `PORT`,
      `FRONTEND_ORIGIN`, etc.
- [ ] Update `docker-compose.yml` with the backend service
- [ ] Frontend: keep using the existing endpoints; no shape change if
      possible
- [ ] Smoke-test against a known-bad page (e.g. a page with missing
      alts and low contrast) and a known-clean page

**Done when:** `POST /api/scan { url }` returns real axe-core results
in the existing shape, and `mockScanResults.js` is only referenced from
tests.

### Phase 2 — Reliability

- [ ] Per-request timeout for `page.goto` and overall scan budget
- [ ] Concurrency cap on Puppeteer instances
- [ ] Structured logging (URL, duration, violation counts, error class)
- [ ] Friendly error responses for the most common failures
      (DNS failure, navigation timeout, HTTP error status)
- [ ] Backend test suite wired into CI (Jest or Vitest + supertest)

### Phase 3 — UX upgrades

- [ ] Decide router question above; if yes, migrate `App.jsx`
- [ ] Loading + progress UI on the scan page (replace the 1.2 s
      `setTimeout` in the landing page)
- [ ] Surface axe-core `incomplete` results as a "needs manual review"
      bucket
- [ ] Link each problem to its `helpUrl`

### Phase 4 — Productionization

- [ ] Caching of scan results by URL (with TTL)
- [ ] Rate limiting per IP
- [ ] Background job queue (e.g. BullMQ) for slow sites
- [ ] Persistence (Postgres) for scan history
- [ ] Authentication (JWT) for scan endpoints
- [ ] PDF report generation

## Risks / things that have bitten us before

- **Puppeteer in Docker**: Alpine images frequently miss Chromium
  dependencies. Either install them or use a Debian-based base image.
- **CORS**: backend currently only allows `http://localhost:5173`. Any
  deployment will need this to be config-driven via `FRONTEND_ORIGIN`.
- **`this` binding in controller**: the integration guide previously
  shipped a bug where `req.body` destructuring lost `this` on
  `scanWebsite`; bind the route handler or use an arrow method.
