# EqualView Architecture — Line-by-Line Reference

**Purpose:** A readable reference explaining what every file does, what each layer is for, and why the architecture is structured this way. Use when onboarding, debugging, or planning changes.

**Assumes:** You've seen the codebase but forget what a "controller" or "service" does and how data flows end-to-end.

---

## Architecture Layers at a Glance

```
Frontend:  page → component → hook → apiClient → backend
Backend:   route → controller → service → data
Bridge:    shared/types.js
```

Every file lives in exactly one layer. Each layer only talks to the one directly above or below it.

| Layer | Frontend responsibility | Backend responsibility |
|---|---|---|
| **page / route** | Render UI, own no fetch logic | Map URL + HTTP verb to handler |
| **component / controller** | Compose UI from data | Parse request, call service, format response |
| **hook / service** | Manage data-fetching state machine | Business logic, pure transforms |
| **apiClient / data** | The only file that calls `fetch` | Static fixtures or DB |

---

## Layer-by-Layer: What Each Piece Does

### `shared/types.js` — The Bridge

**What it is:** The only file both frontend and backend import. It defines the JSON shape that travels over the network wire.

```js
/**
 * @typedef {'critical' | 'serious' | 'moderate' | 'minor' | null} Impact
 *
 * @typedef {object} Problem
 * @property {string}   id
 * @property {string}   name          // axe.help — one-line summary
 * @property {string}   category      // bucket: visualAccessibility | structureAndSemantics | multimedia
 * @property {string}   rootCause     // axe.description
 * @property {string}   codeSnippet   // axe.nodes[0].html
 * @property {string[]}  solution      // axe.nodes[0].failureSummary
 * @property {Impact}   impact
 * @property {string}   helpUrl       // Deque University link
 * @property {string[]}  tags          // wcag2a, cat.color, etc.
 *
 * @typedef {object} ScanResult
 * @property {{ visualAccessibility: Problem[], structureAndSemantics: Problem[], multimedia: Problem[] }} problems
 * @property {string[]} whatsGood      // axe.passes[].help
 */
```

**Why helpful:**
- Both sides get editor autocomplete without a build step
- Changing a field name shows every affected file at compile time (JSDoc)
- If you migrate to TypeScript later, this file becomes the interface definition
- It's the **single source of truth** for the wire contract — no "frontend expects X, backend returns Y" drift

---

### `frontend/src/lib/apiClient.js` — apiClient layer

**What it is:** The only file in the frontend that calls `fetch`. Every page and hook goes through this.

```js
export class ApiClient {
  async _request(path, init) {
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, init)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  }

  runScan(url)     { return _request('/api/scan', { method: 'POST', body: JSON.stringify({url}) }) }
  getScanResults(url) { return _request(`/api/scan-results?url=${encodeURIComponent(url)}`) }
  getProblem(id)  { return _request(`/problems/${encodeURIComponent(id)}`) }
}

export const apiClient = new ApiClient({ baseUrl: '' })  // singleton
```

**Why a class:**
- Holds `baseUrl` and `fetchImpl` as state — so tests can inject a fake `fetchImpl` that returns fixture data
- All HTTP logic is centralized — adding auth headers, retry logic, or request logging happens in one place
- No `fetch` calls scattered across pages or hooks

**Why helpful:**
- Pages never know about CORS, headers, or URL encoding
- You can swap the entire HTTP layer for a mock in tests without touching any page or hook
- Adding a new endpoint means adding one method to this class, not searching the whole codebase

---

### `frontend/src/hooks/useScan.js` — hook layer

**What it is:** A state machine that owns the loading/error/data lifecycle for scan results.

```js
export function useScan(url) {
  const missingUrl = !url  // derive synchronously, no setState in effect

  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    if (missingUrl) return
    let cancelled = false

    client.getScanResults(url)
      .then(result => { if (!cancelled) setState({ status: 'ready', data: result }) })
      .catch(err    => { if (!cancelled) setState({ status: 'error', error: err.message }) })

    return () => { cancelled = true }  // cleanup: cancel if url changes before resolve
  }, [url, client, missingUrl])

  if (missingUrl) return { data: null, loading: false, error: 'No URL provided' }
  return {
    data:    state.status === 'ready' ? state.data : null,
    loading: state.status === 'loading',
    error:   state.status === 'error' ? state.error : null,
  }
}
```

**Why return `{ data, loading, error }` instead of just `data`?**
- Pages render three different UI states (spinner, error, content) — all three must be accessible
- The hook owns the state machine; pages just render what they're given
- `missingUrl` is derived synchronously so pages can show an error immediately without waiting for an effect

**Why helpful:**
- If you wanted to add polling, caching, or retries, you'd change only this hook
- Pages don't manage fetch state — no `useState` for data in `ScanResultsPage`
- `cancelled` flag prevents a slow response from overwriting fresh data if the URL changed mid-flight

---

### `frontend/src/pages/ScanResultsPage.jsx` — page layer

**What it is:** The results screen. Reads `?url=` from query params, calls `useScan`, renders buckets.

```jsx
export default function ScanResultsPage() {
  const [searchParams] = useSearchParams()
  const url = searchParams.get('url')
  const { data, loading, error } = useScan(url)   // owns fetch state, not this component
  const [selectedProblem, setSelectedProblem] = useState(null)

  if (selectedProblem) return <ProblemSolutionPage problem={selectedProblem} onBack={...} />
  if (loading)        return <p>Fetching scan results...</p>
  if (error)          return <p>Error: {error}</p>
  if (!data)          return <p>No results</p>

  return (
    <div>
      <h1>Scan Results for {url}</h1>
      <div className="problems-grid">
        <ProblemCategoryBox title="Visual Accessibility"   problems={data.problems.visualAccessibility}     onSelectProblem={setSelectedProblem} />
        <ProblemCategoryBox title="Structure and Semantics" problems={data.problems.structureAndSemantics} onSelectProblem={setSelectedProblem} />
        <ProblemCategoryBox title="Multi-media"            problems={data.problems.multimedia}            onSelectProblem={setSelectedProblem} />
      </div>
      <WhatsGood items={data.whatsGood} />
    </div>
  )
}
```

**What it does NOT do:**
- Does not call `fetch` directly
- Does not manage loading/error state (the hook does)
- Does not know where the data comes from

**Why helpful:**
- If the API shape changed (e.g. rename `visualAccessibility` → `contrast`), you'd find every reference by searching this file alone
- Designers can rearrange the page layout without touching data-fetching logic
- The component is self-documenting: you can read what data it needs by reading the props it passes

---

### `frontend/src/pages/LandingPage.jsx` — page layer

**What it is:** Entry point. Validates URL format, navigates to `/scan-results?url=...`.

Today: pure client-side navigation, no backend call. The scan fires from `ScanResultsPage` via `useScan`.

Phase 2 change: `LandingPage` will `POST /api/scan { url }` to kick off a real scan with progress feedback.

---

### `frontend/src/components/ProblemCategoryBox.jsx` — component layer

**What it is:** Renders one bucket of problems as clickable cards.

```jsx
<ProblemCategoryBox
  title="Visual Accessibility"
  problems={data.problems.visualAccessibility}
  onSelectProblem={setSelectedProblem}   // emits event up to page
/>
```

**What it does NOT do:**
- Does not call any API
- Does not manage loading state
- Does not know about the URL or query params

Receives data as props, emits events upward. Purely presentational.

---

### `frontend/src/components/WhatsGood.jsx` — component layer

**What it is:** Renders `whatsGood[]` — axe rules that passed, displayed as positive feedback.

---

### `frontend/src/components/ProblemSolutionPage.jsx` — component layer

**What it is:** Inline detail view when you click a problem card. Shows root cause, solution steps, code snippet.

Not a route — rendered in-page via `selectedProblem` state in `ScanResultsPage`. Phase 3 will make it a real route (`/problems/:id`) so links are shareable.

---

### `frontend/src/utils/urlValidator.js` — utility layer

**What it is:** Pure function `isValidUrl(url)`. No side effects, no network, no globals.

```js
export function isValidUrl(input) {
  try { new URL(input); return true } catch { return false }
}
```

**Why helpful:** If validation rules change, one file updates and every caller gets the new behavior. Testable with simple string inputs.

---

### `backend/routes/scan.js` — route layer

**What it is:** Express `Router`. The **only** job is mapping URL patterns + HTTP verbs to handler functions.

```js
function makeScanRouter(controller) {
  const router = Router()
  router.post('/scan',        controller.postScan)        // kick off scan
  router.get('/scan-results', controller.getScanResults)  // fetch results
  return router
}
```

**What it does NOT do:**
- No URL parsing — Express has already parsed `?url=` into `req.query`
- No business logic
- No validation

**Why a separate file:**
- **Testability** — You can test URL-to-handler mapping without starting the full server
- **Isolation** — Renaming `/scan-results` to `/results` means changing only this file
- **Composition** — `index.js` mounts it: `app.use('/api', makeScanRouter(scanController))`

**Why helpful:** Routes are the most volatile part of the backend (URLs change often during development). Isolating them means changes don't ripple into business logic.

---

### `backend/controllers/scanController.js` — controller layer

**What it is:** HTTP request/response handler. Parses input, calls service layer, formats response.

```js
class ScanController {
  /**
   * @param {object} deps
   * @param {ScanRunner|mockScanResults} deps.runner  — Phase 2: real scanner
   * @param {SsrfGuard} deps.ssrfGuard
   */
  constructor({ runner, ssrfGuard }) {
    this.runner = runner
    this.ssrfGuard = ssrfGuard
    // Bind once so the reference can be passed to app.get() without losing `this`
    this.postScan       = this.postScan.bind(this)
    this.getScanResults = this.getScanResults.bind(this)
    this.getProblem     = this.getProblem.bind(this)
  }

  async postScan(req, res) {
    const { url } = req.body || {}
    const guard = this.ssrfGuard.validate(url)
    if (!guard.ok) return res.status(400).json({ error: guard.reason })

    try {
      const result = await this.runner.run(url)
      return res.json(result)
    } catch (err) {
      return res.status(500).json({ error: 'Scan failed: ' + err.message })
    }
  }

  async getScanResults(req, res) {
    const { url } = req.query
    if (!url) return res.status(400).json({ error: 'Missing ?url=' })
    const guard = this.ssrfGuard.validate(url)
    if (!guard.ok) return res.status(400).json({ error: guard.reason })

    try {
      const result = await this.runner.run(url)
      return res.json(result)
    } catch (err) {
      return res.status(500).json({ error: 'Scan failed: ' + err.message })
    }
  }

  getProblem(req, res) {
    const { id } = req.params
    const allProblems = Object.values(this.mockScanResults.problems).flat()
    const problem = allProblems.find(p => p.id === id)
    if (!problem) return res.status(404).json({ error: 'Problem not found' })
    return res.json(problem)
  }
}
```

**Why a class:**
1. **Bound methods** — `this.postScan.bind(this)` in the constructor means you can do `app.post('/api/scan', ctrl.postScan)` without losing `this`. Without binding, `this` is `undefined` when Express calls the handler.
2. **Shared state** — Holds `this.runner` (Phase 2) or `this.mockScanResults` (Phase 1) that all methods share.

**Why helpful:**
- Controller is the seam between HTTP and business logic
- If you needed to change the HTTP response format (e.g. wrap in `{ data: ... }`), you change only this file
- If the service layer changes, the controller adapts — routes don't know

**Why "controller" and not just functions:**
- Functions would lose `this` on every call without binding shenanigans
- The class makes the shared dep (`runner` vs `mockScanResults`) explicit and injectable

---

### `backend/services/ssrfGuard.js` — service layer (pure)

**What it is:** Pure function module. Validates URLs are safe to scan before Puppeteer ever touches them.

```js
const PRIVATE_IPV4_RANGES = [/^10\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[0-1])\./, /^127\./, /^169\.254\./, /^0\./]

function isPrivateHost(hostname) { /* checks set + IPv4 ranges + IPv6 */ }

function validate(input) {
  if (typeof input !== 'string') return { ok: false, reason: 'URL is required' }
  let parsed
  try { parsed = new URL(input) } catch { return { ok: false, reason: 'URL is not parseable' } }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')
    return { ok: false, reason: `Unsupported protocol: ${parsed.protocol}` }
  if (isPrivateHost(parsed.hostname))
    return { ok: false, reason: 'Private/loopback hosts are not allowed' }
  return { ok: true, url: parsed }
}

module.exports = { validate, isPrivateHost }
```

**What it blocks:**
- `file://`, `data:`, `javascript:` — only `http:` and `https:` pass
- `localhost`, `127.0.0.1`, `192.168.x.x`, `10.x.x.x`, `172.16-31.x.x`
- IPv6 loopback and ULA addresses

**Why pure functions:**
- No globals, no I/O, no network calls
- Given the same input string, always returns the same result
- Every rejection case is unit-testable with string inputs only

**Why helpful:**
- Without this, a user could submit `http://localhost:3000/admin` and read internal services
- One file contains all SSRF logic — no "did we check the URL?" scattered across the codebase
- You can add a new block (e.g. `169.254.0.0/16`) by editing one array

---

### `backend/services/axeTransformer.js` — service layer (pure)

**What it is:** Maps raw axe-core output → `ScanResult`. Pure function, no I/O.

```js
function bucketFor(tags = []) {
  const has = t => tags.includes(t)
  if (has('cat.text-alternatives') || has('cat.media') || has('cat.time-and-media'))
    return 'multimedia'
  if (has('cat.structure') || has('cat.semantics') || has('cat.tables') || has('cat.parsing') || has('cat.aria') || has('cat.name-role-value'))
    return 'structureAndSemantics'
  return 'visualAccessibility'
}

function transform(axeResults) {
  if (!axeResults || typeof axeResults !== 'object')
    return { problems: { visualAccessibility: [], structureAndSemantics: [], multimedia: [] }, whatsGood: [] }

  const violations = Array.isArray(axeResults.violations) ? axeResults.violations : []
  const passes     = Array.isArray(axeResults.passes)     ? axeResults.passes     : []

  const problems = { visualAccessibility: [], structureAndSemantics: [], multimedia: [] }

  for (const v of violations) {
    const bucket = bucketFor(v.tags)
    problems[bucket].push({
      id:          v.id,
      name:        v.help,
      category:    bucket,
      rootCause:   v.description || '',
      codeSnippet: v.nodes?.[0]?.html || '',
      solution:    v.nodes?.[0]?.failureSummary ? [v.nodes[0].failureSummary] : [],
      impact:      v.impact || null,
      helpUrl:     v.helpUrl || null,
      tags:        v.tags || [],
    })
  }

  return { problems, whatsGood: passes.map(p => p.help) }
}

module.exports = { transform, bucketFor }
```

**The `bucketFor` mapping:**
| axe tags | UI bucket |
|---|---|
| `cat.text-alternatives`, `cat.media`, `cat.time-and-media` | `multimedia` |
| `cat.structure`, `cat.aria`, `cat.tables`, `cat.parsing`, `cat.name-role-value` | `structureAndSemantics` |
| everything else (cat.color, cat.control, etc.) | `visualAccessibility` |

**Why the `bucketFor` helper exists:** It's the bridge between axe-core's taxonomy (which uses WCAG tag categories like `cat.color`) and EqualView's UX taxonomy (which groups issues by the three accessibility dimensions users think about).

**Why pure and testable:** Feed it a captured axe fixture and it returns a predictable result. Zero browser needed in tests:
```js
const result = transform(capturedAxeFixture)
assert.equal(result.problems.multimedia.length, 2)
assert.equal(result.whatsGood[0], 'Documents must have a title')
```

**Why helpful:**
- The controller doesn't need to know bucket mapping logic
- If you changed bucket categories, only this file changes
- The existing tests (`axeTransformer.test.js`) already cover this — Phase 2 just starts calling it with real data

---

### `backend/data/mockScanResults.js` — data layer

**What it is:** Static fixture. The entire Phase 1 backend — every URL returns the same hardcoded data.

```js
const mockScanResults = {
  problems: {
    visualAccessibility: [ { id:'contrast-1', name:'Low contrast...', ... } ],
    structureAndSemantics: [ { id:'heading-1', name:'Heading levels skipped', ... } ],
    multimedia: [ { id:'alt-1', name:'Image missing alt text', ... } ],
  },
  whatsGood: [ 'Page has a descriptive <title>...', 'Form inputs have associated <label>...' ]
}
```

**Phase 2 status:** Only referenced from tests. Real data comes from `ScanRunner.run()`.

---

### `backend/app.js` — composition root

**What it is:** The ONE place that instantiates concrete classes and wires them together. Everything else takes deps via constructor arguments.

```js
function buildApp(overrides = {}) {
  const app = express()
  app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173' }))
  app.use(express.json())

  // Phase 1: mock
  const scanController = new ScanController({
    mockScanResults: overrides.mockScanResults || mockScanResults,
    ssrfGuard:       overrides.ssrfGuard       || ssrfGuard,
  })

  // Phase 2 wiring (pseudo-code):
  // const scanRunner = new ScanRunner({ puppeteer, axe, ssrfGuard, transformer })
  // const scanController = new ScanController({ runner: scanRunner, ssrfGuard })

  mountRoutes(app, { scanController })
  return app
}
```

**Why `overrides` exists:** Tests pass stubbed dependencies here. A test can do:
```js
const fakeFixture = { problems: { ... }, whatsGood: [...] }
const app = buildApp({ mockScanResults: fakeFixture })
request(app).get('/api/scan-results?url=https://example.com')
  .expect(200, fakeFixture)  // never hits real Puppeteer
```

No browser, no network, no real scanner — just HTTP request/response with fixture data.

**Why a single composition root:**
- You can see every dependency the app needs in one place
- Swapping `mockScanResults` for `runner` means editing only this file
- Adding a new service (e.g. auth) means adding it here, not scattered across files

---

### `backend/index.js` — bootstrap

**What it is:** Entry point. Loads `.env`, calls `buildApp()`, binds to `PORT`.

---

## End-to-End Flows

### Phase 1: Current architecture (mock scanning)

```
User types URL on LandingPage
    ↓
LandingPage validates format (urlValidator.js)
    ↓
navigates to /scan-results?url=https://example.com
    (React Router — client-side, no server request yet)
    ↓
ScanResultsPage reads ?url= via useSearchParams(), calls useScan(url)
    ↓
useScan fires apiClient.getScanResults(url)
    ↓
apiClient._request() → fetch('/api/scan-results?url=https%3A%2F%2Fexample.com')
    ↓
Express receives GET /api/scan-results?url=...
    ↓
routes/scan.js maps to controller.getScanResults()
    ↓
ScanController.getScanResults():
    - parses req.query.url
    - calls ssrfGuard.validate(url)
    - if invalid: res.status(400).json({ error })
    - if valid:   res.json(mockScanResults)  ← static fixture
    ↓
HTTP 200 + JSON returns to frontend
    ↓
apiClient._request() receives JSON, returns to useScan
    ↓
useScan sets state: { status: 'ready', data: result }
    ↓
React re-renders ScanResultsPage
    ↓
renders three ProblemCategoryBox buckets + WhatsGood
```

### Phase 2: Real scanning

```
User types URL on LandingPage, clicks "Scan"
    ↓
LandingPage POST /api/scan { url: 'https://example.com' }
    ↓
routes/scan.js → ScanController.postScan()
    ↓
ScanController validates: ssrfGuard.validate(url) → ok
    ↓
ScanController calls: await this.runner.run(url)
    ↓
ScanRunner.run(url):
    1. Launch Chromium (headless, reuse existing instance)
    2. Open new page
    3. page.goto(url, waitUntil: 'networkidle2', timeout: 30000)
       — Chrome navigates to https://example.com, DOM fully loaded
    4. page.evaluate(axe.run)
       — injects axe-core into the page
       — axe.run(document) checks DOM for accessibility violations
       — returns { violations: [...], passes: [...], incomplete: [], inapplicable: [] }
    5. axeTransformer.transform(rawResults)
       — maps violations → buckets by tag
       — maps passes → whatsGood[]
       — returns { problems: { visualAccessibility, structureAndSemantics, multimedia }, whatsGood }
    6. page.close() — returns page to the pool
    7. return scanResult
    ↓
Express sends HTTP 200 + scanResult JSON
    ↓
Frontend receives, useScan sets data, React re-renders
    ↓
Same buckets render, same cards work — zero frontend changes
```

---

## Why This Architecture Is Helpful

### 1. Changes are localized

Want to change the URL shape (`/api/scan-results` → `/api/results`)? Only `routes/scan.js` changes. The controller, service, and frontend don't know the URL.

Want to change the bucket categories? Only `axeTransformer.js` changes. The controller, route, and frontend don't know the mapping logic.

Want to change from Puppeteer to Playwright? Only `ScanRunner` changes. The controller, transformer, and frontend keep working.

### 2. Each layer is independently testable

| What you're testing | What you fake |
|---|---|
| Routes | `supertest` + a stub controller |
| Controller | inject a `mockScanResults` fixture or stub `runner` |
| `ssrfGuard` | call `validate()` with string inputs |
| `axeTransformer` | feed it a captured axe fixture, no browser needed |
| `useScan` | pass a fake `apiClient` that returns fixture data |
| `ApiClient` | pass a custom `fetchImpl` |

### 3. The frontend is permanently dumb about scanning

The frontend doesn't know about Puppeteer, axe-core, buckets, or SSRF. It just knows:
- `runScan(url)` → returns `ScanResult`
- `getScanResults(url)` → returns `ScanResult`
- `getProblem(id)` → returns `Problem`

This means:
- You can run a real scan against a live URL and the frontend works without changes
- You can mock the entire backend for frontend development (`apiClient` with a fake fetch)
- The team can work on the scanner (backend) and the UI (frontend) independently

### 4. The wire contract is explicit

`shared/types.js` is the only file both sides read. If the frontend expects `data.problems.visualAccessibility`, the backend must produce it. You can't accidentally return a shape the frontend doesn't expect — the JSDoc typedef is documentation that both sides reference.

### 5. Adding Phase 5 (auth, history, Postgres) only touches specific layers

Each phase adds to specific layers without rewriting others:

| Phase | New files | Layers touched |
|---|---|---|
| Phase 2 (real scanner) | `services/scanRunner.js` | service (new), controller (wiring), app.js (DI) |
| Phase 3 (UX improvements) | components, hooks | page, component, hook |
| Phase 4 (reliability) | `services/browserPool.js` | service (new), ScanRunner (uses it) |
| Phase 5 (auth + history) | `routes/auth.js`, `services/authService.js`, `data/userStore.js`, `middleware/requireAuth.js` | route, service, data, middleware |

None of Phase 5 touches `axeTransformer`, `ssrfGuard`, `routes/scan.js`, or any frontend page.

---

## Common Patterns to Remember

**When you're confused about where code goes:**
- HTTP handling → controller
- URL routing → route
- Browser/Puppeteer logic → service (new class)
- DOM checking / axe mapping → service (pure function)
- URL validation → ssrfGuard (pure function)
- React data fetching → hook
- React UI rendering → page or component
- Only place that calls `fetch` → apiClient

**The binding rule:**
Express handlers lose `this` when passed as callbacks. The fix:
```js
// WRONG — this is undefined when Express calls handler
app.post('/api/scan', controller.postScan)

// RIGHT — bound once in constructor
this.postScan = this.postScan.bind(this)
app.post('/api/scan', controller.postScan)
```

**The pure function rule:**
Services like `ssrfGuard` and `axeTransformer` should have no `require()` calls to other project files, no global state, and no I/O. They take inputs and return outputs. This makes them trivially testable.

**The single composition root:**
Never instantiate concrete classes outside `app.js` (or `index.js`). Pass everything via constructor. This is what makes `overrides` work for tests and what allows `mockScanResults` → `runner` to be swapped in one line.