import { describe, it, expect } from 'vitest'
import { isValidUrl } from '../utils/urlValidator'

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
