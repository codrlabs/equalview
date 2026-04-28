/**
 * Problem-detail routes:
 *   - GET /problems/:id
 *
 * In Phase 3 this will likely move under /api/problems/:id and gain
 * a richer per-violation payload from axe-core.
 */
const { Router } = require('express');

/**
 * @param {import('../controllers/scanController')} controller
 * @returns {import('express').Router}
 */
function makeProblemsRouter(controller) {
  const router = Router();
  router.get('/:id', controller.getProblem);
  return router;
}

module.exports = makeProblemsRouter;
