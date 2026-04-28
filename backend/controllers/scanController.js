/**
 * ScanController — owns request/response for the scan endpoints.
 *
 * Today it delegates to the mock fixture; in Phase 2 the constructor
 * will accept a `runner` (`ScanRunner`) and call `runner.run(url)`.
 *
 * Methods are bound in the constructor so they can be passed directly
 * to `app.post('/api/scan', ctrl.postScan)` without losing `this`.
 * See docs/guides/axecore-integration.md for the bug pattern this
 * sidesteps.
 */
class ScanController {
  /**
   * @param {object} deps
   * @param {object} deps.mockScanResults  Phase-1 fixture; replaced in Phase 2
   * @param {{ validate: (s: string) => { ok: boolean, reason?: string } }} [deps.ssrfGuard]
   */
  constructor({ mockScanResults, ssrfGuard }) {
    this.mockScanResults = mockScanResults;
    this.ssrfGuard = ssrfGuard;

    // Bind handlers once so router wiring stays clean.
    this.postScan = this.postScan.bind(this);
    this.getScanResults = this.getScanResults.bind(this);
    this.getProblem = this.getProblem.bind(this);
  }

  /**
   * POST /api/scan
   * Body: { url: string }
   */
  postScan(req, res) {
    const { url } = req.body || {};
    if (this.ssrfGuard) {
      const guard = this.ssrfGuard.validate(url);
      if (!guard.ok) {
        return res.status(400).json({ error: guard.reason });
      }
    }
    console.log(`Received scan request for URL: ${url}`);
    // TODO(Phase 2): call this.runner.run(url) and return the result.
    return res.json(this.mockScanResults);
  }

  /**
   * GET /api/scan-results?url=...
   */
  getScanResults(req, res) {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: 'Missing required ?url=' });
    }
    if (this.ssrfGuard) {
      const guard = this.ssrfGuard.validate(url);
      if (!guard.ok) {
        return res.status(400).json({ error: guard.reason });
      }
    }
    console.log(`Received request for scan results of URL: ${url}`);
    return res.json(this.mockScanResults);
  }

  /**
   * GET /problems/:id
   * Look up a single problem inside the (mock) bucket structure.
   */
  getProblem(req, res) {
    const { id } = req.params;
    const allProblems = Object.values(this.mockScanResults.problems).flat();
    const problem = allProblems.find((p) => p.id === id);
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }
    console.log(`Serving problem ${id}`);
    return res.json(problem);
  }
}

module.exports = ScanController;
