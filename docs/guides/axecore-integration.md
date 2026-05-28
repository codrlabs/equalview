# Axe Core Integration Architecture

This document describes how axe-core integrates into equalView's layered architecture. The integration transforms equalView from a mock demonstration into a real accessibility scanning engine by injecting axe-core into the backend's scanning pipeline.

## Architecture Overview

equalView follows a clean, layered architecture where dependencies flow inward:

```
┌─────────────────────┐
│    Frontend (FE)     │  React pages, hooks, apiClient
├─────────────────────┤
│    Backend (BE)      │  Express routes, controllers
├─────────────────────┤
│    Services          │  Pure transformation, SSRF guard
├─────────────────────┤
│    Data Layer        │  Mock fixture (Phase 1) → Runtime results (Phase 2)
└─────────────────────┘
```

### Current State (Phase 1)

- `ScanController` returns mock data from `backend/data/mockScanResults.js`
- `axeTransformer.js` exists as a stub with the target transformation shape
- No browser automation or axe-core execution occurs

### Target State (Phase 2)

- `ScanController` instantiates a `ScanRunner` service
- `ScanRunner` orchestrates Puppeteer + axe-core execution
- `axeTransformer` transforms real axe results into equalView's `ScanResult` type
- SSRF guard validates URLs before browser launch

> Notes:
>
> - `ScanRunner` owns the `#browser` field
> - No frontend changes required

## Layer-by-Layer Impact Analysis

### Backend: Route Layer (`backend/routes/scan.js`)

**Status:** No changes required

The existing route definition already handles the correct contract:
- `POST /api/scan` → triggers a scan
- `GET /api/scan-results` → returns scan results

Both routes already forward to controller methods that will be wired to the real runner.

### Backend: Controller Layer (`backend/controllers/scanController.js`)

**Changes Required:**

| Line Reference | Change | Rationale |
|----------------|--------|-----------|
| Constructor | Inject `scanRunner` dependency | Replace mock data with live scanning |
| `postScan()` | Call `this.scanRunner.run(url)` | Execute the actual accessibility scan |
| `getScanResults()` | Call `this.scanRunner.getResults(url)` | Retrieve cached or freshly-scanned results |

The controller's constructor will accept:
```javascript
constructor({ mockScanResults, ssrfGuard, scanRunner })
```

### New File: Scan Runner Service (`backend/services/scanRunner.js`)

**Purpose:** Orchestrate the Puppeteer + axe-core scanning lifecycle.

**Responsibilities:**
1. Validate URL via SSRF guard
2. Launch headless Chromium via Puppeteer
3. Navigate to the target URL
4. Inject axe-core library
5. Execute `axe.run()` with WCAG 2.1 AA tags
6. Transform raw results via `axeTransformer.transform()`
7. Return the equalView-compatible `ScanResult`

**Dependencies:**
- `puppeteer` (direct launch in Phase 2; pool upgrade in Phase 4)
- `axe-core` (injected at runtime, not imported)
- `ssrfGuard` service for URL validation
- `axeTransformer` service for result shaping

### Backend: Existing Transformer Service (`backend/services/axeTransformer.js`)

  **Status:** Already implements the target contract

  This file already contains the `transform(axeResults)` function that:
  - Maps axe violations to equalView problem buckets (`visualAccessibility`, `structureAndSemantics`, `multimedia`)
  - Extracts "what's good" from passing rules
  - Handles `bucketFor(tags)` categorization logic

  **No changes required.** The transformer was designed ahead of the runner.

### Backend: SSRF Guard (`backend/services/ssrfGuard.js`)

  **Status:** No changes required

  The existing guard already:
  - Validates HTTP/HTTPS protocols
  - Blocks private IP ranges (RFC1918, loopback, link-local)
  - Returns typed `{ ok: boolean, reason?: string }` results

  The runner will use this before launching Puppeteer to prevent SSRF attacks.

### Backend: App Composition Root (`backend/app.js`)

  **Changes Required:**

  | Line Reference | Change | Rationale |
  |----------------|--------|-----------|
  | Dependencies | Add `puppeteer` import | Required for browser automation |
  | Composition | Instantiate `ScanRunner` | Wire the new orchestration service |
  | Injection | Pass `scanRunner` to `ScanController` | Enable live scanning in controller |

  **Status:** No changes required

  The mock fixture serves as seed data for local development. In Phase 2:
  - Controller checks if `scanRunner` exists
  - If absent (tests/mocking), falls back to mock data
  - If present, uses live runner (production)

> Note: The `browserPool.js` service is deferred to Phase 4.


## Frontend Impact

### Frontend: API Client (`frontend/src/lib/apiClient.js`)

**Status:** No changes required

The client already defines:
- `runScan(url)` → POST `/api/scan`
- `getScanResults(url)` → GET `/api/scan-results?url=...`

The integration does not change these contracts; it makes the backend fulfill them with real data.

### Frontend: Scan Hook (`frontend/src/hooks/useScan.js`)

**Status:** No changes required

The hook already:
- Fetches via `apiClient.getScanResults(url)`
- Handles loading/error/data states
- Is test-injectable via `{ client }` option

### Frontend: Data Types (`shared/types.js`)

**Status:** No changes required

The `ScanResult` typedef already matches the transformer's output:
- `problems.visualAccessibility[]`, `structureAndSemantics[]`, `multimedia[]`
- `whatsGood: string[]`

The transformer's `transform()` function returns this exact shape.

## Service Interaction Flow

```
User clicks "Scan"
       ↓
[LandingPage.jsx] → navigate(`/scan-results?url=${url}`)
       ↓
[ScanResultsPage.jsx] → useScan(url)
       ↓
[apiClient.getScanResults(url)] → GET /api/scan-results
       ↓
[routes/scan.js] → controller.getScanResults()
       ↓
[scanController.js] → scanRunner.run(url)
       ↓
[scanRunner.run(url)]
       │  ├─ ssrfGuard.validate(url) → guard against SSRF
       │  ├─ launchBrowser() → new Chromium instance
       │  ├─ page.goto(url) → networkidle2
       │  ├─ page.addScriptTag(axe-core) → inject
       │  ├─ page.evaluate(axe.run) → violations + passes
       │  └─ axeTransformer.transform(results) → ScanResult
       ↓
[scanController.js] → res.json(ScanResult)
       ↓
[apiClient] ← ScanResult
       ↓
[ScanResultsPage.jsx] → renders ProblemCategoryBox ×3 + WhatsGood
```

## File Manifest

### Files Modified

| File | Layer | Change Type |
|------|-------|-------------|
| `backend/app.js` | Backend | Wire `ScanRunner` injection |
| `backend/controllers/scanController.js` | Backend | Use runner instead of mock data |

### Files Created

| File | Layer | Purpose |
|------|-------|---------|
| `backend/services/scanRunner.js` | Service | Orchestrate Puppeteer + axe-core (direct browser launch) |

> Note: `browserPool.js` is deferred to Phase 4.

### Files Unchanged

| File | Reason |
|------|--------|
| `backend/routes/scan.js` | Route contract unchanged |
| `backend/services/axeTransformer.js` | Already implements target shape |
| `backend/services/ssrfGuard.js` | No change needed |
| `shared/types.js` | Type contract already matches |
| `frontend/src/lib/apiClient.js` | API contract unchanged |
| `frontend/src/hooks/useScan.js` | Hook contract unchanged |

## Dependency Graph

```
scanRunner.js
    ├─ puppeteer (external)
    ├─ axe-core (external, runtime injection)
    ├─ ssrfGuard.js
    └─ axeTransformer.js

scanController.js
    ├─ scanRunner.js (new)
    ├─ ssrfGuard.js (existing)
    └─ axeTransformer.js (existing)

app.js
    ├─ scanController.js
    └─ scanRunner.js (new)
```

## Testing Strategy

### Unit Tests

| Test File | Tests |
|-----------|-------|
| `backend/tests/axeTransformer.test.js` | Transform violations to problems |
| `backend/tests/ssrfGuard.test.js` | Block private IPs, allow public |
| `backend/tests/scanRunner.test.js` | Mock puppeteer, verify flow |

> Note: `browserPool.test.js` is deferred to Phase 4.

### Integration Tests

| Test File | Scenario |
|-----------|----------|
| `backend/tests/scan.test.js` | POST `/api/scan` returns real results |

### Notes

- Use `overrides` pattern to stub runner in tests"

## Production Considerations

### Resource Limits

| Concern | Mitigation |
|---------|------------|
| Memory usage | Singleton browser, page pooling |
| Scan timeout | `page.setDefaultTimeout(30000)` |
| Concurrent scans | Queue system (BullMQ recommended) |

### Security

| Concern | Mitigation |
|---------|------------|
| SSRF | `ssrfGuard` validates before launch |
| Large payloads | Limit axe-core to WCAG 2.1 AA tags |
| Resource exhaustion | Rate limit by IP, max concurrent scans |

## Rollout Sequence

1. Add `puppeteer` and `axe-core` to `backend/package.json`
2. Implement `scanRunner.js` (orchestration logic)
3. Wire runner in `app.js` composition root
4. Update `scanController.js` to use runner
5. Remove mock data from production path (keep for tests)
6. Add queue system for concurrent scan handling
7. Implement `browserPool.js` (singleton browser)   [Phase 4]

This architecture ensures the axe-core integration slots cleanly into equalView's existing layers without disrupting the frontend's data contract or the shared type definitions.