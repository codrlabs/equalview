# Core Problem: Why Architecture Matters

> **Note (2026-06):** parts of this guide describe the frontend as it
> was before the design-system UI landed (`pages/` + `components/`,
> `/scan-results`, `/problems/:id`, mock scan data). The concepts and
> the backend walkthroughs still hold; for the current frontend layout
> (`design-system/` + `views/`, `/results`, `/problem/:id`, live
> Puppeteer + axe-core scans) see the top-level [README](../../README.md)
> and [architecture-map.md §4.1](../plans/architecture-map.md).


When you write code without structure, everything touches everything. Want to change how URLs are validated? You find that logic scattered across 10 files. Want to test just the URL validation? You can't — it's tangled with fetch calls and UI rendering.

**Architecture is boundaries.** Each folder has one job, and it does not peek into other folders.

---

## Frontend Stack

### `frontend/src/pages/` — The Blueprint

**Analogy:** The architect's drawing for a specific room. It says "bed here, window there" — but it doesn't know how to build a wall.

**What lives here:** One file per screen. Declares what the user sees and how they move between screens.

**Real-world flow for a "scan results" visit:**
```
User lands on /scan-results?url=example.com
  → pages/ScanResultsPage.jsx mounts
  → reads ?url from the query string
  → calls useScan(url)  [hands off to hooks/]
  → renders what useScan returns (loading, data, or error)
```

**At scale:** `pages/` stays the same regardless of app size. Whether you have 3 pages or 200, each one is still a "this screen looks like this" declaration with no fetch logic. A 200-page app just has 200 files in this folder — the pattern doesn't change.

```jsx
// pages/ScanResultsPage.jsx
export default function ScanResultsPage() {
  const [searchParams] = useSearchParams();
  const url = searchParams.get('url');
  const { data, loading, error } = useScan(url);  // hand off to hook

  if (loading) return <p>Loading...</p>;
  if (error)   return <p>Error: {error}</p>;
  return <ScanResults data={data} />;
}
```

**Origin:** Next.js popularized the `pages/` directory (2016). React Router (2014) existed before, but Next.js made the folder name the convention. Before that, teams used `containers/`, `scenes/`, or `views/`.

**Why:** Without this, your "page logic" (what user sees) is mixed with "data logic" (fetching) and "display logic" (rendering). Each of those is a different job. Boundaries keep them apart.

---

### `frontend/src/components/` — The IKEA Furniture

**Analogy:** Pre-built furniture. A `Malm` dresser works in any room. It has one interface (drawers go in/out) and no opinion about the rest of the house.

**What lives here:** Reusable UI pieces. Props in, JSX out. No fetch, no state, no router.

**Real-world flow — a card on the results page:**
```
ProblemCategoryBox receives "problems" and "title" as props
  → maps through problems
  → renders a ProblemCard for each
  → ProblemCard receives a single problem, renders its title + severity
```

**At scale:** A large app has hundreds of components. The folder structure scales by grouping: `components/forms/`, `components/layout/`, `components/scan-results/`. Each component is still dumb — data comes in, UI goes out. Testing is fast because there's no network, no state, no side effects.

```jsx
// components/ProblemCategoryBox.jsx
export default function ProblemCategoryBox({ problems, title }) {
  return (
    <div className="bucket">
      <h3>{title}</h3>
      {problems.map(p => <ProblemCard key={p.id} problem={p} />)}
    </div>
  );
}

// components/ProblemCard.jsx
export default function ProblemCard({ problem }) {
  return (
    <article className={`severity-${problem.impact}`}>
      <h4>{problem.help}</h4>
      <span className="badge">{problem.impact}</span>
    </article>
  );
}
```

**Origin:** React's defining principle (2013, Facebook). The "dumb component" distinction was popularized by Dan Abramov's "Presentational and Container Components" blog post (2015), which predates hooks.

**Why:** If you need the same card in a modal, in a print view, and in a summary list, you write it once. If a card has a bug, you fix it once. Without components, every screen copies and pastes similar markup — the "copy-paste bug factory" anti-pattern.

---

### `frontend/src/hooks/` — The Waiter

**Analogy:** A waiter at a restaurant. You sit at the table (the page), say "I'd like a scan" (call useScan). The waiter goes to the kitchen (API), waits while the chef cooks (loading), brings you food (data) or says "sorry, kitchen's closed" (error). You don't cook. You just eat.

**What lives here:** Async state machines. Every hook returns `{ data, loading, error }`.

**Real-world flow for fetching scan results:**
```
user opens /scan-results?url=example.com
  → ScanResultsPage renders
  → calls useScan(url)
    → hook sets loading = true
    → calls apiClient.getScanResults(url)
      → apiClient does fetch (the phone call)
    → on success: hook sets data = response, loading = false
    → on error: hook sets error = message, loading = false
  → page renders loading → data → error states
```

**At scale:** Every data source has a hook. `useAuth()`, `useScanHistory()`, `useSettings()`. All follow the same `{ data, loading, error }` contract. When a new intern joins, they don't guess — they read one existing hook and copy the pattern.

```js
// hooks/useScan.js
export function useScan(url) {
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    apiClient.getScanResults(url)
      .then(data => setState({ status: 'ready', data }))
      .catch(err => setState({ status: 'error', error: err.message }));
  }, [url]);

  return {
    data:    state.status === 'ready' ? state.data : null,
    loading: state.status === 'loading',
    error:   state.status === 'error' ? state.error : null,
  };
}
```

**Origin:** Custom hooks were introduced in React 16.8 (2019). The `{ data, loading, error }` shape was popularized by Apollo Client (GraphQL, 2016). Before hooks, this lived in class components with `componentDidMount` (verbose, hard to reuse). Before that, jQuery had no pattern — you just called `$.ajax` anywhere.

**Why:** Encapsulates the messy async lifecycle. Multiple pages can use the same hook. Testing is a function test — no React DOM needed. Without hooks, every page rewrites the same `useEffect + fetch + try/catch` block.

---

### `frontend/src/lib/apiClient.js` — The Hotel Phone

**Analogy:** The hotel's phone system. It's the only device that can call outside. The front desk, housekeeping, and restaurant all use the same phone. If the hotel switches from AT&T to Verizon, only the phone changes.

**What lives here:** The only file that imports `fetch`. Everything else calls `apiClient.methodName()`.

**Real-world flow for getting scan results:**
```
ScanResultsPage needs data
  → calls useScan(url)
    → calls apiClient.getScanResults(url)
      → makes the fetch request: GET /api/scan-results?url=...
      → checks if response is OK (not 404, 500)
      → parses JSON
      → returns parsed data (or throws error)
    → hook receives data, updates state
  → page renders with data
```

**At scale:** Base URLs, auth headers, retry logic, and error interception all live in one place. A 500-developer team doesn't have 500 different fetch wrappers.

```js
// lib/apiClient.js (simplified)
class ApiClient {
  async getScanResults(url) {
    const res = await fetch(`/api/scan-results?url=${encodeURIComponent(url)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
}
```

**Origin:** The "single boundary for external calls" is the **Repository/Gateway Pattern** (Martin Fowler, 2002). The "only this file imports fetch" is a team convention from the **Adapter Pattern** (Gang of Four, 1994). Angular called this a "service" (2010); in React, teams converged on `lib/apiClient` or `services/api`.

**Why:** Without this, `fetch` is scattered across 20 files. Want to add an auth header? Edit 20 files. Want to test a page? You can't easily intercept fetch because it's buried.

---

### `frontend/src/utils/` — The Calculator

**Analogy:** A calculator. 2 + 2 always equals 4. It doesn't care who pressed the buttons or why.

**What lives here:** Pure functions. Same input → same output. No React, no fetch, no state.

**Real-world — checking if a URL is valid:**
```
User types "example.com" in the landing page input
  → LandingPage calls isValidUrl("example.com")
    → tries new URL("example.com")
    → catches error (invalid, no protocol)
    → returns false
  → LandingPage shows validation error
```

**At scale:** A large app has `utils/` for dates, numbers, strings, arrays, and more. All pure, all testable with zero setup. A utility for formatting dates works the same in a React app, a CLI tool, or a Node.js script.

```js
// utils/urlValidator.js
export function isValidUrl(string) {
  try {
    const u = new URL(string);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}
```

**Origin:** The "pure function" concept comes from **functional programming** (Haskell, 1990; lambda calculus by Alonzo Church, 1930s). The "separation of pure logic from effects" was formalized by **Simon Peyton Jones** (Haskell) and popularized in JS by Ramda (2013) and functional React patterns.

**Why:** Pure functions are trivial to test (just pass inputs, assert outputs). They have no hidden dependencies. Without this, URL validation logic is copy-pasted into every form — each with its own subtle bugs.

---

## Backend Stack

### `backend/routes/` — The Hotel Concierge

**Analogy:** The concierge desk at the hotel entrance: "Taxi? Let me get that for you." The concierge doesn't drive the taxi. They just recognize the request and send it to the right person.

**What lives here:** URL patterns and HTTP verbs. One line per route. No parsing, no logic.

**Real-world flow for a POST /api/scan:**
```
Frontend sends POST /api/scan { url: "https://example.com" }
  → Express receives the request
  → routes/scan.js matches POST /api/scan to controller.postScan
  → passes the request to scanController.postScan
  → never touches request data, never calls services
```

**At scale:** A large API has dozens of route files, organized by domain: `routes/auth.js`, `routes/scans.js`, `routes/users.js`. Each file is 20-30 lines. The entire API surface is reviewable in a single scroll.

```js
// routes/scan.js (entire file)
const { Router } = require('express');

function makeScanRouter(controller) {
  const router = Router();
  router.post('/scan', controller.postScan);          // one line = one route
  router.get('/scan-results', controller.getScanResults);
  return router;
}

module.exports = makeScanRouter;
```

**Origin:** RESTful routing in Ruby on Rails (2004) made this mainstream. Express.js's Router (2010) brought the same separation to Node.js. The "minimal routes" convention traces to **Clean Architecture** (Robert C. Martin, 2012).

**Why:** The entire API surface is visible in one glance. Changing a URL from `/api/scan` to `/api/v2/scan` requires one line. Without this, URL strings are scattered in controllers, tests, and documentation — one typo and the frontend calls a non-existent endpoint.

---

### `backend/controllers/` — The UN Translator

**Analogy:** A diplomatic translator at the UN. The French delegate says "We need more funding." The translator converts it to English for the US delegate. They don't decide policy — they translate between formats and decide what's safe to translate.

**What lives here:** Request/response handling. Input validation. JSON formatting. One class per domain.

**Real-world flow for GET /api/scan-results:**
```
Express routes the request to controller.getScanResults(req, res)
  → reads req.query.url
  → validates with ssrfGuard (cheap check)
  → if valid: calls this.runner.run(url)
  → receives raw axe results
  → formats as JSON, sends res.json(result)
  → if invalid: sends res.status(400).json({ error: guard.reason })
```

**At scale:** A large app has controllers for each domain: `AuthController`, `UsersController`, `ScansController`. Each is still thin — most work is delegated to services. Controllers don't write SQL, don't call external APIs, don't contain business logic. They're the translator membrane.

```js
// controllers/scanController.js (relevant methods)
class ScanController {
  async getScanResults(req, res) {
    const { url } = req.query;
    const guard = this.ssrfGuard.validate(url);
    if (!guard.ok) return res.status(400).json({ error: guard.reason });

    const result = await this.runner.run(guard.url.toString());
    return res.json(result);
  }

  async postScan(req, res) {
    const { url } = req.body;
    // same pattern: validate → delegate → respond
  }
}
```

**Origin:** MVC (Model-View-Controller) from Smalltalk-80 (1980). The modern "thin controller" pattern (no business logic, just request/response) was popularized by Rails controllers (2004) and formalized by **Clean Architecture** (2012).

**Why:** HTTP concerns (status codes, headers, body parsing) live in one place. Business logic is tested without Express. Without this, controllers become 500-line "god objects" — when you need a new feature, you edit the same 500 lines everyone else is editing, creating merge conflicts and bugs.

---

### `backend/services/` — The Expert Craftsman

**Analogy:** A master carpenter who builds custom furniture. You describe a chair. The carpenter builds it. They don't care if you're a hotel, office, or home. They just transform your specification into the thing you need.

**What lives here:** Pure business logic. No HTTP, no database, no globals. Same input → same output.

**Real-world flow — transforming axe-core output:**
```
Raw axe results arrive from the scanner:
  {
    violations: [ { id: 'color-contrast', tags: ['cat.color'], ... } ],
    passes: [ { id: 'document-title', help: 'Title present' } ]
  }

services/axeTransformer.js transforms them:
  → groups violations by category (visual, structure, multimedia)
  → maps axe tags to UI buckets
  → extracts "whatsGood" from passes
  → returns a clean ScanResult object
```

**At scale:** A large app has dozens of services: `AuthService`, `PaymentService`, `NotificationService`. Each is injected into controllers. Services can call other services. But they never reach for `req`, `res`, or a database connection directly — those are injected.

```js
// services/axeTransformer.js
function transform(rawAxeResults) {
  return {
    problems: bucketize(rawAxeResults.violations),
    whatsGood: rawAxeResults.passes.map(p => p.help),
  };
}
```

**Origin:** The **Service Layer** from Domain-Driven Design (Eric Evans, 2003) and **Hexagonal Architecture** (Alistair Cockburn, 2005). The "no I/O" rule is **Functional Core, Imperative Shell** (Gary Bernhardt, 2012).

**Why:** Pure functions are trivial to test — feed inputs, assert outputs. Same business rules work whether called from HTTP, a CLI, or a cron job. Without this, business logic is tangled with database queries and HTTP status codes — untestable, unmaintainable, and tied to one delivery mechanism.

---

### `backend/data/` — The Warehouse

**Analogy:** A storage warehouse. Boxes go in, boxes come out. The warehouse doesn't know what's in the boxes. Pricing, selling, and inventory management are somebody else's job. Swapping warehouses (different location, different locks) doesn't stop the store.

**What lives here:** Storage abstraction. Today, mock fixtures. Tomorrow, Postgres. The consumer doesn't care.

**Real-world flow — recording a scan:**
```
Service: "I need to save this scan result"
  → calls scanHistoryStore.record(entry)
  → store adds it to an in-memory array
  → store returns the saved entry

Tomorrow (Phase 5):
  → same call, but store does INSERT INTO scans (...)
  → same call, same return shape
  → the service doesn't know or care
```

**At scale:** A large app has repositories (UserRepository, OrderRepository) or an ORM layer. The principle is the same: one place that talks to the database, everywhere else gets data through the abstraction. Changing from MySQL to MongoDB means replacing one file, not 50.

```js
// data/mockScanResults.js (Phase 1 — in-memory)
// data/scanHistoryStore.js (Phase 5 — database)
const entries = [];

function record(entry) {
  entries.unshift(entry);
  return entry;
}

function list() {
  return entries.slice();  // return copy, not the array itself
}

module.exports = { record, list };
```

**Origin:** The **Repository Pattern** from Domain-Driven Design (Eric Evans, 2003). **Information Hiding** from David Parnas (1972). The mock fixture is a **Test Double** (Gerard Meszaros, 2007).

**Why:** The rest of the app is isolated from storage details. Switching from mock to Postgres means one file changes. Without this, SQL is scattered everywhere — want to add a migration? Good luck tracing through 50 files.

---

### `backend/app.js` — The Hotel Manager

**Analogy:** The hotel manager who introduces everyone and assigns roles. "Maria — kitchen. John — front desk." They don't do the jobs themselves — they just know who does what and how they connect.

**What lives here:** The only file with `new`. The only file that knows concrete classes. Everything else is dependency-injected.

**Real-world flow — building the app:**
```
buildApp() is called (by index.js or tests)
  → creates ssrfGuard instance
  → creates mockScanResults
  → creates scanController, injecting the above
  → creates route, injecting the controller
  → mounts the router on the express app
  → returns the app (ready to listen or test)
```

**At scale:** A large app has 20+ dependencies wired here: database pools, redis, email, logging, monitoring. Each is created once and shared. The manager never gives Maria two kitchens or puts John in both front desk and housekeeping.

```js
// app.js — the composition root
function buildApp(overrides = {}) {
  const app = express();

  // Create dependencies (or use test overrides)
  const ssrfGuard = require('./services/ssrfGuard');
  const mockScanResults = require('./data/mockScanResults');
  const ScanController = require('./controllers/scanController');
  const mountRoutes = require('./routes');

  // Wire together
  const scanController = new ScanController({
    ssrfGuard:   overrides.ssrfGuard   || ssrfGuard,
    mockScanResults: overrides.mockScanResults || mockScanResults,
  });

  mountRoutes(app, { scanController });
  return app;
}
```

**Origin:** **Dependency Injection** (Martin Fowler, 2004) and **Composition Root** (Mark Seemann, *Dependency Injection in .NET*, 2011). The `overrides` parameter for testing is a **Test Seam** (Michael Feathers, *Working Effectively with Legacy Code*, 2004).

**Why:** One place to see how the app is wired. Tests inject fake dependencies without touching real code. Without this, the app is a mess of global require() order — pull one thread and the whole sweater unravels.

---

### `backend/index.js` — The Door Opener

**Analogy:** The person who unlocks the hotel door at 5 AM. That's their entire job. Turn the key, open the door. Minimal, critical, and over quickly.

**What lives here:** Only starts the server and reads environment variables. Zero business logic.

```js
require('dotenv').config();
const { buildApp } = require('./app');

const app = buildApp();
app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
```

**At scale:** Same file, whether the app has 3 routes or 300. It just starts the thing.

**Origin:** C's `main()` function (1970s). The `dotenv` convention from Scott Motte's `dotenv` npm package (2015).

**Why:** Separates "construction" from "listening." Tests call `buildApp()` and inspect the return. Production calls `index.js` which starts listening. Without this, you can't test the app without binding a real port.

---

## Cross-Cutting

### `shared/types.js` — The Dictionary

**Analogy:** A dictionary at an international meeting. Both the French and English speakers look at the same dictionary. If they disagree on a word, they check the dictionary — they don't guess.

**What lives here:** JSDoc typedefs. `ScanResult`, `Violation`, `Problem`. Both frontend and backend import this.

**Real-world flow — both sides read the same contract:**
```
Frontend: "I'm about to render a ScanResult. It has .url, .timestamp, .problems, .whatsGood."
Backend:  "I'm about to return a ScanResult. I'll make sure it has .url, .timestamp, .problems, .whatsGood."
shared/types.js: "Here's what a ScanResult looks like. Both of you, read me."
```

**At scale:** A large app has 50+ types: `User`, `Organization`, `Permission`, `Payment`, `Invoice`, etc. The dictionary prevents drift — frontend adds a field, backend must add it too, or the type checker complains.

```js
// shared/types.js — the contract
/**
 * @typedef {Object} ScanResult
 * @property {string} url
 * @property {string} timestamp
 * @property {Object} problems — keys are category names
 * @property {string[]} whatsGood
 */

// Backend references it:
/** @typedef {import('../../shared/types.js').ScanResult} ScanResult */

// Frontend references it:
/** @typedef {import('../../../shared/types.js').ScanResult} ScanResult */
```

**Origin:** Interface Definition Languages (IDLs) like CORBA (1991) and Protocol Buffers (2001). JSDoc `@typedef` from JSDoc (1999), which traces to JavaDoc (1995).

**Why:** Both sides must agree on data shapes. The dictionary prevents drift — frontend expects `problems` but backend sends `violations`? Bug in production. The dictionary is the check. Without it, frontend and backend evolve independently, each assuming the other hasn't changed.

---

## Why This Matters at Scale

| Scale | What changes | What doesn't change |
|-------|-----------|---------------------|
| **3 features** | Just the relevant files in each layer | The architecture pattern |
| **30 features** | You add files, not complexity | Each file still does one thing |
| **300 features** | Organize into subfolders: `components/scan/`, `hooks/auth/` | The layer rules stay the same |

**The principle is invariant:** each file does one thing, and dependencies flow downward. Pages depend on hooks, not on each other. Services depend on data, not on routes. The shared dictionary is the only thing both sides share.

**Without this separation:**
- A 3-feature app becomes a 30-feature app and suddenly nothing makes sense
- You can't find where the URL validation is because it's in the controller, the page, and the form
- Tests can't run without a real database because the controller reaches directly for a connection
- Changing the database means grepping through 50 files to find every raw query

**With this separation:**
- Adding a feature means adding files, not editing existing ones
- A new developer reads one file in each layer and knows the whole pattern
- Tests run in milliseconds because pure functions need no setup
- Swapping a dependency (database, HTTP library, UI framework) means one file changes
