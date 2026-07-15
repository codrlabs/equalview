# URL Normalization

How vizably lets users type `example.com` on the landing page without
requiring the `https://` prefix, while still only ever sending fully
qualified http(s) URLs to the backend.

> Originally written as a proposal against the pre-design-system
> `LandingPage.jsx`. The feature now lives in the design-system frontend
> (`views/LandingView.jsx`); this guide documents the implemented
> behavior.

## Where it lives

```
User types "example.com" and clicks Scan
        ↓
[views/LandingView.jsx] → normalizeUrl("example.com") → "https://example.com"
        ↓                      (null → inline validation error, no request)
[App.jsx handleScan] → apiClient.runScan(normalized) → POST /api/scan
        ↓
[Backend pipeline] → SSRF guard re-validates → Puppeteer + axe-core scan
        ↓
[scanAdapter.toScanViewModel] → /results report view
```

The frontend check is a convenience layer only — the backend SSRF guard
(`backend/services/ssrfGuard.js`) remains the source of truth and
re-validates every URL it receives.

## API — `frontend/src/utils/urlValidator.js`

### `isValidUrl(input): boolean`

True only for parseable URLs with an `http:` or `https:` protocol.
Rejects non-strings, empty input, other schemes (`file:`, `javascript:`),
and filesystem-style paths (`C:\…`, `/usr/...`, `./relative`).

### `normalizeUrl(input): string | null`

| Input | Result |
|-------|--------|
| `"example.com"` | `"https://example.com"` |
| `"  wikipedia.org "` | `"https://wikipedia.org"` (trimmed) |
| `"https://example.com/path"` | unchanged |
| `"http://example.com"` | unchanged (explicit http is respected) |
| `"not a url"`, `"justaword"` | `null` |
| `""`, non-string input | `null` |
| `"localhost:3000"` | `null` — see below |

Rules:

1. Non-string or empty input → `null`.
2. If the input has no `http(s)://` prefix, `https://` is prepended.
3. The candidate must pass `isValidUrl`.
4. The hostname must be dot-separated (`([\w-]+\.)+[\w-]{2,}`), so bare
   words don't pass.

`localhost` (and loopback/private addresses generally) are intentionally
rejected: the backend SSRF guard blocks them anyway, so accepting them
client-side would only trade an instant inline error for a slower
backend one.

## UI behavior — `frontend/src/views/LandingView.jsx`

- `normalizeUrl` returning `null` shows the inline error
  *"That doesn't look like a URL — try https://example.com"* and no
  request is made.
- On success the normalized URL (never the raw input) is passed to
  `onScan`, flows into `POST /api/scan`, and is echoed in the
  `/results?url=…` query parameter so refreshes re-fetch the same URL.
- A failed scan surfaces the error inline and returns the form to idle.

## Tests

| File | Covers |
|------|--------|
| `frontend/src/__tests__/urlValidator.test.js` | `isValidUrl` + `normalizeUrl` table above, non-string input, Windows/Unix paths, localhost rejection |
| `frontend/src/__tests__/landingView.test.jsx` | invalid input → error without scanning; bare domain → `onScan("https://…")`; pending-scan spinner; failure → inline error |

Run with `npm test` in `frontend/`.
