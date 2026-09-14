# Future Work — Item template

Template for new entries in any `README.md` under `cursor/company/future-work/`.

## FW vs execution story (two identifiers)

| ID | Role | Format | Example |
| --- | --- | --- | --- |
| **FW-*** | Product backlog (stable) | `FW-GREENBYTE-<nnn>` | `FW-GREENBYTE-001` |
| **Execution story** | GitHub / JIRA / board | `GREENBYTE-<nnn>` or external key | `GREENBYTE-001` |

- Do **not** use `FW-*` in **Ticket/story** on feature packages.
- When promoting: `Ticket/story: GREENBYTE-001` and `Backlog ID: FW-GREENBYTE-001`.
- Register assignments in [`STORY-REGISTRY.md`](STORY-REGISTRY.md).

**Promote FW → story:**

1. Pick next free execution ID (see registry) or run `node cursor/scripts/new-feature.mjs --name "…" --area <area> --fw FW-GREENBYTE-NNN`.
2. Copy **Title** and **Feature slug (previsto)** to `prompt-feature-analysis-package.md` (or paste the STORY-LOG lifecycle block).
3. Update FW item with **Story:** link.
4. Create feature package under `cursor/analysis/features/<area>/<slug>/`.

---

## Required fields (backlog FW)

| Field | Description |
| --- | --- |
| **ID** | `FW-GREENBYTE-<nnn>` |
| **Title** | Human-readable name — same as **Name** in `user-story.md` |
| **Feature slug (previsto)** | kebab-case folder under `cursor/analysis/features/` |
| **Priority** | `P0` · `P1` · `P2` · `P3` |
| **Gap** | One-line label of what is missing |
| **Description** | What to build (2–4 sentences) |
| **Why it matters** | Who / what flow is unblocked |
| **Story shape** | `S` / `M` / `L` — indicative |
| **Ship criteria** | How to know it is done |

## Optional fields

| Field | When |
| --- | --- |
| **Story** | Execution ID when promoted; `—` if backlog only |
| **Blocks** | Other FW IDs or flows blocked |
| **Related** | docs paths, examples, feature slug |
| **Out of scope** | Explicit non-goals |

---

## Recommended format (priority item)

```markdown
### FW-GREENBYTE-NNN — Short title

| | |
| --- | --- |
| **ID** | FW-GREENBYTE-NNN |
| **Title** | Short title (→ feature **Name**) |
| **Feature slug (previsto)** | `greenbyte-…` |
| **Story** | — |
| **Priority** | P1 |
| **Gap** | … |
| **Description** | … |
| **Why it matters** | … |
| **Story shape** | M |
| **Ship criteria** | … |
```

After assigning `GREENBYTE-001`:

```markdown
| **Story** | GREENBYTE-001 → `greenbyte-capability` |
```

## Lifecycle

1. **Backlog** — FW in README; **Story:** `—`.
2. **Promoted** — execution ID assigned; feature package created; registry updated.
3. **In progress** — manifest `implementation`.
4. **Shipped** — [`prompt-feature-close-package.md`](../../prompts/feature/prompt-feature-close-package.md) after review pass.
5. **Deferred** — explicit reason; keep FW ID for traceability.
