# equalview

An accessibility-focused web application that helps make the web more inclusive for everyone.

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 22+ (for local development without Docker)

### Running the Application

**Option 1: Using Docker (Recommended)**
```bash
git clone https://github.com/codrlabs/equalview.git
cd equalview
docker compose up --build
```

**Option 2: Local Development**

Run the backend and frontend in two terminals.

```bash
# Terminal 1 — backend (Express API on :3000)
cd backend
npm install
npm run dev

# Terminal 2 — frontend (Vite dev server on :5173)
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173` and proxies
`/api` and `/problems` to the backend at `http://localhost:3000`.

## 📁 Project Structure

```
equalview/
├── backend/                          # Node + Express API
│   ├── index.js                      # Bootstrap (load .env, listen)
│   ├── app.js                        # Composition root (DI wiring)
│   ├── routes/                       # Express routers
│   │   ├── index.js                  # Mount /api and /problems
│   │   ├── scan.js                   # POST /api/scan, GET /api/scan-results
│   │   └── problems.js               # GET /problems/:id
│   ├── controllers/
│   │   └── scanController.js         # Class with bound handlers
│   ├── services/
│   │   ├── axeTransformer.js         # Pure: axe → ScanResult shape
│   │   └── ssrfGuard.js              # Pure: URL allow/deny rules
│   ├── data/
│   │   └── mockScanResults.js        # Phase-1 fixture
│   ├── tests/                        # node:test + supertest
│   ├── .env.example
│   ├── Dockerfile
│   ├── README.md
│   └── package.json
├── frontend/                         # React + Vite app
│   ├── src/
│   │   ├── main.jsx                  # React bootstrap
│   │   ├── App.jsx                   # BrowserRouter + Routes
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx
│   │   │   ├── ScanResultsPage.jsx
│   │   │   └── ProblemPage.jsx
│   │   ├── components/
│   │   │   ├── ProblemSolutionPage.jsx
│   │   │   ├── ProblemCategoryBox.jsx
│   │   │   └── WhatsGood.jsx
│   │   ├── hooks/
│   │   │   ├── useScan.js
│   │   │   └── useProblem.js
│   │   ├── lib/
│   │   │   └── apiClient.js          # The only file that imports `fetch`
│   │   ├── utils/
│   │   │   └── urlValidator.js
│   │   ├── data/
│   │   │   └── mockScanResults.js    # Test-only fixture
│   │   ├── styles/
│   │   ├── __tests__/                # Vitest + React Testing Library
│   │   └── setupTests.js
│   ├── vite.config.js
│   └── Dockerfile
├── shared/
│   └── types.js                      # JSDoc Problem / ScanResult / Impact
├── docs/
│   ├── README.md                     # Documentation index
│   ├── guides/                       # How-to guides
│   ├── plans/                        # Tracked implementation roadmaps
│   │   ├── project-roadmap.md
│   │   ├── architecture-map.md
│   │   ├── axecore-integration-roadmap.md
│   │   └── codebase-reorganization.md
│   └── obsidian/                     # Obsidian vault (canvas + scratch notes)
└── docker-compose.yml                # Frontend + backend
```

## 🎯 Overview

This project addresses the gap in web accessibility tools. Many websites
unintentionally exclude people with disabilities, and existing solutions
are often expensive or limited.

### Value Proposition
- Make accessibility testing available to everyone without high costs
- Support developers, testers, and businesses who cannot afford
  $500–5000+/month solutions
- Provide actionable insights and fix suggestions

### Current Status
- **Frontend**: React + Vite app with landing page, scan results view,
  and problem detail route. Routing is `react-router-dom` v7
  (`BrowserRouter` + `Routes` in `src/App.jsx`); pages live in
  `src/pages/`, the scan state machine lives in
  `src/hooks/useScan.js`, and `src/lib/apiClient.js` is the only file
  that calls `fetch`.
- **Backend**: Express API exposing `/health`, `POST /api/scan`,
  `GET /api/scan-results`, and `GET /problems/:id`. Layered into
  `routes/` → `controllers/` → `services/` with a composition root in
  `backend/app.js`. SSRF guard rejects non-http URLs and private hosts
  today; controller still serves the mock fixture from
  `backend/data/mockScanResults.js` until Phase 2 adds the real
  scanner.
- **Real scanning**: Not yet implemented. See
  [`docs/plans/axecore-integration-roadmap.md`](docs/plans/axecore-integration-roadmap.md).

### Planned Features
- Real website analysis using Puppeteer + axe-core
- PDF report generation
- Authentication and rate limiting
- Caching and queueing for scans

## 🛠️ Tech Stack

### Current Stack
- **Frontend**: React 19 + Vite 7
- **Backend**: Node 22 + Express 5
- **Styling**: Plain CSS
- **Testing**: Vitest + React Testing Library (frontend)
- **Container**: Docker (Node 22-alpine) + Docker Compose

### Future Stack
- **Scanner**: Puppeteer + axe-core
- **Database**: PostgreSQL (planned)
- **Auth**: JWT (planned)

## 📋 Development Workflow

1. **Branch from main**: `git checkout -b feat/task-name` (or `fix/`,
   `chore/`, `docs/`)
2. **Implement changes** and add tests where appropriate
3. **Test locally**: `docker compose up --build` or run backend +
   frontend separately
4. **Open a PR**: push the branch and open a pull request — `main` is
   protected
5. **Review and merge**

For details and recovery from common Git mistakes, see
[`docs/guides/workflow.md`](docs/guides/workflow.md).

## 🧪 Testing

```bash
# Frontend
cd frontend
npm test          # Vitest + React Testing Library
npm run lint
npm run build

# Backend
cd backend
npm install
npm run dev       # nodemon
npm test          # node --test (node:test + supertest)
```

## 📚 Documentation

See [`docs/README.md`](docs/README.md) for an index. Highlights:

- [`docs/guides/workflow.md`](docs/guides/workflow.md) — Git/GitHub workflow
- [`docs/guides/axecore-integration.md`](docs/guides/axecore-integration.md) — How-to for the real scanner
- [`docs/plans/project-roadmap.md`](docs/plans/project-roadmap.md) — Phased roadmap (housekeeping → real scanner → UX → reliability → accounts)
- [`docs/plans/architecture-map.md`](docs/plans/architecture-map.md) — Per-screen architecture map and code organization
- [`docs/plans/axecore-integration-roadmap.md`](docs/plans/axecore-integration-roadmap.md) — Sub-roadmap for replacing the mock scanner
- [`docs/plans/codebase-reorganization.md`](docs/plans/codebase-reorganization.md) — Final repo layout after the Phase 1 / Phase 3 reorg
- [`docs/obsidian/`](docs/obsidian/) — Obsidian vault (canvas + supporting notes)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch from `main`
3. Commit your changes
4. Open a Pull Request

## 📋 Accessibility Standards

Following WCAG guidelines:
- **Visual Accessibility**: Contrast ratios, focus indicators
- **Structure & Semantics**: Heading hierarchy, landmarks
- **Multi-media**: Alt text, captions, transcripts

## 📄 License

MPL-2.0 (compatible with commercial use)

## 🙏 Acknowledgments

Built with ❤️ for a more accessible web. Thanks to the accessibility
community for their work in making the web inclusive for everyone.
