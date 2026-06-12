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

/**
 * Accept the bare-domain form users actually type ("codrlabs.com")
 * and normalize it to a full https:// URL. Returns null when the input
 * can't be turned into a valid http(s) URL.
 *
 * @param {string} input
 * @returns {string|null}
 */
export function normalizeUrl(input) {
  if (typeof input !== 'string') return null
  const trimmed = input.trim()
  if (trimmed === '') return null
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  if (!isValidUrl(candidate)) return null
  // Require a dot-separated hostname so bare words don't pass.
  const { hostname } = new URL(candidate)
  if (!/^([\w-]+\.)+[\w-]{2,}$/.test(hostname)) return null
  return candidate
}
