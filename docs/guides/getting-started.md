# Getting Started

This guide gets you from `git clone` to a running app and a green
test suite, in under 15 minutes. It assumes nothing.

If you only have 5 minutes, do **§1, §2, §3** and skip the rest.

---

## 1. Prerequisites

You need **one** of the following two setups installed:

- **Recommended:** Docker Desktop ≥ 4.30 (which ships Docker Compose
  v2). One install, no Node version juggling.
- **Local Node:** Node.js **22+** and npm **10+**. Check with
  `node -v && npm -v`. Anything older will fail Vite 7 / React 19.

You also need:

- `git` on your `PATH`.
- A modern browser (Chrome, Firefox, or Edge — the dev tools matter
  more than the brand).

You do **not** need: Postgres, Puppeteer, axe-core, a `.env` file, or
any cloud account. Phase 5 will add Postgres; nothing else is on the
horizon.

---

## 2. Clone the repo

```bash
git clone https://github.com/codrlabs/equalview.git
cd equalview
```

The folder layout is documented in the
[onboarding guide §3](intern-onboarding-post-reorg.md#3-folder-by-folder-tour).
You don't need to read that yet — come back after the app is running.

---

## 3. Run the app

Pick **one** of the two options below.

### Option A — Docker (recommended)

One command, zero local Node setup:

```bash
docker compose up --build
```

First run takes 2–3 minutes (downloading `node:22-alpine`, installing
deps inside both containers). Subsequent runs are seconds.

When you see lines like:

```
backend-1   | Server is running on port 3000
frontend-1  |   ➜  Local:   http://localhost:5173/
```

…the app is up. Open <http://localhost:5173>.

To stop: `Ctrl+C`, then `docker compose down`.

### Option B — Local Node (no Docker)

Two terminals, run both at once:

```bash
# Terminal 1 — backend (Express on :3000)
cd backend
npm install
npm run dev

# Terminal 2 — frontend (Vite on :5173)
cd frontend
npm install
npm run dev
```

`npm run dev` on the backend uses `nodemon` and reloads on save.
Vite hot-reloads the frontend the same way. Open <http://localhost:5173>.

> **No `.env` file needed for Option A or B.** Defaults are
> `PORT=3000` and `FRONTEND_ORIGIN=http://localhost:5173`. If you
> want to change either, copy `backend/.env.example` to `backend/.env`
> and edit it (Docker reads it via the volume mount; local Node reads
> it via `dotenv`).

---

## 4. Smoke-test it end-to-end

You should see this much working today, with **mock data** behind
every scan (the real scanner is Phase 2):

1. Open <http://localhost:5173>. The landing page loads.
2. Paste any valid URL (e.g. `https://example.com`) and submit.
3. You land on `/scan-results?url=https://example.com`.
4. The page shows three buckets — Visual Accessibility, Structure &
   Semantics, Multi-media — populated from the mock fixture in
   [`backend/data/mockScanResults.js`](file:///c%3A/Users/nidal/Documents/GitHub/codrlabs/open-solutions/equalview/backend/data/mockScanResults.js).
5. Click any problem card. You navigate to `/problems/:id` and see
   the detail view.

If any of those steps doesn't work, jump to **§7 Troubleshooting**.

### Verify the API directly

```bash
curl http://localhost:3000/health
# → {"status":"okay","message":"Server is running!"}

curl "http://localhost:3000/api/scan-results?url=https://example.com"
# → JSON with { problems: { ... }, whatsGood: [...] }

curl "http://localhost:3000/api/scan-results?url=http://127.0.0.1"
# → 400 {"error":"Private/loopback hosts are not allowed"}
```

That last call exercises the SSRF guard
([`backend/services/ssrfGuard.js`](file:///c%3A/Users/nidal/Documents/GitHub/codrlabs/open-solutions/equalview/backend/services/ssrfGuard.js))
— it should refuse to scan loopback or private IPs.

---

## 5. Run the tests

Both test suites should be green on a fresh clone. **Run them before
your first edit** so you know what "all green" looks like locally.

```bash
# Backend (node:test + supertest, no Jest)
cd backend
npm test

# Frontend (Vitest + React Testing Library, no Jest)
cd frontend
npm test -- --run
npm run lint
npm run build
```

Those four commands are what every PR has to keep green. If you ever
see "all tests pass" with no test count, double-check the runner
actually executed something — `npm test` exiting silently is usually
a script misconfiguration, not a clean run.

---

## 6. Make your first change (smoke check)

Don't open a real PR yet — this is just to confirm your edit loop
works:

1. Open
   [`backend/services/ssrfGuard.js`](file:///c%3A/Users/nidal/Documents/GitHub/codrlabs/open-solutions/equalview/backend/services/ssrfGuard.js)
   and add a `console.log('ssrfGuard hit', input);` at the top of
   `validate`.
2. Save. `nodemon` (or Docker's bind mount) picks it up.
3. Hit `curl "http://localhost:3000/api/scan-results?url=https://example.com"`.
4. You should see the log line in the backend terminal.
5. Revert the change before committing — `git checkout -- backend/services/ssrfGuard.js`.

If hot-reload didn't fire, see §7.

---

## 7. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `EADDRINUSE :::3000` | Another process is on port 3000 | `lsof -i :3000` (macOS/Linux) or `netstat -ano \| findstr :3000` (Windows), kill it, retry |
| `EADDRINUSE :::5173` | Same, on port 5173 | Same as above |
| Frontend loads but POST/GET to backend fails with CORS error | Backend not running, or `FRONTEND_ORIGIN` doesn't match the Vite URL | Confirm backend is on `:3000` and `FRONTEND_ORIGIN=http://localhost:5173` |
| Docker build fails on `node:22-alpine` pull | Network / Docker Hub rate limit | Wait a minute and retry, or `docker login` |
| `nodemon: command not found` running `npm run dev` | Backend deps weren't installed | `cd backend && npm install` again |
| Vite reports `Failed to resolve import "react"` | Frontend deps weren't installed | `cd frontend && npm install` |
| Tests pass locally but say "0 tests" | Wrong CWD — `npm test` must be run inside `backend/` or `frontend/` | `cd` into the right folder |
| Hot-reload doesn't fire under Docker on Windows | Bind mounts on WSL2 sometimes miss events | Save the file twice, or restart `docker compose up` |

If you're still stuck after 15 minutes, that's a sign the docs need
updating — open an issue with the exact command and the exact error.
That's a contribution, not a bug report against you.

---

## 8. Where to look next

Now that the app runs, in this order:

1. **[Onboarding guide §1–§4](intern-onboarding-post-reorg.md)** —
   the 30-second pitch, the at-a-glance diagram, and the
   folder-by-folder tour. ~15 minutes to read.
2. **[Onboarding guide §5](intern-onboarding-post-reorg.md#5-walkthrough--adding-a-feature-end-to-end)** —
   a 13-step walkthrough that adds a feature across every layer.
   Read it; don't implement it. It's a reference, not a homework
   assignment.
3. **[Onboarding guide §6](intern-onboarding-post-reorg.md#6-walkthrough--replacing-the-mock-with-axe-core)** —
   the same shape, for the upcoming Phase 2 work (real scanner).
4. **[`workflow.md`](workflow.md)** — branch naming, PR rules, and
   the "git went sideways, what now" recipes.
5. **[`docs/plans/project-roadmap.md`](../plans/project-roadmap.md)** —
   what to actually work on. Pick the lowest-numbered unchecked item
   in the current phase, or any `good-first-issue` on the GitHub
   issue tracker.

---

## TL;DR

```bash
git clone https://github.com/codrlabs/equalview.git
cd equalview
docker compose up --build           # → http://localhost:5173
# in another terminal:
cd backend  && npm test
cd frontend && npm test -- --run
```

Green? You're ready to read the [onboarding guide](intern-onboarding-post-reorg.md).
