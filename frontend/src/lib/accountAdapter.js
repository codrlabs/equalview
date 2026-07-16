/**
 * Adapt session user + scan index entries for dashboard / shell views.
 */

/** @param {string} iso */
export function formatRelativeTime(iso) {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''

  const diffMs = Date.now() - then
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`

  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`

  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks} week${weeks === 1 ? '' : 's'} ago`

  return new Date(iso).toLocaleDateString()
}

/** @param {object | null | undefined} apiUser */
export function toShellUser(apiUser) {
  if (!apiUser) return null
  return {
    name: apiUser.displayName || apiUser.username || 'User',
    email: apiUser.email || '',
  }
}

/**
 * @param {object | null | undefined} account session `user.account`
 * @returns {Array<{ id: string, url: string, score: number, issues: number, when: string, top: string }>}
 */
export function toSavedScans(account) {
  const scans = account?.scans ?? []
  return scans.map((entry) => ({
    id: entry.id,
    url: entry.host || entry.url || '',
    score: entry.score ?? 0,
    issues: entry.issues ?? 0,
    when: formatRelativeTime(entry.scannedAt),
    top: entry.topSeverity || 'minor',
  }))
}

/** @param {object | null | undefined} apiUser */
export function hasAttachedStorage(apiUser) {
  return Boolean(apiUser?.storage)
}

/**
 * Merge a scan-save account snapshot into the session user (from POST /api/scan).
 * @param {object | null | undefined} apiUser
 * @param {{ scanCount?: number, scans?: object[] } | null | undefined} accountUpdate
 */
export function mergeAccountUpdate(apiUser, accountUpdate) {
  if (!apiUser || !accountUpdate) return apiUser
  return {
    ...apiUser,
    account: {
      ...apiUser.account,
      ...accountUpdate,
      scans: accountUpdate.scans ?? apiUser.account?.scans ?? [],
    },
  }
}
