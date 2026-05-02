# Thinking in Architecture (intern primer)

> Hacking your way through "until it works" is a great instinct. This
> doc adds the second instinct on top: **before you touch a file, ask
> which layer it belongs to**. If you can name the layer, you'll know
> where the change goes — and which files you must *not* touch.

This is a 5-minute companion to
[`intern-onboarding-post-reorg.md`](intern-onboarding-post-reorg.md).
Read that first for the deep dive; come back here when you pick up an
issue and need to ask "where does this go?"

---

## 1. The mental model in one sentence

> **Each file does one thing, and dependencies point downward only.**

Backend: `route → controller → service → data`.
Frontend: `page → hook → lib/apiClient → (network)`.
Shared: `shared/types.js` (the wire-shape contract).

If your change is touching files in **three different layers at once**,
stop — you probably collapsed two responsibilities into one. Split the
change.

```diagram
              ╭──────────────────────╮
              │  shared/types.js     │  ← the contract (no deps)
              ╰──────────┬───────────╯
                         │
       ╭─────────────────┴────────────────╮
       ▼                                  ▼
╭───────────────╮                 ╭─────────────────╮
│   FRONTEND    │   HTTP (JSON)   │    BACKEND      │
│               │ ◀─────────────▶ │                 │
│ pages         │                 │ routes          │
│   ↓           │                 │   ↓             │
│ hooks         │                 │ controllers     │
│   ↓           │                 │   ↓             │
│ lib/apiClient │                 │ services        │
│   ↓           │                 │   ↓             │
│ utils (pure)  │                 │ data            │
╰───────────────╯                 ╰─────────────────╯
```

---

## 2. The "which layer?" cheat sheet

Ask these questions **in order**. Stop at the first "yes."

**Backend**

1. Does it change a URL or HTTP verb? → `routes/`
2. Does it parse `req.body`, validate input, or shape `res.json(...)`?
   → `controllers/`
3. Is it a pure rule (same input → same output, no I/O)? →
   `services/`
4. Is it just data (fixture, schema, seed)? → `data/`
5. Is it `new ...()` wiring or DI overrides? → `app.js` (composition
   root — the *only* file that does this)
6. Is it `process.env`, `listen`, `dotenv`? → `index.js`

**Frontend**

1. Is it a new screen or a new URL? → `pages/` + a route in
   [`App.jsx`](file:///c%3A/Users/nidal/Documents/GitHub/codrlabs/open-solutions/equalview/frontend/src/App.jsx)
2. Is it `{ data, loading, error }` for an API call? → `hooks/`
3. Does it import `fetch`? → **must** be
   [`lib/apiClient.js`](file:///c%3A/Users/nidal/Documents/GitHub/codrlabs/open-solutions/equalview/frontend/src/lib/apiClient.js).
   Nowhere else.
4. Is it dumb UI (props in, JSX + events out)? → `components/`
5. Is it a pure helper (no React, no I/O)? → `utils/`
6. Is it CSS scoped to one screen? → `styles/`
7. Is it a static file (image, font)? → `assets/`

**Shared**

- Did the wire shape between frontend and backend change? →
  [`shared/types.js`](file:///c%3A/Users/nidal/Documents/GitHub/codrlabs/open-solutions/equalview/shared/types.js)
  *first*. Then ripple outward.

---

## 3. Worked examples (the open GitHub issues)

For each open issue, the same drill: **which layers? in what order?
what stays untouched?** That last question is the architectural one.

### Issue #15 — "Make URL input accept `example.com` without `https://`"

**Layer:** frontend, `utils/` only.

- Edit
  [`utils/urlValidator.js`](file:///c%3A/Users/nidal/Documents/GitHub/codrlabs/open-solutions/equalview/frontend/src/utils/urlValidator.js)
  to prepend `https://` when the user input has no scheme, then
  validate.
- Add a test in `__tests__/`.
- **Do not touch:** `pages/`, `hooks/`, `apiClient`, backend.
  The page and hook keep calling `isValidUrl(input)` exactly as
  before.

> Pattern: a one-layer change is the *best* change. If you found
> yourself editing `LandingPage.jsx` to `if (!input.startsWith(...))`,
> you smuggled domain logic into a page. Push it down to `utils/`.

### Issue #16 — "Replace mock data with actual axe-core scanning"

**Layers:** `services/` (new), `lib/` (new adapter),
`controllers/` (one line), `app.js` (DI), `tests/`. Frontend: **zero
changes**.

This is the canonical example — it's why the reorg happened. Full
recipe in
[`intern-onboarding-post-reorg.md` §6 Steps 4–7](intern-onboarding-post-reorg.md#L1073-L1207)
and
[`axecore-integration.md`](axecore-integration.md). The summary:

1. New `services/scanRunner.js` — pure: `run(url) → axe results`.
2. New `lib/puppeteerPageDriver.js` — the *only* file importing
   `puppeteer`.
3. Fill in the `services/axeTransformer.js` stub.
4. In
   [`scanController.postScan`](file:///c%3A/Users/nidal/Documents/GitHub/codrlabs/open-solutions/equalview/backend/controllers/scanController.js#L41),
   replace the `// TODO(Phase 2)` block with
   `await this.runner.run(url)`.
5. Wire `runner` into `new ScanController({...})` inside
   [`app.js`](file:///c%3A/Users/nidal/Documents/GitHub/codrlabs/open-solutions/equalview/backend/app.js).
6. Tests: pure `scanRunner.test.js` + HTTP `scan.axe.test.js` using
   `buildApp({ runner: fakeRunner })`.

> Pattern: the frontend doesn't change because the wire shape
> (`ScanResult`) didn't change. **That's the architecture earning its
> keep.** If the frontend *did* need to change, that's a signal to fix
> `shared/types.js` first.

### Issue #18 — "Improve scanning UX with skeleton loaders"

**Layer:** frontend, `pages/` + `components/` + `styles/`.

- The hook
  [`useScan`](file:///c%3A/Users/nidal/Documents/GitHub/codrlabs/open-solutions/equalview/frontend/src/hooks/useScan.js)
  already returns `loading: true`. **Don't add new state.**
- New dumb component `components/SkeletonCard.jsx`.
- In
  [`ScanResultsPage.jsx`](file:///c%3A/Users/nidal/Documents/GitHub/codrlabs/open-solutions/equalview/frontend/src/pages/ScanResultsPage.jsx),
  render `<SkeletonCard />` while `loading`.
- Add `styles/skeleton.css`.
- **Do not touch:** backend, `apiClient`, `useScan`.

> Pattern: when the state machine already gives you what you need
> (`loading`/`error`/`data`), pure-UI features stay above the hook
> layer.

### Issue #7 — "Add working PDF download button"

**Layers:** depends on the call. Two valid architectures:

**Option A (frontend-only, recommended for v1):**

- New `lib/pdfExporter.js` — pure: `(scanResult) → Blob`. Wraps
  `jsPDF` or similar.
- New `components/DownloadPdfButton.jsx` — takes `scanResult` as a
  prop, calls `pdfExporter`, triggers a `<a download>`.
- Render it in `pages/ScanResultsPage.jsx`.
- **Do not touch:** backend, `apiClient`.

**Option B (backend renders the PDF):**

- New `services/pdfRenderer.js` — pure: `(scanResult) → Buffer`.
- New route `GET /api/scan-results.pdf` in `routes/scan.js`.
- Controller method that returns
  `res.type('application/pdf').send(buf)`.
- Wire renderer in `app.js`.
- Frontend: `apiClient.downloadPdf(url)` → `<a href>` opens it.

> Pattern: ask "is this a presentation concern (frontend) or a
> shared/headless concern (backend)?" Pick the layer that matches —
> don't split a feature across both unless you must.

### Issue #25 — "User Panel — Reports, Scans & Data Persistence"

**Layers:** all of them. This is a *cross-cutting* feature, which means
**don't write code first — extend `shared/types.js` first.**

1. **`shared/types.js`** — add `User`, `StoredScan` typedefs (the
   onboarding doc already lists these as planned).
2. **Backend `data/`** — switch the mock fixture for a real store
   (SQLite/Postgres adapter). Keep the file as the *only* place that
   talks to the DB.
3. **Backend `services/`** — new `userService`, `scanRepository`. Pure
   modules; the data layer is injected.
4. **Backend `controllers/` + `routes/`** — `GET /api/users/me`,
   `GET /api/users/me/scans`, etc. Auth middleware in `app.js`.
5. **Frontend `lib/apiClient.js`** — add the new methods.
6. **Frontend `hooks/`** — `useCurrentUser`, `useScanHistory`. Same
   `{ data, loading, error }` shape.
7. **Frontend `pages/UserPanel.jsx`** + components + route in
   `App.jsx`.

> Pattern: a feature touching every layer should *grow downward from
> the contract*. Edit `shared/types.js` → backend layers bottom-up →
> frontend layers top-down. If you find yourself editing a `page` and
> a `data` file in the same commit, your change is too wide.

### Issue #23 — "Update Obsidian canvas with current codebase state"

**Layer:** docs only — `docs/research/equalview.canvas`.

> Pattern: docs are a layer too. They have their own home
> (`docs/guides`, `docs/plans`, `docs/research`). Don't sneak
> architecture diagrams into source files.

---

## 4. The two questions to ask before *every* PR

1. **Which layer(s) am I touching, and why?**
   If you can't name them, you're hacking. Step back.
2. **What am I *not* touching?**
   That's how you prove the architecture is doing its job. The axe-core
   swap (Issue #16) doesn't touch the frontend — that's the win.

If those two answers are short and crisp, the PR will be too.

---

## 5. Tools to think with

- **Before editing a function:**
  `gitnexus_impact({target: "fnName", direction: "upstream"})` — shows
  every caller. Required by [`AGENTS.md`](../../AGENTS.md).
- **Before committing:**
  `gitnexus_detect_changes()` — confirms your diff only touches the
  layers you intended.
- **"Where does X live?"**
  `gitnexus_query({query: "X"})` — process-grouped, faster than grep.

---

## 6. Anti-patterns to call out in review

| Smell | What it really means |
|---|---|
| `fetch(...)` outside `lib/apiClient.js` | network leaked into a page or hook |
| `req`/`res` inside `services/` | controller logic leaked into a service |
| `new ScanController(...)` outside `app.js` | DI bypassed — tests will fight you later |
| Hook returns something other than `{ data, loading, error }` | every page now consumes results differently |
| `window.location = ...` in a page | router bypassed; back button breaks |
| Validation logic inside a `pages/*.jsx` | belongs in `utils/` (e.g. `urlValidator`) |
| Frontend changed for a backend-only feature | wire shape probably drifted — fix `shared/types.js` first |

---

## 7. TL;DR for the intern

> Read the file path before you read the file. The path tells you the
> layer. The layer tells you the rules. The rules tell you what you
> can and cannot touch. *That* is thinking in systems.
