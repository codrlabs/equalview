# Folder Real-World Analogies & Origins

> **Purpose:** For every folder in the EqualView codebase, understand: (1) what it does through a real-world analogy, (2) where this pattern came from historically, and (3) why teams structure code this way.

---

## FRONTEND

### `frontend/src/pages/` — The Blueprint

**Real-world analogy:** An architect's **blueprint for a specific room in a house.**

A bedroom blueprint says "bed goes here, window there, closet on that wall." It doesn't know how bricks are laid, how plumbing works, or where the water comes from — it just says what the finished room should look like and how you move between rooms.

**Example in EqualView:**
```jsx
// LandingPage.jsx — the blueprint for the landing screen
export default function LandingPage() {
  return (
    <main>
      <h1>EqualView</h1>        {/* static title */}
      <UrlInput />               {/* here's the form */}
      <ScanButton />             {/* here's the action */}
    </main>
  );
}
```

**Origin of this pattern:** The "pages" folder name comes from the **Next.js pages directory** (introduced 2016 by Vercel). Next.js popularized mapping files in a `pages/` folder directly to URL routes (`pages/about.jsx` → `/about`). EqualView uses React Router separately, but kept the naming convention. Before that, teams had `containers/` or `scenes/` — but "page" is more intuitive because everyone knows what a web page is.

**Why it's used:**
- Separates "what the user sees and navigates to" from "how it's drawn" and "where the data comes from"
- Makes it obvious which URL leads where — just look at the filename
- Prevents the common bug where UI logic leaks into routing logic
- Without it: you open a file and find fetch calls, CSS, routing, and state all mixed together ("spaghetti code")
- The actual EqualView page: `frontend/src/pages/ScanResultsPage.jsx`

---

### `frontend/src/components/` — The IKEA Furniture

**Real-world analogy:** **IKEA furniture** — pre-built, self-contained pieces that work in any room.

A `Malm` dresser doesn't care if it's in your bedroom, guest room, or a hotel. It has a clear interface: drawers go in/out, that's it. You don't ask it to also make coffee. It has no opinion about the rest of the house.

**Example in EqualView:**
```jsx
// ProblemCategoryBox.jsx — a list of accessibility problems for one category
export default function ProblemCategoryBox({ problems, title }) {
  return (
    <div className="bucket">
      <h3>{title}</h3>
      {problems.map(p => <ProblemCard key={p.id} problem={p} />)}
    </div>
  );
}
```

**Origin of this pattern:** The term "component" comes from **React's core design philosophy** (Facebook, 2013 — by Jordan Walke). React was created to solve the problem of Facebook's notification badges and chat windows that needed independent, reusable pieces. The `Component` idea is older though — it traces to **component-based software engineering** from the 1960s (Douglas McIlroy's "Mass Produced Software Components" speech, 1968). The modern "dumb component" vs "smart component" distinction was popularized by Dan Abramov's "Presentational and Container Components" blog post (2015).

**Why it's used:**
- Reusable — the same `ProblemCard` appears on the results page, in a modal, in a print view
- Testable in isolation — render just `ProblemCard` with fake data, no network
- Composable — pages assemble them like LEGO blocks
- Without it: every screen copies and pastes the same markup, and when you fix a bug in one, the other six still have it
- The actual EqualView components: `ProblemCategoryBox`, `WhatsGood`, `ProblemSolutionPage`

---

### `frontend/src/hooks/` — The Waiter

**Real-world analogy:** A **waiter at a restaurant**.

You're sitting at the table (the page). You tell the waiter, "I'd like the pasta." The waiter walks to the kitchen (API), waits while the chef cooks (loading state), brings you the food (data), or tells you "sorry, we're out" (error). You, at the table, don't go to the kitchen. You don't cook. You just eat when it arrives. The waiter handles all the back-and-forth.

**Example in EqualView:**
```js
// useScan.js — the waiter that fetches scan results
export function useScan(url) {
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    apiClient.getScanResults(url)
      .then(data => setState({ status: 'ready', data }))
      .catch(err => setState({ status: 'error', error: err.message }));
  }, [url]);

  return {
    data: state.status === 'ready' ? state.data : null,
    loading: state.status === 'loading',
    error: state.status === 'error' ? state.error : null,
  };
}
```

**Origin of this pattern:** Custom hooks were introduced in **React 16.8** (February 2019 — by the React team at Meta). Before hooks, this "waiter" logic lived in class components with `componentDidMount`, `componentDidUpdate`, and `componentWillUnmount` — often 100+ lines of lifecycle methods mixed with UI. Dan Abramov and Sophie Alpert's "Making Sense of React Hooks" talk (React Conf 2018) introduced the concept. The `{ data, loading, error }` return shape was popularized by **Apollo Client** (GraphQL library by Meteor Development Group, 2016), then became an industry convention.

**Why it's used:**
- Encapsulates the messy async logic (loading, error, data) into one reusable function
- Multiple pages can use the same hook — no copy-paste
- Hook tests are just function tests — no React DOM needed (mostly)
- Without it: every page rewrites the same `useEffect + fetch + try/catch + setState` — hundreds of lines of duplication
- The actual EqualView hooks: `useScan`, `useProblem`

---

### `frontend/src/lib/apiClient.js` — The Hotel Telephone

**Real-world analogy:** The **hotel telephone system** — the only way any department can call outside.

No department (housekeeping, front desk, restaurant) is allowed to have their own direct line to the outside world. They all use the same hotel phone. The phone handles the connection logic: dialing, busy signals, dropped calls, voicemail. If the hotel switches phone providers (from AT&T to Verizon), only the phone system changes — not every department.

**Example in EqualView:**
```js
class ApiClient {
  async getScanResults(url) {
    const res = await fetch(`/api/scan-results?url=${encodeURIComponent(url)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
}
```

**Origin of this pattern:** The "single boundary for network calls" pattern comes from **Repository Pattern** (Fowler, "Patterns of Enterprise Application Architecture", 2002) and **Gateway Pattern** (Martin Fowler, 2004). In frontend specifically, it evolved from jQuery's `$.ajax` wrappers (2006) to Angular's `$http` service (2010) to modern `fetch` wrappers. The specific "only this file imports fetch" rule is a **team convention** derived from the **Adapter Pattern** (Gang of Four, 1994) — one adapter for the external world, everything else depends on the adapter.

**Why it's used:**
- Centralizes all network logic — one place for base URLs, auth headers, error handling, retries
- Tests can swap the entire backend with a fake in one line: `vi.mock('../lib/apiClient', ...)`
- If you switch from fetch to axios, one file changes
- Without it: `fetch` scattered across 20 files; when the API adds auth headers, you edit 20 places and miss 3
- The actual file: `frontend/src/lib/apiClient.js`

---

### `frontend/src/utils/` — The Calculator

**Real-world analogy:** A **calculator**.

2 + 2 always equals 4. It doesn't matter who's pressing the buttons, why they're adding, or whether it's morning. It doesn't remember what you calculated yesterday. It has no side effects — it doesn't send your numbers to the internet.

**Example in EqualView:**
```js
// urlValidator.js — pure URL sanity check
export function isValidUrl(string) {
  try {
    const u = new URL(string);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}
```

**Origin of this pattern:** The name "utility" comes from **C's `<>` standard library** (1970s), where "utility functions" were generic helpers. The "pure function" concept (same input → same output, no side effects) comes from **functional programming** — roots in **lambda calculus** (Alonzo Church, 1930s), popularized by **Haskell** (1990) and **FP in JavaScript** (Ramda, 2013; Underscore, 2009). The separation of "pure" from "effectful" code was formalized by **Simon Peyton Jones** (Haskell creator) and popularized in frontend by the **"separation of concerns"** principle (Edsger Dijkstra, 1974; David Parnas, 1972).

**Why it's used:**
- Can be tested with zero setup — just pass inputs, assert outputs
- Reused across pages, hooks, even backend if needed
- No dependencies on React, DOM, or network
- Without it: validation logic copy-pasted into every form, each with subtle bugs
- The actual files: `frontend/src/utils/urlValidator.js`

---

### `frontend/src/styles/` — The Paint Swatches

**Real-world analogy:** **Paint swatches and color chips** from a hardware store.

They're organized by room, by brand, by finish. You don't guess what color the bedroom is — you pick from the swatch labeled "Bedroom: Warm Taupe." The painter (the component) doesn't decide the color; the swatch does.

**Example in EqualView:**
```css
/* scanResults.css — everything about how the results page looks */
.scan-results { background: var(--bg); }
.bucket { border: 1px solid var(--border); }
```

**Origin of this pattern:** CSS files per component/page is a convention from the **BEM methodology** (Block-Element-Modifier, Yandex, 2005) and later **CSS Modules** (CSS-in-JS precursor, 2015). The idea that "styles live with the component they style" was popularized by React's **CSS Modules** and later **styled-components** (2016). Before that, all CSS was in one giant `styles.css` file, and changing one thing broke five others.

**Why it's used:**
- Styles are scoped — changing `scanResults.css` won't affect the landing page
- Designers can work independently in CSS files without touching JavaScript
- Without it: a single 1000-line `styles.css` file where changing `h1` color changes every h1 on every page
- The actual files: `frontend/src/styles/scanResults.css`, `landingPage.css`

---

### `frontend/src/__tests__/` — The Crash Test Dummy

**Real-world analogy:** **Crash test dummies** in a car factory.

The car looks fine in the showroom. But does it survive a 40mph crash? Does the airbag deploy? Do the doors open after impact? The dummy doesn't care how pretty the car is — it only cares about the specific thing being tested. And you test *before* you sell the car to humans.

**Example in EqualView:**
```js
// scanResultsPage.test.jsx — crash-test the results page
test('shows loading then renders results', async () => {
  vi.mock('../lib/apiClient'); // swap real API with fake
  apiClient.getScanResults.mockResolvedValue(mockData);
  
  render(<ScanResultsPage />);
  expect(screen.getByText('Fetching...')).toBeInTheDocument();
  
  await waitFor(() => {
    expect(screen.getByText('Color contrast issue')).toBeInTheDocument();
  });
});
```

**Origin of this pattern:** Test-driven development (TDD) was formalized by **Kent Beck** ("Extreme Programming Explained", 1999). React Testing Library (RTL) was created by **Kent C. Dodds** (2018) to replace Enzyme's brittle shallow rendering with "test what the user sees" philosophy. The `{ data, loading, error }` hook shape makes testing predictable, as described in Apollo Client testing docs. The `__tests__` naming (double-underscore) comes from **Jest**'s default folder convention (Facebook, 2014), which Vitest inherited.

**Why it's used:**
- Tests verify the contract (user sees X after Y) without caring about implementation
- Fake `apiClient` means no real backend needed — tests run in milliseconds, not seconds
- Without it: developers manually click through the app, miss edge cases, ship bugs
- The actual tests: `frontend/src/__tests__/scanResultsPage.test.jsx`

---

### `frontend/src/main.jsx` — The Key Turn

**Real-world analogy:** **Turning the car key.**

You put the key in, turn it, and the engine starts. You don't see the ignition system, the fuel injection, or the spark plugs — you just turn the key and expect the car to go. This file is the key turn.

**Example in EqualView:**
```jsx
// main.jsx — turn the key, start the app
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
```

**Origin of this pattern:** The "entry file" concept comes from **C's `main()` function** (1970s — every program needs one starting point). In frontend, it evolved from jQuery's `$(document).ready()` to Single Page Application entry points. Vite (the build tool) expects `main.jsx` or `main.js` as the entry point.

**Why it's used:**
- One clear place where the app starts — no guessing
- Minimal logic — just mount the React tree into the DOM
- Without it: where does the app start? Who mounts what?

---

### `frontend/src/App.jsx` — The Hotel Directory

**Real-world analogy:** The **hotel directory sign** at the entrance.

"Restaurant on the 3rd floor, gym on the 5th, check-in at the front desk." It doesn't build the rooms. It just says "if a guest wants room service, they go to the restaurant. If they want to check in, they go to the desk."

**Example in EqualView:**
```jsx
// App.jsx — the directory of screens
import { BrowserRouter, Routes, Route } from 'react-router-dom';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/scan-results" element={<ScanResultsPage />} />
        <Route path="/problems/:id" element={<ProblemPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

**Origin of this pattern:** React Router was created by **Ryan Florence** and **Michael Jackson** (React Training, 2014) to solve "how does a React app handle URLs without full page reloads?" The `BrowserRouter + Routes + Route` API was redesigned in **React Router v6** (2021) to be more composable. Before that, frontend routing was done with `window.location` hacks or server-side rendering only.

**Why it's used:**
- Declares "what URL leads where" in one place — the directory
- No page knows about other pages' routes — decoupled navigation
- Without it: every link is `window.location.href = ...` and the back button breaks
- The actual file: `frontend/src/App.jsx`

---

## BACKEND

### `backend/routes/` — The Hotel Concierge Desk

**Real-world analogy:** The **concierge desk** at a hotel entrance.

You walk up and say, "I'd like a taxi." The concierge doesn't drive the taxi, doesn't own the taxi, doesn't even know where taxis come from. They just recognize the request ("taxi") and send it to the right person. "Sir, your taxi is outside."

**Example in EqualView:**
```js
// routes/scan.js — the concierge for /api/scan
function makeScanRouter(controller) {
  const router = Router();
  router.post('/scan', controller.postScan);
  router.get('/scan-results', controller.getScanResults);
  return router;
}
```

**Origin of this pattern:** The Router pattern comes from **Ruby on Rails** (David Heinemeier Hansson, 2004), which made RESTful routing (mapping HTTP verbs and URLs to controller actions) a mainstream convention. Express.js's `Router` (2010 — by TJ Holowaychuk) brought this to Node.js. The "routes only know URLs, everything else delegates" separation was formalized by the **Clean Architecture** (Robert C. Martin, 2012) and **Hexagonal Architecture** (Alistair Cockburn, 2005).

**Why it's used:**
- The API surface is instantly reviewable — just open routes files
- Changing a route URL doesn't require touching the controller logic
- Without it: URL strings scattered in controllers, typos in routes, no clear boundary
- The actual files: `backend/routes/scan.js`, `backend/routes/problems.js`

---

### `backend/controllers/` — The Translator

**Real-world analogy:** A **diplomatic translator at the UN**.

A delegate from France says (in French), "We need more funding for climate." The translator converts it to English for the US delegate. They don't decide what the policy is — they just translate between languages. They also decide if something is too rude to translate (validation), and format the response diplomatically (JSON response).

**Example in EqualView:**
```js
// scanController.js — the UN translator
class ScanController {
  async getScanResults(req, res) {
    const { url } = req.query;                    // read French
    const guard = this.ssrfGuard.validate(url);    // check if allowed
    const result = await this.runner.run(guard.url.toString()); // ask for policy
    return res.json(result);                         // translate to English (JSON)
  }
}
```

**Origin of this pattern:** The **Controller** concept comes from **MVC (Model-View-Controller)** from **Smalltalk-80** (1980 — Alan Kay at Xerox PARC). The modern "Controller as request/response handler with no business logic" separation traces to **Rails controllers** (2004) and **ASP.NET MVC** (2008). Express.js's `req, res` pattern (2010) merged with this. The `this`-binding fix (binding in constructor) is a specific pattern from **JavaScript closures and class methods** — documented heavily in EqualView's `axecore-integration.md` as a known footgun.

**Why it's used:**
- HTTP concerns (status codes, headers, body parsing) live in one place
- Business logic stays out — test it with no Express, no fake `req`/`res`
- Without it: controllers become 500-line "god objects" knowing everything about everything
- The actual file: `backend/controllers/scanController.js`

---

### `backend/services/` — The Expert Craftsman

**Real-world analogy:** A **master carpenter** who builds custom furniture.

You describe a chair ("oak, armless, padded"). The carpenter builds it. They don't care if you're a hotel, an office, or a home — they just build the chair. They don't know about your interior design, they don't order the wood. They transform your specification into the thing you need.

**Example in EqualView:**
```js
// axeTransformer.js — transform raw axe output to our API shape
function transform(rawAxeResults) {
  return {
    problems: bucketize(rawAxeResults.violations),
    whatsGood: rawAxeResults.passes.map(p => p.help),
  };
}
```

**Origin of this pattern:** The "service as pure business logic" idea comes from the **Service Layer** in **Domain-Driven Design** (Eric Evans, 2003) and **Clean Architecture** (Robert C. Martin, 2012). The strict "no I/O, no HTTP, no globals" rule is **Functional Core, Imperative Shell** (Gary Bernhardt, 2012) and **Hexagonal Architecture** (Alistair Cockburn, 2005). The name "service" is from **Java EE** (1999) and **Spring** (2002), where "services" were stateless business logic beans.

**Why it's used:**
- Pure functions are trivial to test — just pass inputs, assert outputs
- Same business rules work whether called from HTTP, a CLI tool, or a cron job
- Without it: business logic mixed with network calls — untestable, unmaintainable
- The actual files: `backend/services/axeTransformer.js`, `backend/services/ssrfGuard.js`

---

### `backend/data/` — The Warehouse

**Real-world analogy:** A **storage warehouse** behind the store.

Boxes go in, boxes come out. The warehouse doesn't know what's in the boxes, doesn't price them, doesn't sell them. Inventory management is somebody else's job. If you swap one warehouse for another (different location, different locks), the store keeps running.

**Example in EqualView:**
```js
// mockScanResults.js — the warehouse containing sample data
module.exports = {
  url: 'https://example.com',
  problems: { /* ... */ },
  whatsGood: [/* ... */],
};
```

**Origin of this pattern:** The **Data Access Layer** or **Repository Pattern** comes from **Enterprise Design Patterns** (Martin Fowler, 2002). The "data as abstracted storage" concept is from **Information Hiding** (David Parnas, 1972) — how data is stored is an implementation detail. The mock fixture specifically is a **Test Double** (Gerard Meszaros, 2007) — a fake version of real data for development and testing.

**Why it's used:**
- Abstracts WHERE data lives (in-memory mock today, Postgres tomorrow)
- Without it: every service writes raw SQL or filesystem access — changing databases means touching every file
- The actual file: `backend/data/mockScanResults.js`

---

### `backend/tests/` — The QA Lab

**Real-world analogy:** An **automotive QA testing lab**.

Before a car ships, engineers put it through simulated crashes, extreme temperatures, salt spray, and vibration tests. They don't care how pretty the car looks — they care if it survives the test. Every car goes through the same tests. If a car fails, they fix it before it reaches customers.

**Example in EqualView:**
```js
// scan.test.js — test the /api/scan endpoint
app.test('POST /api/scan returns scan result', async () => {
  const res = await request(app).post('/api/scan').send({ url: 'https://a.com' });
  expect(res.statusCode).toBe(200);
  expect(res.body.problems).toBeDefined();
});
```

**Origin of this pattern:** Automated testing was invented by **Dijkstra** and **Knuth** (1960s) but popularized for web by **JUnit** (Kent Beck and Erich Gamma, 1997) and **RSpec** for Ruby (2005). **Supertest** (2011) was created to test Express apps without real HTTP servers. The "test at the HTTP boundary" approach is **Integration Testing** (ISTQB, 2007) — testing how layers work together.

**Why it's used:**
- Verifies the whole pipeline (route → controller → service → data) works together
- Catches bugs at boundaries that unit tests miss
- Without it: bugs reach production, discovered by users
- The actual files: `backend/tests/scan.test.js`, `backend/tests/ssrfGuard.test.js`

---

### `backend/app.js` — The Hotel Manager

**Real-world analogy:** The **hotel manager** who introduces everyone and assigns roles.

"Maria, you're kitchen. John, you're front desk. Sarah, you're housekeeping." The manager knows everyone by name, but doesn't DO their jobs. They hire and fire (dependency injection). If the hotel expands (new features), they add new people. If someone calls in sick (missing dependency), they handle it.

**Example in EqualView:**
```js
// app.js — the manager who wires everything together
function buildApp(overrides = {}) {
  const app = express();
  const scanController = new ScanController({ ssrfGuard, mockScanResults });
  mountRoutes(app, { scanController });
  return app;
}
```

**Origin of this pattern:** The **Composition Root** is from **Dependency Injection** (Martin Fowler, "Inversion of Control", 2004) and **Clean Architecture** (Robert C. Martin, 2012). The specific "buildApp() returns app" pattern is from **Express testing best practices** (2010s) and popularized by the **12-Factor App** methodology (Heroku, 2011). The `overrides` parameter is a **Test Seam** (Michael Feathers, "Working Effectively with Legacy Code", 2004) — a hook specifically for testing.

**Why it's used:**
- One place to see how the whole app is wired — no global state hunting
- Tests inject fake dependencies without touching real code
- Without it: global variables, `require` chains you can't untangle, tests that fight the real world
- The actual file: `backend/app.js`

---

### `backend/index.js` — The Door Opener

**Real-world analogy:** The **person who unlocks the hotel door at 5am**.

That's their entire job. Turn the key, open the door, say "good morning." They don't greet guests, they don't cook breakfast, they just start the day. Minimal, critical, and over quickly.

**Example in EqualView:**
```js
// index.js — unlock the door and start listening
require('dotenv').config();
const { buildApp } = require('./app');

const app = buildApp();
app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
```

**Origin of this pattern:** The "entry point" file is universal — every program needs one. The split between `index.js` (bootstrap) and `app.js` (application logic) is specific to **Express testing** — separating "building the app" from "starting the server" lets tests use `buildApp()` without real ports. The `dotenv` package (2015 by Scott Motte) introduced the `.env` file convention for config.

**Why it's used:**
- Separates "construction" from "listening" — tests use `app`, production uses `index`
- Without it: tests try to start real servers on occupied ports, failing randomly
- The actual file: `backend/index.js`

---

## CROSS-CUTTING

### `shared/types.js` — The Dictionary

**Real-world analogy:** A **dictionary at an international meeting**.

Both the French and English speakers look at the same dictionary. If they disagree on what a word means, they don't guess — they check the dictionary. If the dictionary is wrong, they update the dictionary, not how they use the word.

**Example in EqualView:**
```js
// shared/types.js — the dictionary both sides agree on
/**
 * @typedef {Object} ScanResult
 * @property {string} url
 * @property {string} timestamp
 * @property {BucketedProblems} problems
 */
```

**Origin of this pattern:** Shared types are from **Interface Definition Languages** (IDLs) like **CORBA** (1991) and **Protocol Buffers** (Google, 2001). In JavaScript, JSDoc `@typedef` is from **JSDoc** (Michael Mathews, 1999), which evolved from **JavaDoc** (1995). The "shared between frontend and backend" convention is from **GraphQL schemas** (Facebook, 2015) and **tRPC** (2022) — "one source of truth for the API contract."

**Why it's used:**
- Frontend and backend can't drift on data shapes — the contract is in one file
- IDEs and type checkers use it for autocomplete
- Without it: frontend expects `problems` but backend sends `violations` — runtime errors in production
- The actual file: `shared/types.js`
