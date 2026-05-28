/**
* ScanRunner — Orchestrate the Puppeteer + axe-core scanning lifecycle.

* Responsibilities:
*   - validates URL via SSRF guard
*   - Launch headless Chromium via Puppeteer
*   - Navigate to the target URL
*   - Inject axe-core library into the page context
*   - Execute axe.run() with WCAG 2.1 AA tags
*   - Transform raw results via axeTransformer.transform()
*   - Return the equalView-compatible ScanResult
*/

