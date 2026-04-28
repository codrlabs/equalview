/**
 * Client-side URL validation. Mirrors (loosely) the backend SSRF guard
 * but only does the cheap "is this a parseable http(s) URL" check —
 * the backend remains the source of truth.
 */

/**
 * @param {string} input
 * @returns {boolean}
 */
export function isValidUrl(input) {
  if (typeof input !== 'string' || input.trim() === '') return false
  try {
    const u = new URL(input)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}
