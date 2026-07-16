import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  formatRelativeTime,
  hasAttachedStorage,
  mergeAccountUpdate,
  toSavedScans,
  toShellUser,
} from '../lib/accountAdapter'

describe('accountAdapter', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('toShellUser maps display fields for the app shell', () => {
    expect(toShellUser({
      displayName: 'Samuel',
      username: 'sam',
      email: 'sam@example.com',
    })).toEqual({
      name: 'Samuel',
      email: 'sam@example.com',
    })
  })

  it('toShellUser falls back to username and returns null for missing user', () => {
    expect(toShellUser({ username: 'sam' })).toEqual({
      name: 'sam',
      email: '',
    })
    expect(toShellUser(null)).toBeNull()
  })

  it('toSavedScans maps index entries to dashboard rows', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-10T12:00:00Z'))

    const rows = toSavedScans({
      scanCount: 1,
      scans: [{
        id: 'scan-1',
        url: 'https://codrlabs.com',
        host: 'codrlabs.com',
        scannedAt: '2026-07-08T12:00:00Z',
        score: 72,
        issues: 7,
        topSeverity: 'critical',
      }],
    })

    expect(rows).toEqual([{
      id: 'scan-1',
      url: 'codrlabs.com',
      score: 72,
      issues: 7,
      when: '2 days ago',
      top: 'critical',
    }])
  })

  it('formatRelativeTime handles recent and distant timestamps', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-10T12:00:00Z'))

    expect(formatRelativeTime('2026-07-10T11:59:30Z')).toBe('Just now')
    expect(formatRelativeTime('2026-07-10T11:00:00Z')).toBe('1 hour ago')
    expect(formatRelativeTime('2026-07-03T12:00:00Z')).toBe('1 week ago')
  })

  it('hasAttachedStorage reflects whether storage is bound', () => {
    expect(hasAttachedStorage({ storage: { full_name: 'sam/repo' } })).toBe(true)
    expect(hasAttachedStorage({ id: '1' })).toBe(false)
    expect(hasAttachedStorage(null)).toBe(false)
  })

  it('mergeAccountUpdate replaces scans after a signed-in save', () => {
    const updated = mergeAccountUpdate(
      {
        id: '1',
        account: { scanCount: 0, scans: [] },
      },
      {
        scanCount: 1,
        scans: [{
          id: 'scan-1',
          url: 'https://codrlabs.com',
          host: 'codrlabs.com',
          scannedAt: '2026-07-10T12:00:00Z',
          score: 88,
          issues: 2,
          topSeverity: 'moderate',
        }],
      },
    )

    expect(updated.account.scanCount).toBe(1)
    expect(updated.account.scans).toHaveLength(1)
    expect(updated.account.scans[0].host).toBe('codrlabs.com')
  })
})
