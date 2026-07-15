# Obsidian Vault — vizably

This folder is an [Obsidian](https://obsidian.md) vault used to keep
brainstorming, diagrams, and scratch notes about the codebase in sync with
it as it evolves.

## Contents

- **`vizably.canvas`** — Obsidian canvas with visual diagrams and notes
- **`*.png`** — Images pasted into the canvas for reference
- **`README.md`** — This file

## Current Snapshot (2026-06-12)

## Stack

- **Frontend:** React 19 + Vite 7 + react-router v7, design-token CSS (light/dark), self-hosted Public Sans + JetBrains Mono, lucide-react icons
- **Backend:** Node 22 + Express 5 + cors + dotenv
- **Scanner (live):** Puppeteer (headless Chromium) + axe-core injected into page context, transformed by `axeTransformer.js`
- **Container:** Docker (Node 22-alpine) + Docker Compose

## What exists today

### Frontend (`frontend/src/`)
- `src/App.jsx` — BrowserRouter; routes /, /results, /problem/:id, /story, /donate, /signin, /connect, /dashboard, /account, /privacy, /terms, 404; theme + placeholder-auth state
- `src/design-system/` — UI kit: Logo, Badge, Button, Card, Input, CodeBlock, ProblemRow, ScoreDial, SeverityBadge
- `src/views/` — one component per screen: AppShell, LandingView, ResultsView, ProblemView, StoryView, DonateView, SignInView, ConnectView, DashboardView, AccountView, LegalView, NotFoundView
- `src/hooks/useScan.js` — loading / error / data state machine (used for /results deep links)
- `src/lib/apiClient.js` — the only file that calls `fetch`
- `src/lib/scanAdapter.js` — backend ScanResult → report view model (counts, score, WCAG from axe tags)
- `src/lib/icons.jsx` — lucide wrapper + inlined GitHub / Google brand marks
- `src/utils/urlValidator.js` — isValidUrl + normalizeUrl (bare domains → https://)
- `src/data/placeholders.js` — auth/storage placeholder data (Phase 5 replaces it)
- `src/styles/` — theme.css (design tokens, dark mode, base layer), fonts.css
- Vitest + React Testing Library tests in `src/__tests__/`
- Root `vizably_App.html` is the design-kit bundle this UI was ported from

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
  the vizably ScanResult contract (now including per-violation `count`).
- `scanRunner.js` is the orchestration layer: validate -> launch browser ->
  bypass CSP -> navigate -> inject axe-core -> run axe -> transform -> close browser.
- The frontend is a single-page app; Landing runs `POST /api/scan` and the
  `/results?url=…` route re-fetches on refresh so reports are shareable;
  `/problem/:id` is the post-scan detail flow.
- Sign-in → Connect storage → Dashboard is a UI placeholder: the flow and
  copy are final, but no OAuth or storage backend exists yet.

## Planned / not yet built

- OAuth (GitHub / Google) + scans saved to user-owned storage
  (private repo / Drive) — replaces `src/data/placeholders.js`
- Rate limiting
- PDF report generation (browser print works via "Download PDF")
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
