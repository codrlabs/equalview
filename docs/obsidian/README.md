# Obsidian Vault — equalview

This folder is an [Obsidian](https://obsidian.md) vault used to keep
brainstorming, diagrams, and scratch notes about the codebase in sync with
it as it evolves.

## Contents

- **`equalview.canvas`** — Obsidian canvas with visual diagrams and notes
- **`*.png`** — Images pasted into the canvas for reference
- **`README.md`** — This file

## Current Snapshot (2026-06-04)

## Stack

- **Frontend:** React 19 + Vite 7 + react-router-dom v7 (BrowserRouter + Routes)
- **Backend:** Node 22 + Express 5 + cors + dotenv
- **Scanner (ready):** Puppeteer (headless Chromium) + axe-core injected into page context, transformed by `axeTransformer.js`
- **Styling:** Plain CSS (no UI framework)
- **Container:** Docker (Node 22-alpine) + Docker Compose

## What exists today

### Frontend (`frontend/src/`)
- `src/App.jsx` — BrowserRouter, routes root, /scan-results, /problems/:id, and catch-all
- `src/pages/` — LandingPage, ScanResultsPage, ProblemPage
- `src/components/` — ProblemSolutionPage, ProblemCategoryBox, WhatsGood
- `src/hooks/` — useScan, useProblem
- `src/lib/apiClient.js` — the only file that calls `fetch`
- `src/utils/urlValidator.js` — URL checks before hitting the scanner
- `src/data/mockScanResults.js` — Phase-1 fixture (used by tests)
- `src/styles/` — LandingPage.css, ProblemSolutionPage.css
- Vitest + React Testing Library tests in `src/__tests__/`

### Backend (`backend/`)
- `index.js` — bootstrap, listens on `$PORT`
- `app.js` — composition root: wires CORS, JSON body, /health, routes, services
- `routes/index.js` — mounts /api and /problems routers
- `routes/scan.js` — POST /api/scan, GET /api/scan-results
- `routes/problems.js` — GET /problems/:id
- `controllers/scanController.js` — bound request/response handlers
- `services/scanRunner.js` — orchestrates Puppeteer + axe-core scan lifecycle
- `services/ssrfGuard.js` — pure: URL allow/deny rules (blocks non-http and private hosts)
- `services/axeTransformer.js` — pure: axe results → ScanResult shape used by the API
- `data/mockScanResults.js` — Phase-1 fixture served when real scanner is bypassed
- `models/` — exists, planned for persistence in later phases
- Tests: `tests/health.test.js`, `tests/scan.test.js`, `tests/ssrfGuard.test.js`, `tests/axeTransformer.test.js`

### Shared
- `shared/types.js` — JSDoc definitions for Problem / ScanResult / Impact

## Nature / architecture notes

- Layered backend: routes → controllers → services
- Scanner is wired through the controller; today the controller can serve the
  mock fixture or hand off to `scanRunner.run(url)`.
- `ssrfGuard.js` is the security boundary that rejects non-http URLs and
  private/internal hosts before a scan is allowed.
- `axeTransformer.js` is a pure function mapping axe-core result shape into
  the equalView ScanResult contract.
- `scanRunner.js` is the orchestration layer: validate -> launch browser ->
  bypass CSP -> navigate -> inject axe-core -> run axe -> transform -> close browser.
- The frontend is a single-page app; `/problems/:id` is the main post-scan flow.
- A Phase-2 / Phase-3 reorganization moved the codebase to its current shape
  (see `docs/plans/codebase-reorganization.md`).

## Planned / not yet built

- PostgreSQL persistence (planned for Phase 5+)
- JWT auth + rate limiting
- PDF report generation
- Caching + queueing for scans

## When this doc gets updated

Update this vault when:
- Frontend pages or hooks change
- Backend routes, controller, or services change
- Real scanner behavior changes (Puppeteer or axe-core version bumps)
- The project layout moves again
- Phase boundaries shift

For the formal plan, see
[`docs/plans/project-roadmap.md`](../plans/project-roadmap.md).
For the current canonical README, see
[`../README.md`](../README.md).
