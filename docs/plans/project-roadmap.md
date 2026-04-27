# EqualView Project Roadmap

**Status:** Active
**Sub-roadmaps:** [`axecore-integration-roadmap.md`](axecore-integration-roadmap.md)

## What we are building

EqualView is a web app that does one thing end-to-end:

1. The user pastes a URL on the landing page.
2. The backend loads that page in a headless browser and runs
   [axe-core](https://github.com/dequelabs/axe-core) against it.
3. The user lands on a results screen showing the accessibility issues
   found, grouped and prioritized, with a clear recommendation and a
   link to a deeper explanation for each issue.

Everything else in this roadmap exists to make that flow work, then to
make it robust, then to make it shippable.

## What axe-core actually returns

Source: [axe-core API docs](https://github.com/dequelabs/axe-core/blob/develop/doc/API.md).
This is the ground truth that the response shape and the results UI
must be designed around.

`axe.run()` resolves to a single results object containing **four
arrays of rule results**:

| Array          | Meaning                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------ |
| `violations`   | Rules that failed. These are the "problems" the user came for.                                   |
| `passes`       | Rules that succeeded — useful for a "what's good" panel.                                         |
| `incomplete`   | Rules axe could not decide automatically. Should be surfaced as **"needs manual review"**.       |
| `inapplicable` | Rules that did not apply (e.g. video rules on a page with no video). Usually not shown to users. |

Plus metadata: `url`, `timestamp`, `testEngine`, `testEnvironment`,
`testRunner`, `toolOptions`.

Each entry inside any of those four arrays has the same shape:

- `id` — rule identifier (e.g. `color-contrast`, `image-alt`,
  `button-name`).
- `description` — what the rule checks.
- `help` — short, human-readable description of the failure.
- `helpUrl` — link to a Deque University page with explanation and
  remediation guidance. **This is the "recommendation link" we display
  per issue.**
- `impact` — `"minor" | "moderate" | "serious" | "critical"` (or `null`
  on a pure pass). This drives sort order and badge color.
- `tags` — e.g. `wcag2a`, `wcag2aa`, `cat.color`, `best-practice`.
  Useful for filtering and for grouping into WCAG-aligned categories.
- `nodes[]` — every element on the page that triggered the rule. Each
  node carries:
  - `html` — the offending HTML snippet.
  - `target` — CSS selector(s) to locate the element (handles iframes
    and shadow DOM).
  - `failureSummary` — pre-formatted "Fix any of the following: …"
    text.
  - `any` / `all` / `none` — sub-checks with their own
    `id`/`impact`/`message`/`data`/`relatedNodes`.

The headline implication for our UI: **per violation we already have a
title (`help`), severity (`impact`), explanation link (`helpUrl`),
WCAG/category tags, and a list of offending elements with selectors and
HTML**. We do not need to invent recommendations — axe gives us the
data and Deque University owns the long-form remediation content.

## How to use this document

- **Maintainer**: pick the lowest-numbered unchecked item in the
  current phase. One item = one branch = one PR. Branch names:
  `feat/*`, `fix/*`, `chore/*`, `docs/*`. Always branch from `main`.
- **Intern contributors**: only pick items from the "🎓 Intern tasks"
  block at the end of each phase unless told otherwise. They are scoped
  to be self-contained and low-risk.
- **Done means merged to `main` via PR**, not just pushed.

## Guiding principles

1. Ship the smallest correct change. No speculative abstractions.
2. Every phase ends in something demoable end-to-end (URL in →
   results page out).
3. Decisions get recorded here or in a sub-roadmap, not in chat.
4. Tests come in alongside the code that needs them, not "later".

## Open decisions (lock in before they block a phase)

These gate specific phases. Until resolved, leave the corresponding
checkboxes unchecked.

- [ ] **Frontend routing**: keep `window.location.pathname` switch in
      `App.jsx` or adopt `react-router`? A real scan should produce a
      shareable results URL, which favors a router. (Blocks Phase 3.)
- [ ] **Scan API shape**: now that we know axe's native shape (above),
      pick one:
      - **A.** Pass through axe's four arrays largely as-is and let the
        frontend group/sort. Flexible, less backend logic, but the
        response is large.
      - **B.** Keep the current bucketed shape
        (`{ problems: { visualAccessibility, structureAndSemantics, multimedia }, whatsGood }`)
        and map axe `tags` → buckets in
        `services/axeTransformer.js`. Smaller payload, opinionated UI,
        but loses `incomplete` and per-node detail unless we extend it.
      - **C.** Hybrid: bucketed summary **plus** the raw axe arrays
        under `raw`, so the UI can drill in. (Blocks Phase 2.)
- [ ] **Sync vs async scan**: does `POST /api/scan` block, or return a
      `jobId` to poll? Default: sync with a generous timeout for Phase
      2; revisit in Phase 5. (Blocks Phase 2.)
- [ ] **SSRF policy**: confirm the URL allow/deny rules — block
      `file://`, `data:`, private IP ranges, `localhost`, and require
      `http(s)`. (Blocks Phase 2.)
- [ ] **Backend test runner**: Jest + supertest (matches the existing
      guide) vs Vitest. Default: Jest + supertest. (Blocks Phase 1.)

---

## Phase 0 — Housekeeping (in flight)

Goal: a clean repo that an outsider can read in 10 minutes.

- [x] Remove root `package.json` / `package-lock.json` and stale
      `TODO.md`.
- [x] Extract mock payload to `backend/data/mockScanResults.js`.
- [x] Rewrite top-level `README.md`; add `docs/README.md` index.
- [x] Add `docs/plans/axecore-integration-roadmap.md`.
- [x] Add this file (`docs/plans/project-roadmap.md`).
- [x] Add `docs/plans/architecture-map.md` (screens, flow, code map).
- [x] **Repo cleanup pass**:
  - [x] Rename `frontend/src/_tests_/` → `frontend/src/__tests__/`
        (single-underscore folder was a typo of the standard
        convention; Vitest picks tests up via the `*.test.jsx` glob).
  - [x] Delete `frontend/src/_tests_/doc/test.md` — a stray markdown
        file inside the tests folder describing tests that no longer
        match the current components.
  - [x] Retire `docs/guides/architecture.md`. It predated the real
        backend ("Future: Express.js"), listed a stale frontend file
        tree, and is now fully superseded by
        [`docs/plans/architecture-map.md`](architecture-map.md).
  - [x] Rename `docs/research/Healcode.canvas` →
        `docs/research/equalview.canvas` so it matches the project
        name and the reference in `docs/research/README.md`.
  - [x] Tidy `backend/package.json`: set `author` to `"Codr Labs"`,
        drop the placeholder `"keywords": []`, fix the `license` to
        `MPL-2.0`, and replace the failing-by-default `test` script
        with a no-op note pointing at Phase 1.
  - [x] Confirm `frontend/`'s `react-router` / `react-router-dom`
        deps stay (already installed; unblocks the Phase 3 routing
        work without re-running `npm install`).
- [ ] Open PR for the cleanup + this roadmap update and merge.

**Done when:** the cleanup PR is merged into `main` and
`frontend/src/__tests__/` is the canonical test folder.

### 🎓 Intern tasks after Phase 0

Pick any of these as a "good first issue". Each is a separate branch +
PR.

- [ ] Add a `LICENSE` file at repo root matching the MPL-2.0 line in
      `README.md`.
- [ ] Add a `CONTRIBUTING.md` that summarizes
      [`docs/guides/workflow.md`](../guides/workflow.md) (branch
      naming, one-issue-one-PR, never push to `main`).
- [ ] Add a `.editorconfig` (2-space indent, LF endings, final
      newline).
- [ ] Add issue + PR templates under `.github/` (just markdown, no
      automation).
- [ ] Audit `docs/guides/axecore-integration.md` and open issues for
      any file path it references that doesn't exist yet (these are
      Phase 1 deliverables — the intern just files the issues).
- [ ] Proofread all of `docs/` and submit a single docs-polish PR
      (typos, broken links, dead anchors). Run links manually; do not
      add tooling.

---

## Phase 1 — Backend foundations for a real scanner

Goal: structure the backend so a real scanner can drop in without
rewriting routing and so we can write tests for it.

Depends on: open decision *Backend test runner*.

- [ ] Split `backend/index.js`: move route handlers into
      `backend/routes/scan.js` (`express.Router`).
- [ ] Add `backend/controllers/scanController.js` that today still
      returns `mockScanResults` — same response, just relocated. Bind
      handlers correctly (avoid the known `this`-binding bug
      documented in
      [`axecore-integration.md`](../guides/axecore-integration.md)).
- [ ] Add `backend/services/axeTransformer.js` as a stub with a typed
      input → output contract derived from the axe shape above. Cover
      it with a unit test using a captured axe payload as a fixture.
- [ ] Wire up the chosen test runner (`npm test` in `backend/`) and
      add one supertest hitting `/health`.
- [ ] Add `backend/.env.example` documenting `PORT` and
      `FRONTEND_ORIGIN`; make `index.js` read `FRONTEND_ORIGIN` for
      CORS with a default of `http://localhost:5173`.
- [ ] Add `backend/Dockerfile` and update `docker-compose.yml` to
      build it (no Puppeteer system deps yet — those land in Phase 2).

**Done when:** `npm test` passes in `backend/`, `docker compose up`
still serves the same JSON, and the file layout matches the "target"
section of [`axecore-integration-roadmap.md`](axecore-integration-roadmap.md).

### 🎓 Intern tasks after Phase 1

- [ ] Write supertests for the existing endpoints (`POST /api/scan`,
      `GET /api/scan-results`, `GET /problems/:id`) asserting the
      mock shape. These keep us honest when the real scanner replaces
      the mock.
- [ ] Add a `backend/README.md` with "how to run", "how to test", and
      the env-var table from `.env.example`.
- [ ] Add a frontend Vitest test for `ScanResults.jsx` that renders
      the mock fixture and asserts the three buckets are visible.
- [ ] Replace the 1.2 s `setTimeout` in `landingPage.jsx` with a named
      constant + comment (no behavior change), so Phase 3 has a clear
      thing to delete.

---

## Phase 2 — Real axe-core scanner (MVP)

Goal: `POST /api/scan { url }` returns real axe-core results from a
live page, and the existing results screen renders them.

Depends on: open decisions *Scan API shape*, *Sync vs async*, *SSRF
policy*. Implementation detail lives in
[`axecore-integration-roadmap.md`](axecore-integration-roadmap.md);
this phase is the high-level checkpoint.

- [ ] Complete Phase 1 of `axecore-integration-roadmap.md`
      (Puppeteer + axe wired in behind the existing API).
- [ ] `services/axeTransformer.js` implements the chosen response
      shape (Option A/B/C from the open decision). At minimum it must
      preserve, per violation: `id`, `help`, `helpUrl`, `impact`,
      `tags`, and `nodes[].{html, target, failureSummary}`.
- [ ] SSRF guard implemented and tested.
- [ ] One end-to-end smoke test against a known-bad fixture page and
      a known-clean fixture page.
- [ ] `mockScanResults.js` is only imported by tests, not by the
      running server.

**Done when:** the frontend, unchanged, displays real axe findings —
each with a title, severity, "learn more" link to `helpUrl`, and the
offending element(s) — for a real URL submitted from the landing page.

### 🎓 Intern tasks after Phase 2

- [ ] Build a tiny static "bad page" and "good page" in
      `backend/tests/fixtures/` and document how to point a manual
      scan at them.
- [ ] Write a guide `docs/guides/running-a-scan-locally.md` walking a
      new contributor through firing a scan end-to-end and reading
      the output.
- [ ] Add empty-state and error-state UI to `ScanResults.jsx` (no
      findings / scan failed) using the new error responses.

---

## Phase 3 — UX upgrades

Goal: the app feels like a product, not a demo.

Depends on: open decision *Frontend routing*.

- [ ] Resolve the routing question; if `react-router`, migrate
      `App.jsx` and remove the pathname switch.
- [ ] Replace the landing-page `setTimeout` with real navigation tied
      to scan submission state (loading → results, with progress).
- [ ] Surface axe-core `incomplete` results as a "Needs manual
      review" bucket.
- [ ] Each problem links to its axe `helpUrl`; severity rendered as
      a colored badge driven by `impact`.
- [ ] Sort violations by `impact` (`critical` → `serious` →
      `moderate` → `minor`); allow filtering by WCAG `tags`
      (`wcag2a`, `wcag2aa`, `best-practice`).
- [ ] Pass an a11y audit on our own pages — run axe against
      `http://localhost:5173`.

**Done when:** a non-technical user can paste a URL, see a loading
state, and land on a results page they can share by URL.

### 🎓 Intern tasks after Phase 3

- [ ] Add focus-visible styles and a "skip to main content" link on
      the landing page.
- [ ] Add basic `<title>` and `<meta name="description">` per route.
- [ ] Write a Vitest test asserting the "Needs manual review" bucket
      renders when the fixture contains `incomplete` items.
- [ ] Add a small "About / How this works" page reachable from the
      landing page.

---

## Phase 4 — Reliability

Goal: the scanner doesn't fall over on real-world sites.

- [ ] Per-request timeout for `page.goto` and an overall scan budget.
- [ ] Concurrency cap on Puppeteer instances (single browser,
      multiple pages, capped).
- [ ] Structured logging: URL, duration, violation counts, error
      class.
- [ ] Friendly error responses for DNS failure, navigation timeout,
      non-2xx status.
- [ ] CI runs backend + frontend tests on every PR.

**Done when:** scanning the top 20 sites from a chosen list either
returns results or returns a categorized error — never a 500.

### 🎓 Intern tasks after Phase 4

- [ ] Add a status badge to the README for the CI workflow.
- [ ] Write `docs/guides/troubleshooting-scans.md` cataloguing each
      error class and what it means.
- [ ] Add a small load-test script (Node, no new deps if possible)
      that fires N concurrent scans against a local fixture and
      reports timing.

---

## Phase 5 — Accounts & scan history

Goal: a returning user can log in and see every scan they have run.

This is the first phase that requires a database. It also introduces
two new screens (Sign in / Sign up, My scans) — see
[`architecture-map.md`](architecture-map.md) §2.4 and §2.5.

Open decisions for this phase:
- [ ] **Auth provider**: build it ourselves (JWT + bcrypt + Postgres),
      or delegate to a managed provider (e.g. Clerk, Auth0, Supabase
      Auth)? Trade-off: control vs time-to-shipping.
- [ ] **Anonymous scans**: do we still allow scanning without an
      account (results not saved), or is login required? Default:
      anonymous scans stay allowed; logged-in scans are persisted.
- [ ] **Data model minimum**: `users(id, email, password_hash,
      created_at)` + `scans(id, user_id, url, created_at,
      results_json)`. Add columns only when a feature needs them.

Deliverables:

- [ ] Postgres added to `docker-compose.yml`; migrations tool chosen
      (e.g. `node-pg-migrate` or Prisma).
- [ ] Schema for `users` and `scans` (see data model above).
- [ ] Auth endpoints: `POST /api/auth/signup`, `POST /api/auth/login`,
      `POST /api/auth/logout`, `GET /api/auth/me`. JWT in an
      httpOnly cookie.
- [ ] Persistence: when an authenticated user hits `POST /api/scan`,
      the result is stored against their user id.
- [ ] History endpoints: `GET /api/scans` (list mine, paginated),
      `GET /api/scans/:id` (one of mine), `DELETE /api/scans/:id`.
- [ ] Frontend: Sign in / Sign up screen, My scans screen, header
      shows logged-in state and a "My scans" link.
- [ ] Re-opening an old scan loads the persisted JSON — no re-scan
      unless the user explicitly re-runs it.

**Done when:** a returning user can log in, see a list of every URL
they've scanned with date and headline counts, click one, and land on
the same results screen they saw the first time.

### 🎓 Intern tasks after Phase 5

- [ ] Add a "Forgot password" stub screen (UI only, wire later).
- [ ] Add a small "delete my account" flow under a settings page.
- [ ] Write end-user docs: "your account and your scan history" in
      `docs/guides/`.

---

## Phase 6 — Hardening & production polish

Goal: something we could put a domain in front of.

- [ ] Cache scan results by URL (TTL, in-memory first, swap later) so
      anonymous re-scans of the same URL are cheap.
- [ ] Per-IP rate limiting on `/api/scan`; per-user rate limiting on
      authenticated scans.
- [ ] Background job queue (e.g. BullMQ) for slow sites; revisit
      sync vs async API decision.
- [ ] PDF report generation for a completed scan.
- [ ] Deployment story documented in `docs/guides/deployment.md`.

**Done when:** the app is running on a real domain, scans are queued,
and known abuse vectors (huge sites, scan floods) are bounded.

### 🎓 Intern tasks after Phase 6

- [ ] Add a "recent public scans" list on the landing page (read-only,
      from cache).
- [ ] Write end-user docs: "how to read your accessibility report" in
      `docs/guides/`.
- [ ] Set up a simple component gallery for the result-page
      components.

---

## Cross-cutting work (any phase)

These don't belong to a single phase — pick them up opportunistically.

- [ ] Keep `README.md` and `docs/README.md` in sync with reality.
- [ ] When a sub-roadmap finishes, link it from this file as
      "complete" rather than deleting it.
- [ ] Every new env var lands in `backend/.env.example` in the same
      PR.

## Change log for this roadmap

- _2026-04-27_ — Phase 0 housekeeping followup: removed dead UI from
  `landingPage.jsx` (placeholder Problems / What's Good sections that
  never render once the page redirects) and the no-op "Download PDF
  Report" button from `ScanResults.jsx` (PDF is Phase 6); deleted the
  stale `landingPage.test.jsx` (case-mismatched import + assertions
  against UI that no longer exists — replaced by the Phase 1 intern
  task to test `ScanResults.jsx`); trimmed dead mocks from
  `problemSolutionPage.test.jsx`; clarified that
  `frontend/src/data/mockScanResults.js` is a Vitest-only fixture
  mirroring the backend mock; fixed the `docs/research/README.md`
  guides link; corrected the README project-structure tree (no
  `backend/Dockerfile` yet, surfaced `main.jsx` / `setupTests.js`,
  listed all three plans).
- _2026-04-26_ — Phase 0 housekeeping cleanup pass landed: tests
  folder renamed to `__tests__/`, stale `docs/guides/architecture.md`
  retired, research canvas renamed to `equalview.canvas`,
  `backend/package.json` tidied, README links to all three plans.
- _2026-04-26_ — Initial version. Phase 0 in flight; Phases 1–5
  drafted; product definition and axe-core output shape pinned down;
  open decisions enumerated.
