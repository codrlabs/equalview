# Documentation

This folder is the source of truth for project documentation. It is split
into three kinds of documents, by intent:

```
docs/
├── guides/      # How-to and reference. Stable, evergreen, no checkboxes.
├── plans/       # Tracked roadmaps with phases, deliverables, status.
└── research/    # Obsidian canvas and supporting scratch notes.
```

## Guides

Stable, "how do I do X" content. Update when the answer changes.

- [`guides/workflow.md`](guides/workflow.md) — Git + GitHub workflow,
  branching, recovering from common mistakes.
- [`guides/axecore-integration.md`](guides/axecore-integration.md) —
  Reference for how the Puppeteer + axe-core scanner is meant to be wired
  in (architecture, code samples, troubleshooting).

## Plans

Time-bounded, trackable work. Each plan has phases, concrete
deliverables, and a status. When a plan is complete, archive it but
leave it in place for history.

- [`plans/project-roadmap.md`](plans/project-roadmap.md) — Top-level
  map of phases (housekeeping → real scanner → UX → reliability →
  productionization) with intern-friendly tasks after each phase.
- [`plans/architecture-map.md`](plans/architecture-map.md) — Visual
  map: every screen, what it does, what the backend does for it, and
  how frontend/backend code is organized.
- [`plans/axecore-integration-roadmap.md`](plans/axecore-integration-roadmap.md)
  — Replace mock scan data with a real axe-core scanner.

## Research

Supplementary brainstorming material — Obsidian canvas, pasted images,
notes. Not authoritative.

See [`research/README.md`](research/README.md).

## When to add what

| Need | Where it goes |
|------|---------------|
| "How do I do X in this repo?" | `guides/` |
| "What work needs to happen, in what order?" | `plans/` |
| "I'm thinking out loud / sketching" | `research/` |
| "What is the current behavior?" | Top-level `README.md` |

For lightweight task tracking prefer GitHub Issues. Use `plans/` only
when a body of work spans many issues and needs a shared narrative.
