/**
 * Placeholder data for the parts of the app whose backends are not
 * built yet (auth, saved-scan storage). The UI flow is fully wired —
 * swapping these for real API calls is the Phase 5 work tracked in
 * docs/plans/project-roadmap.md.
 */

/** Signed-in user placeholder — replaced by the OAuth profile later. */
export const PLACEHOLDER_USER = { name: 'Samuel', email: 'Samuel@vizably.org' }

/**
 * Storage provider metadata used by the SignIn → Connect → Dashboard
 * flow. `existing` lists are placeholders for the repo/folder picker.
 */
export const PROVIDERS = {
  github: {
    name: 'GitHub', store: 'a private GitHub repo', storeShort: 'GitHub repo',
    dest: 'vizably-scans', destIcon: 'GitBranch',
    unit: 'repository', unitShort: 'repo', article: 'a',
    scope: 'repo', scopeNote: 'Create & write to one private repository',
    existing: ['site-audits', 'a11y-reports', 'client-work'],
  },
  google: {
    name: 'Google', store: 'your Google Drive', storeShort: 'Google Drive',
    dest: 'Vizably', destIcon: 'HardDrive',
    unit: 'folder', unitShort: 'folder', article: 'a',
    scope: 'drive.file', scopeNote: 'Create & write to one Drive folder',
    existing: ['Accessibility', 'Work', 'Clients'],
  },
}

/** Saved scans placeholder for the signed-in dashboard. */
export const PLACEHOLDER_SAVED_SCANS = [
  { url: 'codrlabs.com', score: 72, issues: 7, when: '2 days ago', top: 'critical' },
  { url: 'stripe.com', score: 96, issues: 1, when: 'Today', top: 'minor' },
  { url: 'wikipedia.org', score: 88, issues: 3, when: '5 days ago', top: 'moderate' },
  { url: 'my-portfolio.dev', score: 64, issues: 11, when: '1 week ago', top: 'serious' },
  { url: 'acme-store.com', score: 41, issues: 23, when: '2 weeks ago', top: 'critical' },
]
