# Documentation — where things live

Policy for separating **shipped behavior**, **backlog**, and **story artifacts** in `GreenByte`.

Complements [`cursor/docs/documentation-governance.md`](../docs/documentation-governance.md) with company/backlog detail.

Last updated: generated at project creation.

---

## Principle

| Question | Answer in |
| --- | --- |
| What works **today**? | `docs/`, `frontend/docs/`, `backend/docs/` |
| What is **planned** (backlog)? | `cursor/company/future-work/` |
| What story are we **implementing**? | `cursor/analysis/features/<area>/<slug>/` |
| FW ↔ story ↔ shipped? | `cursor/company/future-work/STORY-REGISTRY.md` |

One source of truth per dimension. Cross-link; do not duplicate long tables.

---

## Layers

```text
docs/                          ← shipped product & operations
cursor/company/future-work/    ← backlog FW-* (gaps, priority)
cursor/analysis/features/      ← TEMPORAL — one story at a time
```

---

## What to write where

### Shipped docs (`docs/`, stack docs)

- Implemented behavior, API contracts, deploy, env vars.
- Honest limitations.
- Audience: developers, QA, operators.

### `cursor/company/future-work/`

- Backlog items **`FW-GREENBYTE-*`**: gap, priority, ship criteria.
- Shipped / deferred sections per area README (add area folders when needed).
- Audience: product, planning, agents.

### `cursor/analysis/features/<slug>/`

- Story lifecycle: user-story, analysis, test-checklist, manifest, notes.
- On **close**: update INDEX + registry; move behavior to shipped docs.

---

## Sync on ship

When closing a feature ([`prompt-feature-close-package.md`](../prompts/feature/prompt-feature-close-package.md)):

1. Update stack docs if contracts or behavior changed.
2. Move or mark **`FW-*`** item as Shipped in `future-work/` (area README if present).
3. Update [`STORY-REGISTRY.md`](future-work/STORY-REGISTRY.md) and [`features/INDEX.md`](../analysis/features/INDEX.md).
4. If using GitHub sync (Layer C): update `github.sync.json` in the feature folder.

---

## Do not

- Copy full API tables into future-work.
- Document ship criteria only in stack docs without a matching `FW-*` item.
- Keep story folders as permanent API documentation after ship.

---

## Related

- [`future-work/README.md`](future-work/README.md)
- [`future-work/ITEM-TEMPLATE.md`](future-work/ITEM-TEMPLATE.md)
- [`AI-Project-Playbook.md`](../docs/AI-Project-Playbook.md)
