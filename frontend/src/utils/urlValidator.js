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

// urlValidator.js — proposed API
// normalizeUrl: Prepends https:// to bare domain inputs
// Accepts: "google.com", "example.org", "localhost:3000"
// Rejects: "not-a-url" (no dots, doesn't look like a domain)
export function normalizeUrl(input) {
  if (typeof input !== 'string' || input.trim() === '') return ''
  const trimmed = input.trim()
  // Already has protocol - return as-is
  if (trimmed.includes('://')) return trimmed
  // Bare domains: must start with letter and have at least one dot or be localhost
  if (/^[a-zA-Z]/.test(trimmed) && (trimmed.includes('.') || trimmed.startsWith('localhost'))) {
    return `https://${trimmed}`
  }
  return ''
}