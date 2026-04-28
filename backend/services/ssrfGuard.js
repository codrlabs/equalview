/**
 * ssrfGuard — validate that a user-supplied URL is safe to scan.
 *
 * Implements the SSRF policy from the project roadmap:
 *   - require http(s) scheme
 *   - reject `file:`, `data:`, `javascript:` etc.
 *   - reject localhost / 127.0.0.0/8 / private IP ranges (RFC1918,
 *     link-local, loopback, IPv6 ULA, etc.)
 *
 * See docs/plans/project-roadmap.md § "Open decisions — SSRF policy".
 *
 * Pure module — no I/O. Returns a typed result rather than throwing so
 * callers can map a failure to a structured 4xx response.
 *
 * @typedef {{ ok: true, url: URL } | { ok: false, reason: string }} GuardResult
 */

const PRIVATE_IPV4_RANGES = [
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^127\./,
  /^169\.254\./,
  /^0\./,
];

const PRIVATE_HOSTS = new Set([
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
]);

/**
 * @param {string} hostname
 * @returns {boolean}
 */
function isPrivateHost(hostname) {
  const h = hostname.toLowerCase();
  if (PRIVATE_HOSTS.has(h)) return true;

  // IPv4 literal
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) {
    return PRIVATE_IPV4_RANGES.some((rx) => rx.test(h));
  }

  // IPv6 loopback or unique-local
  if (h === '::1' || h === '[::1]') return true;
  if (/^\[?(fc|fd)/i.test(h)) return true;
  if (/^\[?fe80/i.test(h)) return true;

  return false;
}

/**
 * Validate a URL against the SSRF policy.
 *
 * @param {string} input  raw URL string from the request
 * @returns {GuardResult}
 */
function validate(input) {
  if (typeof input !== 'string' || input.trim() === '') {
    return { ok: false, reason: 'URL is required' };
  }

  let parsed;
  try {
    parsed = new URL(input);
  } catch {
    return { ok: false, reason: 'URL is not parseable' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, reason: `Unsupported protocol: ${parsed.protocol}` };
  }

  if (isPrivateHost(parsed.hostname)) {
    return { ok: false, reason: 'Private/loopback hosts are not allowed' };
  }

  return { ok: true, url: parsed };
}

module.exports = { validate, isPrivateHost };
