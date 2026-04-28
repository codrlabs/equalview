/**
 * Route mounting helper. Keeps `app.js` free of `/api/...` strings so
 * each router owns its own URL prefix.
 */
const makeScanRouter = require('./scan');
const makeProblemsRouter = require('./problems');

/**
 * @param {import('express').Express} app
 * @param {{ scanController: import('../controllers/scanController') }} deps
 */
function mountRoutes(app, { scanController }) {
  app.use('/api', makeScanRouter(scanController));
  app.use('/problems', makeProblemsRouter(scanController));
}

module.exports = mountRoutes;
