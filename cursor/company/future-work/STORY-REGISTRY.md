# Future Work — Story registry (FW ↔ execution story)

Links **backlog items** (`FW-*`) to **execution stories** (`GREENBYTE-*` or external tickets) and feature slugs.

**Convention:** see [`ITEM-TEMPLATE.md`](ITEM-TEMPLATE.md) § FW vs execution story.

**Next free execution ID:** `GREENBYTE-001` (update when assigning).

---

## Rules

| ID | Use | Where |
| --- | --- | --- |
| **FW-*** | Product backlog (priority, gap, ship criteria) | `future-work/**/README.md` |
| **GREENBYTE-*** | Execution story, issue board, feature package | `user-story.md`, `feature-manifest.md` Ticket/story |
| **slug** | Folder under `cursor/analysis/features/` | Only when story enters analysis/implementation |

- **Ticket/story** in prompts and templates: execution ID only (not `FW-*`).
- **Backlog ID** in manifest: `FW-GREENBYTE-001` (separate field).
- One execution ID per story you implement; do not assign IDs to the entire FW catalog at once.
- When assigning: update this table + FW item **Story** line + create feature package.

---

## Registry

Status: **backlog** = FW without execution ID; **active** = feature folder exists; **shipped** = closed + docs synced.

`new-feature.mjs` inserts new rows immediately under the header separator.

| Execution story | Backlog ID | Feature slug | Feature name | Priority | Status |
| --- | --- | --- | --- | --- | --- |
| — | FW-GREENBYTE-001 | `greenbyte-example-capability` | Example capability | P2 | backlog |

Remove the example row when you promote or delete the starter item.

---

## GitHub sync (optional — Capa C)

When using `cursor/scripts/sync-github-feature.mjs`, map stories in `cursor/scripts/github-story.config.json`.

Per-feature state: copy [`cursor/templates/github.sync.json.example`](../../templates/github.sync.json.example) to `cursor/analysis/features/<slug>/github.sync.json` when syncing.
