# EqualView — Post-Reorg Architecture Walkthrough

**Baseline commit:** `8f72a1f` (pre-reorg).
**Tip commit:** `f750962` (current `main`).
**Window covered:** 18 commits, 9 PRs (#35–#41), `+3505 / −906` lines
across 49 files.

This document explains, briefly, **what each folder does, why it
exists, and how a new feature would slot into the architecture**. It
is not a task list — concrete tasks live in
[`docs/plans/project-roadmap.md`](../plans/project-roadmap.md).

Companion docs:

- [`docs/plans/codebase-reorganization.md`](../plans/codebase-reorganization.md)
  — engineer-facing post-mortem of the same overhaul.
- [`docs/plans/architecture-map.md`](../plans/architecture-map.md)
  — per-screen architecture and target code shape (§6).
- [`docs/plans/project-roadmap.md`](../plans/project-roadmap.md)
  — phased plan and tasks.
- [`docs/plans/axecore-integration-roadmap.md`](../plans/axecore-integration-roadmap.md)
  — sub-roadmap for replacing the mock scanner.

---

## 1. The 30-second pitch

EqualView does one thing end-to-end:

1. The user pastes a URL on the **landing page**.
2. The backend (eventually) loads that page in a headless browser and
   runs [axe-core](https://github.com/dequelabs/axe-core) against it.
3. The user lands on a **results screen** showing accessibility issues,
   grouped and prioritized, with a help link per issue.

Today the backend serves a **mock fixture** instead of running a real
scanner — that lands in Phase 2. Everything else (routing, HTTP shape,
UI flow, validation) is real.

---

## 2. What changed since `8f72a1f`

Nine PRs landed between `8f72a1f` and `f750962`, in three buckets.

### 2.1 Phase 0 — Housekeeping (PRs #35, #36, #37)

- Renamed `frontend/src/_tests_/` → `frontend/src/__tests__/` (Vitest
  convention).
- Deleted dead UI: `frontend/src/_tests_/doc/test.md`, the unused
  `landingPage.test.jsx`, and pieces of `ScanResults.jsx` that were no
  longer reachable.
- Renamed the Obsidian canvas `Healcode.canvas` → `equalview.canvas`.
- Removed the stale `docs/guides/architecture.md` (replaced by
  `docs/plans/architecture-map.md`).
- Fixed README references that still mentioned **Jest** — the frontend
  uses **Vitest**.
- Added [`architecture-map.md`](../plans/architecture-map.md) and
  [`project-roadmap.md`](../plans/project-roadmap.md). These two are
  the source of truth for everything that follows.

### 2.2 Phase 1 — Backend reorganization (PR #38)

`backend/index.js` used to be a 50-line "god file" that parsed CORS,
declared routes, and listened on a port. It is now split by
responsibility (see §3.1). Headline rules locked in:

- One responsibility per file.
- Composition root pattern — only `backend/app.js` calls `new ...()`.
- `this`-binding solved in the controller's constructor.
- SSRF guard runs before any side effect.
- Tests use `buildApp()` + `supertest` (no port binding).

### 2.3 Phase 3 — Frontend router + state hooks (PR #40)

The frontend used to switch screens by reading
`window.location.pathname` in `App.jsx` and reload the whole page on
"scan". Now it uses `react-router-dom` v7 and a layered file layout
(see §3.2). Headline rules locked in:

- Pages own layout, hooks own state, components own UI primitives.
- `lib/apiClient.js` is the only file that imports `fetch`.
- Hooks return `{ data, loading, error }`.
- URL state is the source of truth for shareability.

### 2.4 Shared types (PR #38)

New top-level [`shared/types.js`](file:///c%3A/Users/nidal/Documents/GitHub/codrlabs/open-solutions/equalview/shared/types.js)
holds JSDoc typedefs (`Problem`, `ScanResult`, `Impact`; planned
`User`, `StoredScan`). Backend (CJS) and frontend (ESM) reference it
the same way. **The wire shape is documented once.**

### 2.5 Docs (PRs #35, #39, #41)

Added [`architecture-map.md`](../plans/architecture-map.md),
[`project-roadmap.md`](../plans/project-roadmap.md), and
[`codebase-reorganization.md`](../plans/codebase-reorganization.md);
PR #41 refreshed all four plan docs to the post-reorg state.

---

## 3. Folder-by-folder tour

```
equalview/
├── backend/        Express API (Node 22)
├── frontend/       React 19 + Vite 7 SPA
├── shared/         JSDoc types referenced by both sides
├── docs/           guides, plans, research
├── docker-compose.yml
└── README.md
```

### 3.1 `backend/` — the Express API

```
backend/
├── index.js              bootstrap: load .env, build app, listen on $PORT
├── app.js                composition root — the ONE place we new() things
├── routes/               HTTP shape only (URLs, verbs)
│   ├── index.js          mounts /api and /problems
│   ├── scan.js           POST /api/scan, GET /api/scan-results
│   └── problems.js       GET /problems/:id
├── controllers/
│   └── scanController.js request/response; class with bound methods
├── services/             pure modules — no req/res, no I/O
│   ├── axeTransformer.js axe results → ScanResult shape (stub for Phase 2)
│   └── ssrfGuard.js      URL allow/deny rules (rejects loopback + RFC1918)
├── data/
│   └── mockScanResults.js Phase-1 fixture; goes away in Phase 2
├── tests/                node:test + supertest
├── .env.example          PORT, FRONTEND_ORIGIN
├── Dockerfile            node:22-alpine
├── README.md
└── package.json
```

The split is a classic **route → controller → service → data**
pipeline. The reasons each layer exists:

- **`index.js` and `app.js`** are split so tests can build a fully
  wired Express instance (`buildApp()`) without binding a port.
- **`routes/`** files only know URL shapes and HTTP verbs. They never
  parse `req.body`, never call services. That keeps the URL surface
  reviewable in a glance.
- **`controllers/`** translate between HTTP and the domain. They run
  cheap validations (like the SSRF guard), call into services, and
  return JSON. Methods are bound in the constructor so they survive
  being passed as router callbacks (this was a real bug pattern —
  see [`axecore-integration.md`](axecore-integration.md)).
- **`services/`** are *pure*: same input → same output, no `req`,
  `res`, `process.env`, `fetch`, or DB. That makes them trivially
  unit-testable and lets Phase 2 drop in a real scanner without
  touching anything above.
- **`data/`** is just data. The mock fixture lives here so the
  controller doesn't pretend to load it.

### 3.2 `frontend/` — the React SPA

```
frontend/src/
├── main.jsx                 React bootstrap
├── App.jsx                  BrowserRouter + Routes (17 lines)
├── pages/                   one file per screen
│   ├── LandingPage.jsx      "/"
│   ├── ScanResultsPage.jsx  "/scan-results?url=..."
│   └── ProblemPage.jsx      "/problems/:id"
├── components/              reusable UI primitives — no fetch, no router
│   ├── ProblemSolutionPage.jsx
│   ├── ProblemCategoryBox.jsx
│   └── WhatsGood.jsx
├── hooks/                   { data, loading, error } state machines
│   ├── useScan.js           GET /api/scan-results?url=...
│   └── useProblem.js        GET /problems/:id
├── lib/
│   └── apiClient.js         ★ the only file that imports `fetch`
├── utils/
│   └── urlValidator.js      pure: parseable + http(s) check
├── data/
│   └── mockScanResults.js   test-only fixture
├── styles/                  per-screen CSS
├── __tests__/               Vitest + React Testing Library
└── setupTests.js
```

The split mirrors the backend's intent: each file does one thing.

- **`pages/`** own *what the screen looks like and which router
  primitives it uses* (e.g. `useSearchParams`, `useParams`,
  `useNavigate`). They never touch `fetch` directly.
- **`components/`** are dumb UI primitives. They take props, render
  markup, and emit events. They don't know about routing or fetching.
- **`hooks/`** own the *async state machine* — loading, error, data.
  They take dependencies (the API client) so tests can stub them. The
  uniform return shape `{ data, loading, error }` means every page
  consumes results the same way.
- **`lib/apiClient.js`** is the single boundary to the network.
  Everywhere else imports the singleton; tests substitute a fake.
- **`utils/`** are pure helpers (e.g.
  [`isValidUrl`](file:///c%3A/Users/nidal/Documents/GitHub/codrlabs/open-solutions/equalview/frontend/src/utils/urlValidator.js)).
- **`styles/`** is CSS, scoped per screen.

### 3.3 `shared/` — the wire-shape contract

```
shared/
└── types.js     JSDoc Problem / ScanResult / Impact (+ planned User/StoredScan)
```

Both halves of the app reference the same typedefs:

- Backend (CJS): `@typedef {import('../../shared/types.js').ScanResult}`
- Frontend (ESM): `@typedef {import('../../../shared/types.js').ScanResult}`

The folder has **one rule**: it is dependency-free. Nothing in
`shared/` may `require()` or `import` anything outside `shared/`.
That keeps it consumable from both sides without cycles.

### 3.4 `docs/`

```
docs/
├── README.md
├── guides/                  how-to + onboarding
├── plans/                   tracked roadmaps and post-mortems
└── research/                Obsidian canvas + scratch notes
```

Convention: **`guides/`** is durable how-to content; **`plans/`** is
where roadmaps and architecture maps live; **`research/`** is the
"thinking out loud" area that may or may not survive.

### 3.5 Top level

- [`docker-compose.yml`](file:///c%3A/Users/nidal/Documents/GitHub/codrlabs/open-solutions/equalview/docker-compose.yml)
  — frontend on `:5173`, backend on `:3000`, both with hot-reload
  bind mounts. `FRONTEND_ORIGIN` is plumbed into the backend so CORS
  is configurable.
- `AGENTS.md` / `CLAUDE.md` — agent guidance (GitNexus, etc.).

---

## 4. How the pieces talk to each other

### 4.1 The picture at a glance

Before the call-chain trees in §4.2 and §4.3, here is the **whole
app on one screen**: three layers per side, one HTTP boundary in the
middle, one shared typedef underneath. Every feature in this
codebase is a variation on this picture.

```
        FRONTEND                         ║                  BACKEND
        ────────                         ║                  ───────
                                         ║
   ┌──────────────┐                      ║              ┌──────────────┐
   │     page     │                      ║              │    route     │
   └──────┬───────┘                      ║              └──────┬───────┘
          │                              ║                     │
   ┌──────▼───────┐                      ║              ┌──────▼───────┐
   │     hook     │ ─── request URL ───▶ ║ ─ POST/GET ─▶│  controller  │
   └──────┬───────┘                      ║              └──────┬───────┘
          │                              ║                     │
   ┌──────▼───────┐                      ║              ┌──────▼───────┐
   │   apiClient  │ ◀──── JSON body ──── ║ ◀ res.json ──│   service    │
   └──────────────┘                      ║              └──────┬───────┘
                                         ║                     ▼
                                         ║          data/  or  external world
                                         ║          (mock fixture today,
                                         ║           Puppeteer + axe in Phase 2)

         shared/types.js  ─  one ScanResult typedef, both sides import it
```

Read it like this:

- **Each side stacks three layers.** Page calls hook calls
  apiClient on the frontend; route delegates to controller delegates
  to service on the backend. Each box has one job and only talks to
  the one above and below it.
- **One boundary.** The only thing that crosses between frontend and
  backend is HTTP. `lib/apiClient.js` is the only file on the
  frontend that does it; `routes/` is the only place on the backend
  that receives it.
- **One contract underneath.** `shared/types.js` is the wire shape
  both sides agree on. Wire-shape changes start there (§4.5).
- **One pluggable spot.** The `data / external world` block is the
  only thing that swaps in Phase 2: the mock fixture goes away, the
  scanner takes its place, and *no other box on the diagram moves*.

### 4.2 Scan flow (the happy path the GitNexus graph confirms)

```
LandingPage.jsx
  ├─ isValidUrl(url)              ← utils/urlValidator.js
  └─ navigate("/scan-results?url=…")
        │
        ▼
ScanResultsPage.jsx
  ├─ useSearchParams() → url
  └─ useScan(url)                 ← hooks/useScan.js
        │
        ▼
useScan
  └─ apiClient.getScanResults(url)
        │
        ▼
ApiClient.getScanResults
  └─ this._request("/api/scan-results?url=…")
        │
        ▼ HTTP GET
Express /api/scan-results
  └─ routes/scan.js
        │
        ▼
ScanController.getScanResults
  ├─ ssrfGuard.validate(url)      ← services/ssrfGuard.js
  └─ res.json(mockScanResults)    ← Phase-2 will call runner.run(url) here
```

This is exactly the process GitNexus traces:
`ScanResultsPage → useScan → getScanResults → _request`.

### 4.3 Problem-detail flow

```
ProblemPage.jsx ("/problems/:id")
  ├─ useParams() → id
  └─ useProblem(id)               ← hooks/useProblem.js
        │
        ▼
useProblem
  └─ apiClient.getProblem(id)
        │
        ▼ HTTP GET /problems/:id
ScanController.getProblem
  └─ flatten mockScanResults.problems → find by id → res.json(problem)
```

`ScanResultsPage` *also* shows a problem detail in-page (when the user
clicks a card) by reusing `<ProblemSolutionPage>`. The `/problems/:id`
route exists so the detail view is **shareable** and survives a
refresh.

### 4.4 Backend wiring (the composition root)

[`backend/app.js`](file:///c%3A/Users/nidal/Documents/GitHub/codrlabs/open-solutions/equalview/backend/app.js)
is the single point that knows about concrete classes:

```js
const scanController = new ScanController({ mockScanResults, ssrfGuard });
mountRoutes(app, { scanController });
return app;
```

When Phase 2 ships, **only this file changes** to inject a real
scanner. Routes, controller signatures, hooks, pages, and the wire
shape stay the same. That property is the whole point of the reorg.

### 4.5 Type contract

Wire-shape changes start in [`shared/types.js`](file:///c%3A/Users/nidal/Documents/GitHub/codrlabs/open-solutions/equalview/shared/types.js).
The transformer and consumers follow. Never the other way around.

---

## 5. Walkthrough — adding a feature end-to-end

This section is the part to read carefully. It teaches **how to use
the architecture in practice** by walking through a real change one
file at a time. The examples track the existing conventions exactly,
so you can copy the patterns when adding similar features.

The example feature: **"On the landing page, show a list of past URLs
the user has scanned. Clicking one re-opens its results."**

It's a good teaching example because it touches every layer of the
app in the obvious order: `shared/` first, then backend
(data → service → controller → route → composition root → tests),
then frontend (apiClient → hook → component → page → tests). Skip
nothing — every layer has a reason to be there, and skipping one is
how this architecture starts to rot.

### Step 1 — define the wire shape in `shared/types.js`

Wire-shape changes always start here. Anything backend and frontend
both need to agree on (request bodies, response shapes, domain
objects) is documented as a JSDoc typedef. Nothing in `shared/` is
allowed to import from `backend/` or `frontend/`.

```js
// shared/types.js — append a new typedef

/**
 * A persisted record that the user once asked us to scan.
 *
 * @typedef {object} ScanHistoryEntry
 * @property {string} id          stable id, e.g. a UUID
 * @property {string} url         the URL that was scanned
 * @property {string} createdAt   ISO 8601 timestamp
 */
```

Then the response shape for the new endpoint goes in the same file
(`{ entries: ScanHistoryEntry[] }`). After this step, both halves of
the app can reference `ScanHistoryEntry` via
`@typedef {import('.../shared/types.js').ScanHistoryEntry}` exactly
the way `apiClient.js` and `axeTransformer.js` already do.

> Why first? Because if you start in the controller, you'll invent a
> shape that doesn't match what the page wants, and you'll discover
> the mismatch only when the test fails. Pin the contract first.

### Step 2 — backend data layer (`backend/data/`)

`data/` is just data. For Phase-1-grade work an in-memory module is
fine — Phase 5 will swap it for Postgres without changing its
interface.

```js
// backend/data/scanHistoryStore.js
/**
 * Tiny in-memory store. Replaced by a real DB in Phase 5; the
 * exported shape stays the same.
 *
 * @typedef {import('../../shared/types.js').ScanHistoryEntry} ScanHistoryEntry
 */

/** @type {ScanHistoryEntry[]} */
const entries = [];

module.exports = {
  /** @returns {ScanHistoryEntry[]} */
  list: () => entries.slice(),
  /** @param {ScanHistoryEntry} entry */
  add: (entry) => { entries.unshift(entry); },
};
```

Note what this file does *not* do: it does not validate input, it
does not return HTTP-shaped errors, it does not know about
`express`. Storage stays storage.

### Step 3 — backend service layer (`backend/services/`)

Services are **pure** — same input, same output, no `req`, no `res`,
no globals. Anything that's "business logic" but not "the database"
goes here.

```js
// backend/services/scanHistory.js
/**
 * Scan history orchestration: builds entries, dedupes by URL,
 * and exposes a list view. Pure aside from the injected store.
 *
 * @typedef {import('../../shared/types.js').ScanHistoryEntry} ScanHistoryEntry
 */

/**
 * @param {{ store: { list: () => ScanHistoryEntry[],
 *                    add: (e: ScanHistoryEntry) => void },
 *          uuid?: () => string,
 *          now?: () => Date }} deps
 */
function createScanHistory({ store, uuid = crypto.randomUUID, now = () => new Date() }) {
  return {
    /** @returns {ScanHistoryEntry[]} */
    list() {
      return store.list();
    },
    /**
     * @param {string} url
     * @returns {ScanHistoryEntry}
     */
    record(url) {
      const entry = { id: uuid(), url, createdAt: now().toISOString() };
      store.add(entry);
      return entry;
    },
  };
}

module.exports = { createScanHistory };
```

Two things to notice:

1. **Dependencies are passed in.** That's the same pattern
   [`scanController.js`](file:///c%3A/Users/nidal/Documents/GitHub/codrlabs/open-solutions/equalview/backend/controllers/scanController.js)
   uses. Tests inject a fake store, a deterministic `uuid`, and a
   frozen `now`. No mocking framework needed.
2. **The factory returns plain methods.** It is the *composition
   root* in `app.js` that decides which store to plug in. The service
   never reaches out and instantiates anything.

### Step 4 — backend controller (`backend/controllers/`)

The controller is the only layer that knows about `req` / `res`. It
runs cheap validations, calls into services, and serializes JSON. It
does **not** contain business logic.

Edit [`scanController.js`](file:///c%3A/Users/nidal/Documents/GitHub/codrlabs/open-solutions/equalview/backend/controllers/scanController.js):

```js
class ScanController {
  constructor({ mockScanResults, ssrfGuard, scanHistory }) {
    this.mockScanResults = mockScanResults;
    this.ssrfGuard = ssrfGuard;
    this.scanHistory = scanHistory;          // ← new dependency

    // Bind once so router wiring stays clean.
    this.postScan = this.postScan.bind(this);
    this.getScanResults = this.getScanResults.bind(this);
    this.getProblem = this.getProblem.bind(this);
    this.listHistory = this.listHistory.bind(this);   // ← new
  }

  postScan(req, res) {
    const { url } = req.body || {};
    if (this.ssrfGuard) {
      const guard = this.ssrfGuard.validate(url);
      if (!guard.ok) return res.status(400).json({ error: guard.reason });
    }
    if (this.scanHistory) this.scanHistory.record(url);   // ← record on success
    return res.json(this.mockScanResults);
  }

  /** GET /api/scan-history */
  listHistory(_req, res) {
    return res.json({ entries: this.scanHistory.list() });
  }

  // existing getScanResults + getProblem unchanged
}
```

Three things this snippet demonstrates that you should always do:

- Methods are bound in the constructor. This is the documented
  fix for the [`this`-binding bug](axecore-integration.md). Never
  rely on `.bind` at the call site or arrow methods on the instance.
- New methods are added by extending the constructor object — not by
  importing the service inside the file. The controller does not
  decide which service implementation it talks to.
- Cheap validation (the SSRF guard) runs **before** any side effect.

### Step 5 — backend route (`backend/routes/`)

Routers contain only `router.METHOD(path, controller.method)`. No
parsing, no validation, no logic. Edit
[`routes/scan.js`](file:///c%3A/Users/nidal/Documents/GitHub/codrlabs/open-solutions/equalview/backend/routes/scan.js):

```js
function makeScanRouter(controller) {
  const router = Router();
  router.post('/scan', controller.postScan);
  router.get('/scan-results', controller.getScanResults);
  router.get('/scan-history', controller.listHistory);   // ← new line
  return router;
}
```

That's the entire route change. If your "route file change" is
bigger than one line per endpoint, it doesn't belong here.

### Step 6 — wire it up in the composition root (`backend/app.js`)

[`app.js`](file:///c%3A/Users/nidal/Documents/GitHub/codrlabs/open-solutions/equalview/backend/app.js)
is the **only** file that constructs concrete classes. New
dependencies show up here and nowhere else.

```js
const ScanController = require('./controllers/scanController');
const mountRoutes = require('./routes');
const ssrfGuard = require('./services/ssrfGuard');
const mockScanResults = require('./data/mockScanResults');
const scanHistoryStore = require('./data/scanHistoryStore');         // ← new
const { createScanHistory } = require('./services/scanHistory');     // ← new

function buildApp(overrides = {}) {
  const app = express();
  /* ...cors + json + /health unchanged... */

  const scanHistory =
    overrides.scanHistory ||
    createScanHistory({ store: overrides.scanHistoryStore || scanHistoryStore });

  const scanController =
    overrides.scanController ||
    new ScanController({
      mockScanResults: overrides.mockScanResults || mockScanResults,
      ssrfGuard:       overrides.ssrfGuard       || ssrfGuard,
      scanHistory,                                                   // ← new
    });

  mountRoutes(app, { scanController });
  return app;
}
```

The `overrides` parameter is what makes the rest of the app
testable. A test that wants a fixed clock and an empty in-memory
store passes both in and asserts on the resulting JSON — no globals,
no monkey-patching.

### Step 7 — backend tests

There are two kinds of tests, matching the two kinds of code.

**Pure-service test** (no Express) — mirrors
[`ssrfGuard.test.js`](file:///c%3A/Users/nidal/Documents/GitHub/codrlabs/open-solutions/equalview/backend/tests/ssrfGuard.test.js):

```js
// backend/tests/scanHistory.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { createScanHistory } = require('../services/scanHistory');

test('records and lists entries newest-first', () => {
  const entries = [];
  const store = { list: () => entries.slice(), add: (e) => entries.unshift(e) };
  const history = createScanHistory({
    store,
    uuid: (() => { let n = 0; return () => `id-${++n}`; })(),
    now: () => new Date('2026-01-01T00:00:00Z'),
  });

  history.record('https://a.test');
  history.record('https://b.test');

  const list = history.list();
  assert.equal(list.length, 2);
  assert.equal(list[0].url, 'https://b.test');
  assert.equal(list[0].id, 'id-2');
});
```

**HTTP test** (full app) — mirrors
[`scan.test.js`](file:///c%3A/Users/nidal/Documents/GitHub/codrlabs/open-solutions/equalview/backend/tests/scan.test.js):

```js
test('POST /api/scan records to history and GET /api/scan-history returns it', async () => {
  const app = buildApp();
  await request(app).post('/api/scan').send({ url: 'https://example.com' });

  const res = await request(app).get('/api/scan-history');
  assert.equal(res.status, 200);
  assert.equal(res.body.entries.length, 1);
  assert.equal(res.body.entries[0].url, 'https://example.com');
});
```

Tests use `buildApp()` and `supertest` — never a real port, never a
real network call.

### Step 8 — frontend API client (`frontend/src/lib/apiClient.js`)

`apiClient.js` is **the only file in the frontend that imports
`fetch`**. To expose the new endpoint, add one method:

```js
/**
 * @returns {Promise<{ entries: ScanHistoryEntry[] }>}
 */
listScanHistory() {
  return this._request('/api/scan-history')
}
```

That's it — no other frontend file is allowed to call `fetch`. If
you later need to test loading/error behaviour, `_request` already
throws a typed `Error` on non-2xx, so consumers don't repeat that
logic.

### Step 9 — frontend hook (`frontend/src/hooks/`)

Every async data source on the frontend has a hook with the
**uniform `{ data, loading, error }` return shape**. Pages stay
small because they don't manage that state machine themselves.

This file is a copy of
[`useScan.js`](file:///c%3A/Users/nidal/Documents/GitHub/codrlabs/open-solutions/equalview/frontend/src/hooks/useScan.js)
with one method swapped:

```js
// frontend/src/hooks/useScanHistory.js
import { useEffect, useState } from 'react'
import { apiClient } from '../lib/apiClient'

/**
 * @typedef {import('../../../shared/types.js').ScanHistoryEntry} ScanHistoryEntry
 */

/**
 * @param {{ client?: typeof apiClient }} [opts]
 * @returns {{ data: ScanHistoryEntry[]|null, loading: boolean, error: string|null }}
 */
export function useScanHistory({ client = apiClient } = {}) {
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    client.listScanHistory()
      .then((res) => { if (!cancelled) setState({ status: 'ready', data: res.entries }) })
      .catch((err) => { if (!cancelled) setState({ status: 'error', error: err.message }) })
    return () => { cancelled = true }
  }, [client])

  return {
    data: state.status === 'ready' ? state.data : null,
    loading: state.status === 'loading',
    error: state.status === 'error' ? state.error : null,
  }
}
```

Two patterns to keep:

- The API client is **injected**, defaulted to the singleton. Tests
  pass a fake; production code does not.
- `setState` is only called inside the async resolutions, never
  synchronously inside the effect. This is the React 19
  `react-hooks/set-state-in-effect` rule the existing hooks already
  follow.

### Step 10 — frontend component (`frontend/src/components/`)

Components in this codebase are **presentational**. They take props,
render markup, emit events. They do not fetch, they do not navigate,
they do not own data state.

```jsx
// frontend/src/components/ScanHistoryList.jsx
/**
 * @param {{ entries: import('../../../shared/types.js').ScanHistoryEntry[],
 *           onSelect: (url: string) => void }} props
 */
export default function ScanHistoryList({ entries, onSelect }) {
  if (!entries || entries.length === 0) return null
  return (
    <ul className="scan-history-list" aria-label="Recent scans">
      {entries.map((e) => (
        <li key={e.id}>
          <button type="button" onClick={() => onSelect(e.url)}>
            {e.url}
          </button>
        </li>
      ))}
    </ul>
  )
}
```

This component does not know `useScanHistory` exists. That's the
point — it's reusable from any page that has the data.

### Step 11 — wire it into the page (`frontend/src/pages/LandingPage.jsx`)

Pages own *what the screen looks like and which router primitives it
uses*. They consume hooks for data and components for markup.

```jsx
// inside LandingPage()
const { data: history } = useScanHistory()
const navigate = useNavigate()

const reopen = (url) => navigate(`/scan-results?url=${encodeURIComponent(url)}`)

// then, somewhere in the JSX below the scan input:
<ScanHistoryList entries={history} onSelect={reopen} />
```

Notice what *isn't* in the page: no `fetch`, no error state machine,
no list rendering loop. Each of those lives in the file whose job it
is. The result URL pattern was already shareable, so reusing it for
"reopen" is free.

### Step 12 — frontend tests (`frontend/src/__tests__/`)

Vitest + RTL tests stub the API client at the module level — exactly
the trick
[`scanResultsPage.test.jsx`](file:///c%3A/Users/nidal/Documents/GitHub/codrlabs/open-solutions/equalview/frontend/src/__tests__/scanResultsPage.test.jsx)
already uses:

```jsx
vi.mock('../lib/apiClient', () => ({
  apiClient: { listScanHistory: vi.fn(), runScan: vi.fn(),
               getScanResults: vi.fn(), getProblem: vi.fn() },
}))
import { apiClient } from '../lib/apiClient'

it('shows past scans and reopens one when clicked', async () => {
  apiClient.listScanHistory.mockResolvedValue({
    entries: [{ id: '1', url: 'https://a.test', createdAt: '2026-01-01T00:00:00Z' }],
  })
  render(<MemoryRouter><LandingPage /></MemoryRouter>)
  const item = await screen.findByText('https://a.test')
  fireEvent.click(item)
  // assert that navigation happened — e.g. via a useNavigate spy or by
  // rendering the App with routes and asserting the next screen.
})
```

### Step 13 — verify

Before you push, all four checks must be green:

```
cd backend  && npm test
cd frontend && npm test -- --run
cd frontend && npm run lint
cd frontend && npm run build
```

And per `AGENTS.md`: run `gitnexus_impact` before editing a symbol,
and `gitnexus_detect_changes` before committing.

### Why every step had to exist

Walk back through the list and notice what each step *prevented*:

- **Step 1 (shared)** — backend and frontend can't drift on the
  shape of a `ScanHistoryEntry`.
- **Step 2 (data)** — the rest of the app doesn't care whether we're
  in-memory or on Postgres.
- **Step 3 (service)** — business logic is testable without
  Express, without globals, without time.
- **Step 4 (controller)** — HTTP concerns (`req`/`res`, status
  codes, validation) live in exactly one place.
- **Step 5 (routes)** — the URL surface of the API is reviewable on
  one page.
- **Step 6 (composition root)** — adding a dependency only changes
  one file. Phase 2's real scanner will land the same way.
- **Step 8 (apiClient)** — there is one file in the SPA that knows
  about the network. Stubbing it stubs the whole frontend.
- **Step 9 (hook)** — every data source has the same
  `{ data, loading, error }` contract; pages don't reimplement it.
- **Step 10 (component)** — UI primitives are reusable because they
  don't know where their data came from.
- **Step 11 (page)** — pages are short, because the work was done in
  the layers below.

If you skip a step ("I'll just `fetch` from the page, it's only one
call"), the architecture stops paying off. Stick to the layering
even when it feels like extra typing — the second feature you add
will already be faster because of it.

### A second example, in one paragraph

Suppose the next feature is "let the user filter the results by
WCAG impact (`critical` / `serious` / `moderate` / `minor`)". The
filter is a frontend-only concern (the data is already there), so:
no `shared/` change, no backend change. On the frontend you'd add a
small presentational `<ImpactFilter value onChange />` in
`components/`, lift the `value` state into `ScanResultsPage`, and
filter `results.problems` before passing them to
`ProblemCategoryBox`. The hook, the API client, and the router stay
untouched. **Same architecture, different layers in play.**

---

## 6. Walkthrough — replacing the mock with axe-core

This is the second walkthrough, mirroring §5 but for the single
most-asked-about change in the codebase: **swapping
[`mockScanResults`](file:///c%3A/Users/nidal/Documents/GitHub/codrlabs/open-solutions/equalview/backend/data/mockScanResults.js)
for a real Puppeteer + axe-core scan**, so `POST /api/scan` and
`GET /api/scan-results` return what the user's site actually looks
like to axe instead of a fixture (or the future-error state when the
fixture is removed).

The full plan with milestones is in
[`docs/plans/axecore-integration-roadmap.md`](../plans/axecore-integration-roadmap.md);
the SSRF, timeout, and sync-vs-async decisions live in
[`docs/plans/project-roadmap.md`](../plans/project-roadmap.md). This
section is the layer-by-layer "what changes where" view, in the same
shape as §5.

The point to internalize before reading the steps: the only files
that change are **`backend/services/scanRunner.js` (new),
`backend/controllers/scanController.js`, and `backend/app.js` (the
composition root)**. Routes don't change. The transformer doesn't
change. `shared/types.js` doesn't change. **The frontend doesn't
change at all.** That is the property §4.4 promised — Phase 2 is the
first time we cash it in.

### Step 1 — confirm `shared/types.js` already matches

Wire-shape changes always start here (§4.5). For the axe swap,
nothing actually has to change:
[`axeTransformer.transform(...)`](file:///c%3A/Users/nidal/Documents/GitHub/codrlabs/open-solutions/equalview/backend/services/axeTransformer.js)
already returns the
[`ScanResult`](file:///c%3A/Users/nidal/Documents/GitHub/codrlabs/open-solutions/equalview/shared/types.js)
shape the frontend consumes today, because the mock fixture and the
transformer were designed against the same typedefs (`Problem`,
`ScanResult`, `Impact`).

Open `shared/types.js`, confirm those three are present, then move
on. If a Phase-2 follow-up later wants to surface axe's `incomplete`
results or per-node metadata, *that* would start here — extend the
typedef, then let the change ripple.

### Step 2 — `backend/services/axeTransformer.js` already does the mapping

Reuse, don't rewrite. The existing transformer is **pure** —
`transform(axeResults) → ScanResult`, with a `bucketFor(tags)`
helper that maps axe categories to the UI buckets
(`visualAccessibility` / `structureAndSemantics` / `multimedia`). It
is unit-tested already.

The Phase-2 wiring just has to feed real axe results into it. If
axe-core ever emits a tag `bucketFor` doesn't recognise, the right
fix is to extend `bucketFor` (and its test) — never to add mapping
logic in the controller or in the runner.

### Step 3 — new service `backend/services/scanRunner.js`

This is the file that does not exist yet. It owns the imperative
bits the transformer deliberately doesn't: launching a headless
browser, navigating to the URL, injecting `axe-core`, and returning
the raw results. It also owns **timeouts** and **the redirect
policy** — those are runner concerns, not controller concerns.

Crucially, it takes a `pageDriver` as a dependency rather than
`require('puppeteer')` directly. That is the same pattern §5 step 3
used for `createScanHistory({ store, uuid, now })`: the testable
seam sits *one level above* the I/O.

```js
// backend/services/scanRunner.js
/**
 * scanRunner — owns the network side effect for a scan: drive a
 * headless browser to the URL, inject axe-core, and return the raw
 * axe results. The transform step lives in axeTransformer (pure).
 *
 * Pure-ish: the only I/O happens inside the injected `pageDriver`,
 * which makes this trivially unit-testable with a fake.
 *
 * See:
 *   - docs/plans/axecore-integration-roadmap.md
 *   - docs/plans/project-roadmap.md   (SSRF policy, timeouts)
 */

const DEFAULT_NAV_TIMEOUT_MS = 15_000;
const DEFAULT_AXE_TIMEOUT_MS = 30_000;

/**
 * @param {{
 *   pageDriver: {
 *     load:   (url: string, opts: { timeoutMs: number, followRedirects: boolean })
 *             => Promise<{ finalUrl: string }>,
 *     runAxe: (opts: { timeoutMs: number }) => Promise<object>,
 *     close:  () => Promise<void>,
 *   },
 *   ssrfGuard: { validate: (s: string) => { ok: boolean, reason?: string } },
 *   navTimeoutMs?: number,
 *   axeTimeoutMs?: number,
 * }} deps
 */
function create({
  pageDriver,
  ssrfGuard,
  navTimeoutMs = DEFAULT_NAV_TIMEOUT_MS,
  axeTimeoutMs = DEFAULT_AXE_TIMEOUT_MS,
}) {
  return {
    /**
     * @param {string} url   already passed through ssrfGuard upstream
     * @returns {Promise<object>}  raw axe-core run output
     */
    async run(url) {
      try {
        // Disable redirect-following so a CDN 302 to e.g.
        // 169.254.169.254 (cloud metadata) can't sneak past the
        // upstream guard. If you ever turn redirects back on, you
        // MUST re-validate the final URL with ssrfGuard before
        // running axe — see project-roadmap.md "SSRF policy".
        const { finalUrl } = await pageDriver.load(url, {
          timeoutMs: navTimeoutMs,
          followRedirects: false,
        });

        const recheck = ssrfGuard.validate(finalUrl);
        if (!recheck.ok) {
          throw new Error(`Blocked after navigation: ${recheck.reason}`);
        }

        return await pageDriver.runAxe({ timeoutMs: axeTimeoutMs });
      } finally {
        await pageDriver.close();
      }
    },
  };
}

module.exports = { create };
```

Three things to notice:

- **Puppeteer is not imported here.** The real adapter lives in a
  thin wrapper the composition root creates (Step 5). That keeps
  this file unit-testable without a browser binary.
- **Timeouts are defaulted, not hardcoded.** Tests pass tiny values;
  production uses the defaults. The controller never sees them.
- **The SSRF guard runs again after navigation.** The upstream guard
  (in the controller) can only validate the *user-supplied* string;
  the redirect-resolved URL has to be re-checked here.

### Step 4 — update `backend/controllers/scanController.js`

The controller gains a `runner` and a `transformer` dependency, and
`postScan` becomes async. Everything else — the SSRF guard call,
the bound-method pattern, the response shape — stays.

```js
class ScanController {
  /**
   * @param {object} deps
   * @param {{ validate: (s: string) => { ok: boolean, reason?: string, url?: URL } }} deps.ssrfGuard
   * @param {{ run: (url: string) => Promise<object> }}                     deps.runner
   * @param {{ transform: (axeResults: object) => ScanResult }}             deps.transformer
   */
  constructor({ ssrfGuard, runner, transformer }) {
    this.ssrfGuard = ssrfGuard;
    this.runner = runner;
    this.transformer = transformer;

    // Bind once so router wiring stays clean — keep this pattern
    // when you add new handlers
    // (see docs/guides/axecore-integration.md).
    this.postScan = this.postScan.bind(this);
    this.getScanResults = this.getScanResults.bind(this);
    this.getProblem = this.getProblem.bind(this);
  }

  /** POST /api/scan  body: { url: string } */
  async postScan(req, res) {
    const { url } = req.body || {};
    const guard = this.ssrfGuard.validate(url);
    if (!guard.ok) return res.status(400).json({ error: guard.reason });

    try {
      const axeResults = await this.runner.run(guard.url.toString());
      return res.json(this.transformer.transform(axeResults));
    } catch (err) {
      console.error(`Scan failed for ${url}:`, err);
      return res.status(502).json({ error: 'Scan failed', detail: err.message });
    }
  }

  // getScanResults gets the same treatment (validate → runner.run →
  // transformer.transform). A future caching layer would slot in
  // between the controller and the runner — neither file knows.
}
```

Things this snippet pins down:

- **The `// TODO(Phase 2)` comment in the current file goes away.**
  The
  [existing `postScan`](file:///c%3A/Users/nidal/Documents/GitHub/codrlabs/open-solutions/equalview/backend/controllers/scanController.js#L41)
  literally says "call this.runner.run(url)" — that's what this is.
  The dependency name `runner` matches.
- **`mockScanResults` is gone from the constructor.** Tests that
  still want a deterministic body either import the fixture from
  `data/mockScanResults.js` directly or pass a fake runner that
  returns one (see Step 6). The production wire never touches it.
- **Methods are still bound in the constructor.** This is the
  documented fix for the `this`-binding bug — never replace it with
  arrow methods or per-route `.bind()`.

### Step 5 — wire it in `backend/app.js` (composition root)

This is the only file that knows the concrete browser library
exists. The whole reason for the reorg was: when Phase 2 lands,
**only this file changes for DI**.

```js
const ScanController = require('./controllers/scanController');
const mountRoutes = require('./routes');
const ssrfGuard = require('./services/ssrfGuard');
const axeTransformer = require('./services/axeTransformer');
const scanRunner = require('./services/scanRunner');
// thin wrapper around puppeteer.launch + page.goto + axe injection:
const createPuppeteerDriver = require('./lib/puppeteerPageDriver');

function buildApp(overrides = {}) {
  const app = express();
  /* ...cors + json + /health unchanged... */

  const runner =
    overrides.runner ||
    scanRunner.create({
      pageDriver: overrides.pageDriver || createPuppeteerDriver(),
      ssrfGuard,
    });

  const scanController =
    overrides.scanController ||
    new ScanController({
      ssrfGuard:   overrides.ssrfGuard   || ssrfGuard,
      runner,
      transformer: overrides.transformer || axeTransformer,
    });

  mountRoutes(app, { scanController });
  return app;
}
```

Two patterns to copy:

- Each construction line is `overrides.X || <default>`. That is how
  every existing test overrides one layer without losing the rest of
  the wire.
- The Puppeteer adapter is created here, not inside `scanRunner.js`.
  If you later replace Puppeteer with Playwright, *only* `app.js`
  (and the new adapter) changes.

`routes/scan.js` does not change — it still does
`router.post('/scan', controller.postScan)`. Adding `async` to the
handler does not require any router edit; Express awaits the
returned promise as long as the handler eventually calls
`res.json(...)` (which `postScan` does in both branches).

### Step 6 — backend tests

Two layers, two test styles, exactly mirroring the existing files.

**Pure-service test for `scanRunner`** — no Express, no browser.
Mirrors
[`ssrfGuard.test.js`](file:///c%3A/Users/nidal/Documents/GitHub/codrlabs/open-solutions/equalview/backend/tests/ssrfGuard.test.js)
in style:

```js
// backend/tests/scanRunner.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const scanRunner = require('../services/scanRunner');
const ssrfGuard = require('../services/ssrfGuard');

test('disables redirects, re-validates final URL, and closes the page', async () => {
  const calls = [];
  const driver = {
    load:   async (u, opts) => { calls.push(['load', u, opts]); return { finalUrl: u }; },
    runAxe: async (opts)    => { calls.push(['runAxe', opts]);  return { violations: [], passes: [] }; },
    close:  async ()        => { calls.push(['close']); },
  };

  const runner = scanRunner.create({ pageDriver: driver, ssrfGuard });
  const result = await runner.run('https://example.com/');

  assert.deepEqual(result, { violations: [], passes: [] });
  assert.equal(calls[0][2].followRedirects, false);     // redirect policy
  assert.equal(calls.at(-1)[0], 'close');               // always closes
});

test('throws if the post-redirect URL is private', async () => {
  const driver = {
    load:   async () => ({ finalUrl: 'http://127.0.0.1/admin' }),
    runAxe: async () => ({}),
    close:  async () => {},
  };
  const runner = scanRunner.create({ pageDriver: driver, ssrfGuard });
  await assert.rejects(
    () => runner.run('https://example.com/'),
    /Blocked after navigation/,
  );
});
```

**HTTP test that overrides the runner via `buildApp`** — mirrors
[`scan.test.js`](file:///c%3A/Users/nidal/Documents/GitHub/codrlabs/open-solutions/equalview/backend/tests/scan.test.js):

```js
// backend/tests/scan.axe.test.js
test('POST /api/scan returns the transformed axe result shape', async () => {
  const fakeRunner = {
    run: async () => ({
      violations: [
        { id: 'color-contrast', tags: ['cat.color'],
          help: 'Contrast', description: 'Low contrast text',
          nodes: [{ html: '<p>...</p>', failureSummary: 'Increase contrast' }],
          impact: 'serious', helpUrl: 'https://dequeuniversity.com/...' },
      ],
      passes: [{ id: 'document-title', help: 'Title present' }],
    }),
  };

  const app = buildApp({ runner: fakeRunner });
  const res = await request(app).post('/api/scan')
    .send({ url: 'https://example.com' });

  assert.equal(res.status, 200);
  assert.equal(res.body.problems.visualAccessibility.length, 1);
  assert.equal(res.body.problems.visualAccessibility[0].id, 'color-contrast');
  assert.deepEqual(res.body.whatsGood, ['Title present']);
});
```

Notice what neither test does: launch a real browser, hit the
network, or import `puppeteer`. The browser only ever runs inside
`createPuppeteerDriver`, which is a one-screen file the composition
root constructs.

### Step 7 — the frontend doesn't change

This is the payoff. The wire shape coming back from `POST /api/scan`
and `GET /api/scan-results` is the same `ScanResult` typedef the
mock already produced (Step 1 confirmed this). So
[`apiClient`](file:///c%3A/Users/nidal/Documents/GitHub/codrlabs/open-solutions/equalview/frontend/src/lib/apiClient.js),
[`useScan`](file:///c%3A/Users/nidal/Documents/GitHub/codrlabs/open-solutions/equalview/frontend/src/hooks/useScan.js),
[`ScanResultsPage`](file:///c%3A/Users/nidal/Documents/GitHub/codrlabs/open-solutions/equalview/frontend/src/pages/ScanResultsPage.jsx),
and every component below them keep working unchanged. The user
stops seeing mock fixture data (or the future-error state once the
fixture is removed) because the same endpoint now returns real axe
results in the same shape.

If the frontend *were* changing, that would be a sign Step 1 missed
something — go back to `shared/types.js`, fix the contract, and let
the change ripple from there.

### Caveats worth re-reading

- **Redirects + SSRF.** The upstream `ssrfGuard` only sees the raw
  string the user typed. Puppeteer happily follows 302s, including
  ones into `127.0.0.1` or cloud-metadata IPs like
  `169.254.169.254`. Either disable redirects (as Step 3 does) or
  re-validate the final URL before running axe. Both belong to the
  runner, not the controller. This is the "SSRF policy" point in
  [`project-roadmap.md`](../plans/project-roadmap.md).
- **Timeouts and resource limits live in the runner.** Per-request
  navigation timeout, total scan budget, and any concurrency cap on
  Puppeteer instances are all `scanRunner` parameters. The
  controller has no business knowing about them.
- **Don't rewrite the transformer.** It is already pure and tested;
  if axe emits a tag it doesn't recognise, extend `bucketFor` and
  its test, not the controller.
- **`mockScanResults.js` does not get deleted.** Per
  `axecore-integration-roadmap.md` Phase 1's "Done when", the
  fixture stays around as a test resource — backend tests that
  want a deterministic body without spinning up a fake runner can
  still import it directly.

---

## 7. Conventions, in one place

A short summary of the rules implied by §3:

**Backend**

- Routers contain only `router.METHOD(path, controller.method)`.
- Controllers are classes with bound methods (bind in the constructor).
- Services are pure — no `req`, `res`, `process.env`, `fetch`, DB.
  They return values; for user-input failures they return
  `{ ok: false, reason }` (see `ssrfGuard`).
- Tests use `buildApp(overrides)` + `supertest`, never a real port.
- Run the SSRF guard before any work that touches the network.

**Frontend**

- Pages own layout, hooks own state, components own UI primitives.
- Only `lib/apiClient.js` imports `fetch`.
- Hooks return `{ data, loading, error }`; derive synchronous errors
  outside `useEffect`.
- Navigate with `useNavigate()` and `<Link>`; never set
  `window.location`.
- URL state is the source of truth for anything you want to share.

**Shared**

- `shared/types.js` is dependency-free.
- Wire-shape changes start there.

**Workflow**

- Branch from `main`: `feat/*`, `fix/*`, `chore/*`, `docs/*`.
- Run `gitnexus_impact` before editing a symbol; run
  `gitnexus_detect_changes` before committing (see `AGENTS.md`).
- All four checks must be green: `backend npm test`,
  `frontend npm test`, `frontend npm run lint`,
  `frontend npm run build`.

---

## 8. Where to look next

- **"Where does X live?"** — `gitnexus_query({query: "X"})` returns
  process-grouped results; faster than grep. See the
  [`gitnexus-exploring`](../../.claude/skills/gitnexus/gitnexus-exploring/SKILL.md)
  skill.
- **"Is it safe to change Y?"** —
  `gitnexus_impact({target: "Y", direction: "upstream"})`. See the
  [`gitnexus-impact-analysis`](../../.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md)
  skill.
- **Git went sideways** — recovery recipes in
  [`docs/guides/workflow.md`](workflow.md).
- **`this`-binding bug in a controller** — known footgun, documented
  fix pattern in
  [`docs/guides/axecore-integration.md`](axecore-integration.md).
- **What to work on next** —
  [`docs/plans/project-roadmap.md`](../plans/project-roadmap.md).
