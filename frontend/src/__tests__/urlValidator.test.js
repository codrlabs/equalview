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

  it('rejects non-string input', () => {
    expect(isValidUrl(null)).toBe(false)
    expect(isValidUrl(undefined)).toBe(false)
    expect(isValidUrl(123)).toBe(false)
  })

  it('rejects Windows-style and filesystem paths', () => {
    expect(isValidUrl('C:\\google.com')).toBe(false)
    expect(isValidUrl('D:\\path\\to\\file')).toBe(false)
    expect(isValidUrl('/usr/local/bin')).toBe(false)
    expect(isValidUrl('./relative/path')).toBe(false)
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

  it('returns null for non-string input', () => {
    expect(normalizeUrl(null)).toBeNull()
    expect(normalizeUrl(undefined)).toBeNull()
    expect(normalizeUrl(123)).toBeNull()
  })

  it('rejects localhost — the backend SSRF guard blocks loopback targets', () => {
    expect(normalizeUrl('localhost:3000')).toBeNull()
  })
})
