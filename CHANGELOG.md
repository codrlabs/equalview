# CHANGELOG — Auth & Storage Design Revision

## Samuel's Design (committed `44f78f39`, June 29)

**Model:** OAuth → attach a storage location → write scan reports to it.

- Auth is for identity; storage is for saving scan outputs.
- Fit-check does not exist. The user picks a name (typed or from a hard-coded
  `existing` list in `placeholders.js`) and the backend creates a new repo/folder
  or blindly reuses it.
- Google Drive: backend lists existing folders via server-side API calls.
- GitHub scopes: `repo` (all-or-nothing) or `public_repo`, noted in passing.
- Security model: standard session-based OAuth with encrypted tokens.
- Storage content: the design says "scan results saved to repo/folder" but
  doesn't define an on-disk contract — no manifest, no layout rules, no
  concurrency handling.
- The TODO mentions `scans/<hostname>_{timestamp}.json` naming but nothing
  about accounts, settings, or account rehydration.
- Phase 5 roadmap still references Postgres + JWT in parallel (the DB and the
  user-owned store coexist without reconciliation).
- Frontend: placeholder flow (`PLACEHOLDER_USER`, `PLACEHOLDER_SAVED_SCANS`,
  hard-wired `existing` arrays). ConnectView is "pick a name from a dropdown
  you can't edit."

**What it was good at:** clean passport wiring, clear endpoint tables, solid
token-encryption pattern, honest about acceptance criteria. A sound "auth +
write reports" doc.

## Your Revision (June 30)

**Model:** OAuth → browse real storage → validate fit → **load the whole
account back** or init a new one. The user's repo/folder *is* the account.

- Auth is only an API-token handshake; the store holds everything.
- **Fit-check** (`POST /api/auth/storage/validate`) reads the storage and
  returns `loadable | initializable | unrelated | incompatible | invalid` with
  capabilities. This is the UX you described: "does this fit with the data
  needed to load back the account?"
- Google Drive: uses **Google Picker** (client-side), because `drive.file`
  cannot browse existing folders. This was a real gap in Samuel's design.
- GitHub scopes: documented `public_repo` vs `repo` tradeoff, plus a
  recommendation for **GitHub App** (per-repo `Contents: read/write`) as the
  least-privilege path.
- **`accountStorageContract.md`** (new) — the authoritative on-disk spec:
  `equalview.json` manifest with `accountId`, `storage.ownerId`, `settings`,
  `summary`; `scans/index.json` cache; immutable scan files named
  `<scanId>_<host>.json`. Every field has a reason.
- **Concurrency & partial-write model:** optimistic concurrency via blob `sha`
  (GitHub) / generation ETags (Drive); scan files are truth, index is a
  rebuildable cache; load-time reconcile heals drift; validate→init races are
  guarded by conditional create.
- **Identity model:** possession-based by default (storage ACL = account ACL).
  Records stable provider ids (node id, folder id, owner id), not names/emails.
  Subject-bound mode is an optional future policy.
- **Non-negotiables** codified: no tokens in store, no project DB, scope
  tradeoffs disclosed in UI, account is portable across devices.
- **Scope tradeoffs are surfaced in the picker UI**, not buried in docs.
  The `/storages` endpoint and the fit-check response give the frontend enough
  to render informed choices.
- Agent files (`AGENTS.md`, `CLAUDE.md`) and `docs/README.md` are updated so
  anyone working on the codebase sees the architecture immediately.
- The **Phase 5 roadmap is superseded** — there is no project database.
  Supersession is explicit in every doc.

## What's Gained in Vision

| Dimension | Samuel's lens | Your lens |
|---|---|---|
| **What storage is** | A place to dump scan files | The user's portable account — settings, identity, and history travel with it |
| **Selection UX** | Type a name / pick from a `placeholders.js` list | Browse real repos → validate → see scan count → one-click load or init |
| **Fit-check** | Not present | Central UX primitive: 5 statuses + reasons + capabilities |
| **Browsing reality** | Assumes backend can list Drive folders | Recognizes `drive.file` cannot browse → Picker is mandatory |
| **GitHub scope** | Noted but undecided | Recommended GitHub App for per-repo least privilege; disclosed `repo` tradeoff |
| **On-disk contract** | "Save scans to a folder" — no structure | Full manifest + index + immutable scan files with versioning, concurrency, drift repair |
| **Concurrent access** | Not addressed | Built-in: optimistic ops, load-time reconcile, caches vs truth, race-guarded init |
| **Identity** | OAuth subject is the user | Possession-based default — storage access IS account access; optional subject binding |
| **Mobile / cross-device** | Not scoped | "Pick the same storage on any device" is the whole point |
| **Cost model** | Not articulated | No per-user hosting, no DB, no lock-in → cheap to offer to everyone |
| **DB in Phase 5** | Postgres + JWT in parallel | **No project DB ever** — portable store *is* the DB; supersession is explicit |
| **Implementation guide** | 2 files (design + TODO) | 3 files (+ on-disk contract) + agent files + docs index; each file has a single responsibility |

The core shift: Samuel treated storage as a **sink** for scan output. You treat
it as the **source of truth for a user's entire relationship with the product**.
Everything — endpoints, fit-check, concurrency rules, scope disclosure, the
Picker requirement — flows from that single framing change. It makes the
product fundamentally cheaper to run (zero server state per user), more
portable (your account is a repo/folder), and more honest about what each
provider's scope actually lets you do.
