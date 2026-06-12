# URL Normalization Architecture

This document describes how to implement URL normalization for the landing page input, allowing users to enter URLs like "example.com" without requiring the "https://" protocol prefix.

## Architecture Overview

The URL normalization feature enhances the frontend input handling layer by normalizing user input before validation and submission. This follows equalView's layer-by-layer architecture:

```
┌─────────────────────┐
│    Frontend (FE)     │  React pages, validation utilities
├─────────────────────┤
│    Backend (BE)      │  Express routes, controllers (unchanged)
├─────────────────────┤
│    Services          │  SSRF guard, scanning (unchanged)
└─────────────────────┘
```

### Current State

- `LandingPage.jsx` uses `isValidUrl(url)` which rejects URLs without protocol
- `urlValidator.js` throws on `new URL("google.com")` because it lacks a protocol
- Error message: "That doesn't look like a URL — try https://example.com"
- URL is passed directly to navigation without normalization

### Target State

- URLs without protocol are normalized to `https://<input>` before validation
- Same validation rules apply after normalization (http/https only, SSRF protection at backend)
- More helpful error message: "Please enter a valid website address"
- Normalized URL is passed to navigation

## Layer-by-Layer Impact Analysis

### Frontend: URL Validator Utility (`frontend/src/utils/urlValidator.js`)

**Changes Required:**

| Change | Rationale |
|--------|-----------|
| Add `normalizeUrl(input)` function | Prepend "https://" to bare domain inputs |

The validator will normalize URLs by detecting if input lacks a protocol (starts with a letter, contains no `://`) and prepending `https://`.

```javascript
// urlValidator.js — proposed API
// normalizeUrl: Prepends https:// to bare domain inputs
// Accepts: "google.com", "example.org", "localhost:3000"
// Rejects: "not-a-url" (no dots, doesn't look like a domain)
export function normalizeUrl(input) {
  if (typeof input !== 'string' || input.trim() === '') return ''
  const trimmed = input.trim()
  // Already has protocol - return as-is
  if (trimmed.includes('://')) return trimmed
  // Bare domains: must start with letter and have at least one dot or be localhost
  if (/^[a-zA-Z]/.test(trimmed) && (trimmed.includes('.') || trimmed.startsWith('localhost'))) {
    return `https://${trimmed}`
  }
  return ''
}

// isValidUrl: Validates URL has valid http/https protocol
// Note: Caller should normalize URL first if protocol is optional
export function isValidUrl(input) {
  if (typeof input !== 'string' || input.trim() === '') return false
  try {
    const u = new URL(input)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}
```

### Frontend: Landing Page (`frontend/src/pages/LandingPage.jsx`)

**Changes Required:**

| Line Reference | Change | Rationale |
|----------------|--------|-----------|
| `handleScan()` | Use `normalizeUrl` before navigation | Send normalized URL to backend |
| Line 20 | Update error message | More helpful without protocol hint |

The handleScan function will normalize the URL before validation and navigation:

```javascript
const handleScan = () => {
  if (!url.trim()) return

  const normalized = normalizeUrl(url)
  if (!isValidUrl(normalized)) {
    setValidationError('Please enter a valid website address')
    return
  }
  setValidationError('')

  setScanStatus('scanning')
  setTimeout(() => {
    navigate(`/scan-results?url=${encodeURIComponent(normalized)}`)
  }, SCAN_REDIRECT_DELAY_MS)
}
```

### Backend: No Changes Required

The backend SSRF guard (`backend/services/ssrfGuard.js`) already validates the normalized URL after it arrives. Since we normalize to `https://`, the backend receives a fully-formed URL and applies its security checks.

## File Manifest

### Files Modified

| File | Layer | Change Type |
|------|-------|-------------|
| `frontend/src/utils/urlValidator.js` | Frontend | Add `normalizeUrl()`, update `isValidUrl()` |
| `frontend/src/pages/LandingPage.jsx` | Frontend | Normalize URL in handleScan, update error message |

### Files Created

| File | Layer | Purpose |
|------|-------|---------|
| `frontend/src/__tests__/LandingPage.test.jsx` | Frontend | Test URL normalization behavior |

### Files Unchanged

| File | Reason |
|------|--------|
| `frontend/src/lib/apiClient.js` | API contract unchanged |
| `frontend/src/hooks/useScan.js` | Hook contract unchanged |
| `backend/*` | Backend receives normalized URLs, no change needed |

## Service Interaction Flow

```
User types "google.com" and clicks Scan
        ↓
[LandingPage.jsx] → normalizeUrl("google.com") → "https://google.com"
        ↓
[isValidUrl("https://google.com")] → validates → true
        ↓
[LandingPage.jsx] → navigate(`/scan-results?url=https://google.com`)
        ↓
[ScanResultsPage.jsx] → useScan(url)
        ↓
[apiClient.getScanResults(url)] → GET /api/scan-results
        ↓
[Backend pipeline] → validates normalized URL via SSRF guard → scan
```

## Testing Strategy

### Unit Tests

| Test File | Tests |
|-----------|-------|
| `frontend/src/__tests__/urlValidator.test.js` | Normalize bare domains, reject invalid inputs |
| `frontend/src/__tests__/LandingPage.test.jsx` | Integration test for handleScan with normalization |

### Test Cases for urlValidator.test.js

| Input | Expected Output |
|-------|-----------------|
| `"google.com"` | Normalized to `"https://google.com"` |
| `"example.org"` | Normalized to `"https://example.org"` |
| `"localhost:3000"` | Normalized to `"https://localhost:3000"` |
| `"https://example.com"` | Unchanged (already has protocol) |
| `"http://example.com"` | Unchanged (already has protocol) |
| `"not-a-url"` | Returns `''` (no dots, doesn't look like domain) |
| `"192.168.1.1"` | Not normalized (starts with number) |

### Test Cases for LandingPage.test.jsx

| Scenario | Expected Behavior |
|----------|------------------|
| User enters "google.com" and submits | Navigates to `/scan-results?url=https://google.com` |
| User enters "example.org" and submits | Navigates to `/scan-results?url=https://example.org` |
| User enters "localhost:3000" and submits | Navigates to `/scan-results?url=https://localhost:3000` |
| User enters "not-a-url" and submits | Shows validation error |
| User enters empty string | No action |

## Implementation Sequence

1. Add `normalizeUrl()` function to `urlValidator.js`
2. Update `handleScan()` in `LandingPage.jsx` to normalize before navigation
3. Update error message in `LandingPage.jsx`
4. Add test cases to `urlValidator.test.js`
5. Create `LandingPage.test.jsx` with integration tests
6. Run `npm run lint` and `npm test` to verify