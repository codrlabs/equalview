# Architecture Mental Model — No Analogies

> How to think through frontend and backend as connected systems. No metaphors — just what each folder does, when you use it, and how it connects to the rest.

---

## Frontend

| Folder | What it does | When you need it |
|--------|-----------|-----------------|
| `pages/` | Self-contained screens that arrange UI and wire data | You're building a new screen the user navigates to |
| `components/` | Modular, reusable UI blocks that receive props and render markup | The same UI pattern appears in more than one place |
| `hooks/` | Encapsulate async data fetching with a `{ data, loading, error }` contract | A page needs data from the backend |
| `lib/` | House the one network client every hook calls to reach the backend | You add a new API endpoint the frontend needs to call |
| `utils/` | Hold stateless, pure helper functions for transformations | You need to validate, format, or transform data without side effects |

### How to think about it

A page assembles components. If a page needs data, it calls a hook. The hook calls the library. The library sends the request. Data returns up the chain. Utils are called whenever you need to shape, validate, or format data without side effects.

### Example flow

```
User opens /scan-results?url=example.com
  → pages/ScanResultsPage renders
  → calls useScan(url)
      → calls lib/apiClient.getScanResults(url)
          → sends GET /api/scan-results?url=...
      → receives response
      → returns { data, loading, error }
  → page renders loading → data → error
```

---

## Backend

| Folder | What it does | When you need it |
|--------|-----------|-----------------|
| `routes/` | Expose HTTP endpoints and delegate to controllers | You add a new URL the frontend can call |
| `controllers/` | Receive requests, validate input, and invoke the appropriate service | A route needs to do something more than just exist |
| `services/` | Execute domain logic and pure transformations without touching HTTP or DB | The controller needs business logic that doesn't belong in the request handler |
| `data/` | Abstract storage so the rest of the app remains storage-agnostic | You need to read from or write to persistent storage |

### How to think about it

A route receives a request and passes it to a controller. The controller validates and passes it to a service. The service applies business logic and reads or writes through the data layer. The response flows back up to the client.

### Example flow

```
Frontend sends GET /api/scan-results?url=example.com
  → routes/ matches /api/scan-results to controller.getScanResults
  → controllers/scanController receives req, res
      → validates URL with ssrfGuard
      → calls services/ to process
  → services/ applies business logic
      → calls data/ to retrieve or store
  → data/ returns raw storage
  → service shapes response
  → controller sends res.json(result)
```

---

## The Bridge: How Frontend and Backend Connect

```
        FRONTEND                               BACKEND
        ────────                               ───────
           │                                      │
    ┌──────▼──────┐                    ┌──────────▼──────────┐
    │    hooks/   │  ────request────▶ │       routes/       │
    └──────┬──────┘                    └──────────┬──────────┘
           │                                      │
    ┌──────▼──────┐                    ┌──────────▼──────────┐
    │     lib/    │  ◀────response───  │    controllers/     │
    └─────────────┘                    └──────────┬──────────┘
                                                  │
                                         ┌────────▼────────┐
                                         │    services/    │
                                         └────────┬────────┘
                                                  │
                                           ┌──────▼──────┐
                                           │    data/    │
                                           └─────────────┘
```

### Adding a feature

**Frontend:** add a page → maybe a component → a hook to fetch → a method in `lib/`.

**Backend:** add a route → a controller method → a service function → maybe a data access method.

Each side is self-contained. The contract between them is `shared/types.js`.
