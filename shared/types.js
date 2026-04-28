/**
 * Shared JSDoc type definitions used by both the backend and the
 * frontend. Keep this file dependency-free — nothing here may
 * `require()` anything outside `shared/`.
 *
 * Backend usage (CommonJS):
 *   /** @typedef {import('../shared/types.js').ScanResult} ScanResult *\/
 *
 * Frontend usage (ESM):
 *   /** @typedef {import('../../shared/types.js').ScanResult} ScanResult *\/
 */

/**
 * @typedef {'critical' | 'serious' | 'moderate' | 'minor' | null} Impact
 */

/**
 * A single accessibility finding as the EqualView UI sees it.
 *
 * @typedef {object} Problem
 * @property {string} id
 * @property {string} name
 * @property {string} category
 * @property {string} rootCause
 * @property {string} codeSnippet
 * @property {string[]} solution
 * @property {Impact} [impact]
 * @property {string|null} [helpUrl]
 * @property {string[]} [tags]
 */

/**
 * Bucketed result returned by `GET /api/scan-results` and
 * `POST /api/scan`.
 *
 * @typedef {object} ScanResult
 * @property {{
 *   visualAccessibility: Problem[],
 *   structureAndSemantics: Problem[],
 *   multimedia: Problem[]
 * }} problems
 * @property {string[]} whatsGood
 */

/**
 * --- Phase 5 (planned) -------------------------------------------------
 *
 * @typedef {object} User
 * @property {string} id
 * @property {string} email
 * @property {string} createdAt
 *
 * @typedef {object} StoredScan
 * @property {string} id
 * @property {string} userId
 * @property {string} url
 * @property {string} createdAt
 * @property {ScanResult} results
 */

module.exports = {};
