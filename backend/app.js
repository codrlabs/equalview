/**
 * Composition root. The ONE place we instantiate concrete classes and
 * wire them together. Everything else takes its dependencies via
 * arguments — that's what makes the layers unit-testable without a DI
 * framework. See docs/plans/architecture-map.md §6.5.
 */
const express = require('express');
const cors = require('cors');

const ScanController = require('./controllers/scanController');
const mountRoutes = require('./routes');
const ssrfGuard = require('./services/ssrfGuard');
const mockScanResults = require('./data/mockScanResults');

/**
 * Build a fully-wired Express app. Exported separately from `index.js`
 * so tests can `request(buildApp())` without binding a port.
 *
 * @param {object} [overrides]  optional dep overrides for testing
 * @returns {import('express').Express}
 */
function buildApp(overrides = {}) {
  const app = express();

  const frontendOrigin =
    process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
  app.use(cors({ origin: frontendOrigin }));
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'okay', message: 'Server is running!' });
  });

  // Today the controller still serves the mock fixture; in Phase 2 it
  // will be constructed with a real ScanRunner instead.
  const scanController =
    overrides.scanController ||
    new ScanController({
      mockScanResults: overrides.mockScanResults || mockScanResults,
      ssrfGuard: overrides.ssrfGuard || ssrfGuard,
    });

  mountRoutes(app, { scanController });

  return app;
}

module.exports = buildApp;
