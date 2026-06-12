import { describe, it, expect } from 'vitest'
import { isValidUrl, normalizeUrl } from '../utils/urlValidator'

describe('isValidUrl', () => {
  it('accepts http and https URLs', () => {
    expect(isValidUrl('http://example.com')).toBe(true)
    expect(isValidUrl('https://example.com/path?q=1')).toBe(true)
  })

  it('rejects empty / whitespace input', () => {
    expect(isValidUrl('')).toBe(false)
    expect(isValidUrl('   ')).toBe(false)
  })

  it('rejects unparseable strings', () => {
    expect(isValidUrl('not a url')).toBe(false)
  })

  it('rejects non-http schemes', () => {
    expect(isValidUrl('file:///etc/passwd')).toBe(false)
    expect(isValidUrl('javascript:alert(1)')).toBe(false)
  })
})

describe('normalizeUrl', () => {
  it('passes full http(s) URLs through', () => {
    expect(normalizeUrl('https://example.com/path')).toBe('https://example.com/path')
    expect(normalizeUrl('http://example.com')).toBe('http://example.com')
  })

  it('prepends https:// to bare domains', () => {
    expect(normalizeUrl('codrlabs.com')).toBe('https://codrlabs.com')
    expect(normalizeUrl('  wikipedia.org ')).toBe('https://wikipedia.org')
  })

  it('returns null for input that is not a URL', () => {
    expect(normalizeUrl('')).toBeNull()
    expect(normalizeUrl('not a url')).toBeNull()
    expect(normalizeUrl('justaword')).toBeNull()
  })
})
