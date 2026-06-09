import { isValidUrl, normalizeUrl } from './urlValidator'

describe('isValidUrl', () => {
  it('returns false for non-string input', () => {
    expect(isValidUrl(null)).toBe(false)
    expect(isValidUrl(undefined)).toBe(false)
    expect(isValidUrl(123)).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isValidUrl('')).toBe(false)
    expect(isValidUrl('   ')).toBe(false)
  })

  it('returns true for valid http URLs', () => {
    expect(isValidUrl('http://example.com')).toBe(true)
    expect(isValidUrl('http://localhost:3000')).toBe(true)
  })

  it('returns true for valid https URLs', () => {
    expect(isValidUrl('https://example.com')).toBe(true)
    expect(isValidUrl('https://subdomain.example.com/path?query=1')).toBe(true)
  })

  it('returns false for invalid protocols', () => {
    expect(isValidUrl('ftp://example.com')).toBe(false)
    expect(isValidUrl('javascript://alert(1)')).toBe(false)
  })

  it('returns false for malformed URLs', () => {
    expect(isValidUrl('not-a-url')).toBe(false)
    expect(isValidUrl('http://')).toBe(false)
  })

  it('returns false for Windows-style paths with backslashes', () => {
    expect(isValidUrl('C:\\google.com')).toBe(false)
    expect(isValidUrl('D:\\path\\to\\file')).toBe(false)
    expect(isValidUrl('c:\\windows\\system32')).toBe(false)
  })

  it('returns false for non-Windows paths', () => {
    expect(isValidUrl('/usr/local/bin')).toBe(false)
    expect(isValidUrl('./relative/path')).toBe(false)
  })
})

describe('normalizeUrl', () => {
  it('returns empty string for non-string input', () => {
    expect(normalizeUrl(null)).toBe('')
    expect(normalizeUrl(undefined)).toBe('')
    expect(normalizeUrl(123)).toBe('')
  })

  it('returns empty string for empty string', () => {
    expect(normalizeUrl('')).toBe('')
    expect(normalizeUrl('   ')).toBe('')
  })

  it('returns URLs with protocols as-is', () => {
    expect(normalizeUrl('http://example.com')).toBe('http://example.com')
    expect(normalizeUrl('HTTPS://EXAMPLE.COM')).toBe('HTTPS://EXAMPLE.COM')
    expect(normalizeUrl('file:///path/to/file')).toBe('file:///path/to/file')
  })

  it('prepends https:// to bare domains', () => {
    expect(normalizeUrl('google.com')).toBe('https://google.com')
    expect(normalizeUrl('example.org')).toBe('https://example.org')
    expect(normalizeUrl('subdomain.example.com')).toBe('https://subdomain.example.com')
  })

  it('handles localhost bare domain', () => {
    expect(normalizeUrl('localhost')).toBe('https://localhost')
    expect(normalizeUrl('localhost:3000')).toBe('https://localhost:3000')
  })

  it('returns empty string for invalid bare inputs', () => {
    expect(normalizeUrl('not-a-url')).toBe('')
    expect(normalizeUrl('nodots')).toBe('')
    expect(normalizeUrl('123invalid')).toBe('')
  })

  it('converts Windows-style paths with dots as https:// URLs', () => {
    expect(normalizeUrl('C:\\google.com')).toBe('https://C:\\google.com')
  })

  it('returns empty string for Windows paths without dots', () => {
    expect(normalizeUrl('D:\\path\\to\\file')).toBe('')
    expect(normalizeUrl('Z:\\deep\\nested\\path')).toBe('')
  })

  it('converts Windows paths with dots to https:// URLs', () => {
    expect(normalizeUrl('A:\\test.txt')).toBe('https://A:\\test.txt')
  })
})
