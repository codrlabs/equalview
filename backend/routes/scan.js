/**
 * Scan-related routes:
 *   - POST /api/scan
 *   - GET  /api/scan-results
 *
 * Only knows about HTTP shape. All logic lives in ScanController.
 *
 * @typedef {import('../controllers/scanController')} ScanController
 */
const { Router } = require('express');

/**
 * @param {ScanController} controller
 * @returns {import('express').Router}
 */
function makeScanRouter(controller) {
  const router = Router();
  router.post('/scan', controller.postScan);
  router.get('/scan-results', controller.getScanResults);
  return router;
}

module.exports = makeScanRouter;
