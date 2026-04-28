/**
 * The single place the frontend imports `fetch`. Pages and hooks
 * receive the singleton instance and call typed methods on it; tests
 * substitute a fake.
 *
 * @typedef {import('../../../shared/types.js').ScanResult} ScanResult
 * @typedef {import('../../../shared/types.js').Problem} Problem
 */
export class ApiClient {
  /**
   * @param {object} [opts]
   * @param {string} [opts.baseUrl]
   * @param {typeof fetch} [opts.fetchImpl]
   */
  constructor({ baseUrl = '', fetchImpl = globalThis.fetch } = {}) {
    this.baseUrl = baseUrl
    this.fetchImpl = fetchImpl
  }

  /**
   * @param {string} path
   * @param {RequestInit} [init]
   */
  async _request(path, init) {
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, init)
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    }
    return res.json()
  }

  /**
   * Kick off a scan against `url`.
   * @param {string} url
   * @returns {Promise<ScanResult>}
   */
  runScan(url) {
    return this._request('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
  }

  /**
   * Get already-computed scan results for `url`.
   * @param {string} url
   * @returns {Promise<ScanResult>}
   */
  getScanResults(url) {
    return this._request(`/api/scan-results?url=${encodeURIComponent(url)}`)
  }

  /**
   * Look up a single problem by id.
   * @param {string} id
   * @returns {Promise<Problem>}
   */
  getProblem(id) {
    return this._request(`/problems/${encodeURIComponent(id)}`)
  }
}

// Default singleton — pages and hooks should import this rather than
// constructing their own instance.
export const apiClient = new ApiClient({ baseUrl: '' })
