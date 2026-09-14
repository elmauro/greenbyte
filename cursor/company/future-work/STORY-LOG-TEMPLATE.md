# Story log — template (lifecycle diary per area)

Template for the **`STORY-LOG.md`** file that lives in each area folder under `cursor/company/future-work/` (`backend/`, `frontend/`, `infrastructure/`, `product/`, `_core/`, or a domain area).

## Purpose

Record, **per area**, each story to implement (or already implemented) along with its **copy-paste block** from the [`prompt-feature-lifecycle.md`](../../prompts/feature/prompt-feature-lifecycle.md) orchestrator. This lets you jump directly to **one** story without opening the full registry.

## Location

- One `STORY-LOG.md` per area: `future-work/<area>/STORY-LOG.md`.
- The **backlog** (`FW-*`) stays in the folder `README.md`; **detail** stays in `cursor/analysis/features/<area>/<slug>/`.

`new-feature.mjs` creates the log if missing and inserts the entry (newest first).

## Relationship with other files (do not duplicate)

| File | Role | Granularity |
| --- | --- | --- |
| Folder `README.md` | FW-* backlog (gaps, priority, shipped) | Per area |
| [`STORY-REGISTRY.md`](STORY-REGISTRY.md) | Master **ticket ↔ FW ↔ slug** mapping | Global |
| **`STORY-LOG.md`** (this template) | **Lifecycle blocks + execution status** | Per area |
| `cursor/analysis/features/<area>/<slug>/` | Analysis, implementation, tests | Per story |
| [`ITEM-TEMPLATE.md`](ITEM-TEMPLATE.md) | Format for one FW item | — |

**Rule:** `STORY-LOG.md` does **not** repeat the backlog or analysis; it is the lifecycle usage diary for the folder.

## Suggested statuses

`planned` (registered, not started) · `in-progress` · `review` · `shipped` · `deferred`.

---

## Entry format (copy per story)

```markdown
### GREENBYTE-### — <Feature name>

- FW: `FW-GREENBYTE-<nnn>` · Slug: `<feature-slug>` · Stack: backend|frontend|infrastructure|full-stack
- Branch: `feature/GREENBYTE-###` · PR: `GREENBYTE-###: <Feature name>`
- Status: planned | in-progress | review | shipped | deferred
- Package: `cursor/analysis/features/<area>/<slug>/` · Issue: #<n> (if exists)

​```text
@cursor/prompts/feature/prompt-feature-lifecycle.md

Feature slug: <feature-slug>
Feature name: <Feature name>
Ticket/story: GREENBYTE-###
Backlog ID: FW-GREENBYTE-<nnn>
Stack scope: backend
Start at: analysis
Run tests: no
Auto-close: yes
​```
```

> For a **new** story, use `Start at: analysis`. To re-sync or close an existing one, `Start at: close`.

## Header for each `STORY-LOG.md`

```markdown
# Story log — <Area>

Story registry (usage of `prompt-feature-lifecycle.md`) for this area.
FW-* backlog: [`README.md`](README.md) · Master ticket↔FW: [`../STORY-REGISTRY.md`](../STORY-REGISTRY.md) · Template: [`../STORY-LOG-TEMPLATE.md`](../STORY-LOG-TEMPLATE.md).

## Stories

<!-- newest first; new-feature.mjs inserts below this comment -->
```
