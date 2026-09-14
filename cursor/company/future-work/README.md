# Future Work — GreenByte backlog

Durable backlog for consistent product improvement.

**Item template:** [`ITEM-TEMPLATE.md`](ITEM-TEMPLATE.md)  
**Backlog ↔ story registry:** [`STORY-REGISTRY.md`](STORY-REGISTRY.md)  
**Area taxonomy:** [`AREA-TAXONOMY.md`](AREA-TAXONOMY.md)  
**Story log template:** [`STORY-LOG-TEMPLATE.md`](STORY-LOG-TEMPLATE.md)  
**Governance:** [`../DOCUMENTATION-GOVERNANCE.md`](../DOCUMENTATION-GOVERNANCE.md)

## Structure (minimal)

```text
cursor/company/future-work/
├── README.md              ← this index
├── ITEM-TEMPLATE.md       ← FW item fields + lifecycle
├── STORY-REGISTRY.md      ← FW ↔ execution story ↔ slug
├── STORY-LOG-TEMPLATE.md  ← per-area lifecycle diary
├── AREA-TAXONOMY.md       ← area folders for stories
└── <area>/                ← optional (backend, frontend, product, …)
    ├── README.md          ← backlog items for that area
    └── STORY-LOG.md       ← lifecycle paste blocks (created by new-feature.mjs)
```

Add area folders when the backlog grows. Keep shipped behavior in `docs/` — not here.

## ID conventions

| ID | Role | Format | Example |
| --- | --- | --- | --- |
| **FW-*** | Product backlog (stable) | `FW-GREENBYTE-<nnn>` | `FW-GREENBYTE-001` |
| **Execution story** | GitHub / JIRA / board | `GREENBYTE-<nnn>` or external ticket | `GREENBYTE-001` |

- **Ticket/story** in feature packages: execution ID only (never `FW-*` as ticket).
- **Backlog ID** in `feature-manifest.md`: `FW-*` when promoted from backlog.

## How to use

| Audience | Use |
| --- | --- |
| Product | Prioritize backlog items; define ship criteria |
| Implementation | Promote FW → execution story (`new-feature.mjs` or intake) → `cursor/analysis/features/<area>/<slug>/` |
| Close | Run `prompt-feature-close-package.md` → registry + STORY-LOG + INDEX + shipped docs |

## Lifecycle (summary)

1. **Backlog** — FW item in README; execution story `—`.
2. **Promoted** — assign execution story; create feature package; update registry.
3. **In progress** — manifest + implementation.
4. **Shipped** — mark in registry; update stack docs; optional GitHub sync (Capa C).

Detail: [`ITEM-TEMPLATE.md`](ITEM-TEMPLATE.md) · Playbook: [`cursor/docs/AI-Project-Playbook.md`](../../docs/AI-Project-Playbook.md)

## Starter backlog

Add items below or create `<area>/README.md` files.

### FW-GREENBYTE-001 — Example backlog item

| | |
| --- | --- |
| **ID** | FW-GREENBYTE-001 |
| **Title** | Example capability (→ feature **Name**) |
| **Feature slug (previsto)** | `greenbyte-example-capability` |
| **Story** | — |
| **Priority** | P2 |
| **Gap** | Short label of what is missing |
| **Description** | What to build (2–4 sentences) |
| **Why it matters** | Who / what flow is unblocked |
| **Story shape** | S |
| **Ship criteria** | Tests, docs, or manual validation that proves done |

Remove or replace this example when you add real backlog items.
