# Future Work — Story registry (FW ↔ execution story)

Links **backlog items** (`FW-*`) to **execution stories** (`GREENBYTE-*` or external tickets) and feature slugs.

**Convention:** see [`ITEM-TEMPLATE.md`](ITEM-TEMPLATE.md) § FW vs execution story.

**Next free execution ID:** `GREENBYTE-004` (update when assigning).

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
| GREENBYTE-003 | n/a | `uc1-bff-demo-plant-dynamo-stub` | UC1 BFF demo plant Dynamo stub | P2 | shipped |
| GREENBYTE-002 | n/a | `uc1-msw-bff-dev-modes` | UC1 frontend MSW and BFF connection modes | P2 | planned |
| GREENBYTE-001 | n/a | `site-language-es-en` | Site language support (Spanish and English) | P2 | shipped |
| — | FW-GREENBYTE-001 | `greenbyte-example-capability` | Example capability | P2 | backlog |

Remove the example row when you promote or delete the starter item.

---

## GitHub sync (optional — Layer C)

When using `cursor/scripts/sync-github-feature.mjs`, map stories in `cursor/scripts/github-story.config.json`.

Per-feature state: copy [`cursor/templates/github.sync.json.example`](../../templates/github.sync.json.example) to `cursor/analysis/features/<slug>/github.sync.json` when syncing.
