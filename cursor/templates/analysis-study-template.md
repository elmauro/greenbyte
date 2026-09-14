# Study — `<topic>`

> **Purpose:** research to **generate backlog** — decide whether more stories are needed. Does not implement a single story; each promoted row becomes its own feature package analyzed with [`analysis-template.md`](analysis-template.md).
>
> Save under `cursor/analysis/studies/<study-slug>/study.md`.

## Meta

- Topic: `<what you evaluate, e.g. "Auth hardening gap" or "Onboarding DX">`
- Slug: `<study-slug>`
- Date: `<YYYY-MM-DD>`
- Type: comparison | evaluation | discovery
- Area(s): `backend | frontend | infrastructure | product | multiple`
- Sources reviewed: `<docs/paths, ADRs, APIs, runbooks>`

---

## FINDINGS (current vs target)

| Capability / flow | Reference / target | Today (project) | Gap | Status |
| --- | --- | --- | --- | --- |
| `<capability>` | `<expected behavior>` | `<implemented / partial / none>` | `<concrete delta>` | available \| partial \| missing |

> Do not duplicate long reference tables — link to canonical docs in `docs/`, `backend/docs/`, `frontend/docs/`.

---

## ASSESSMENT

- Priority gaps:
  - `<gap>` — impact: `<why it matters>`
- Out of scope (defer):
  - `<item>` — reason: `<why not now>`
- Assumptions / unknowns:
  - `<assumption>` — how to validate: `<…>`

---

## CANDIDATE STORIES (actionable output)

> Each row with **Decision: implement** becomes a story via intake (Modo A) or `prompt-feature-analysis-package.md`.
> **Backlog ID:** existing `FW-*`, `create` (add to `cursor/company/future-work/`), or `n/a`.

| # | Feature name | Area | Origin | Backlog ID | Priority | Why it matters | Ship criteria (1 line) | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `<name>` | backend \| frontend \| … | comparison \| new | `FW-*` \| create \| n/a | P0–P3 | `<value>` | `<demonstrable done>` | implement \| defer \| confirm |

---

## Promote to stories

**Recommended (agent):** `@cursor/prompts/feature/prompt-story-intake.md` **Mode B** — reads this study and creates feature packages for rows with `Decision: implement`.

**Mechanical register (optional):**

```bash
node cursor/scripts/new-feature.mjs --from-study cursor/analysis/studies/<study-slug>/study.md
```

**Manual (per row):**

1. Assign Ticket/story and Backlog ID (update `STORY-REGISTRY.md` if using `company/future-work/`).
2. Run intake Modo A or:

```text
@cursor/prompts/feature/prompt-feature-analysis-package.md

Feature slug: <feature-slug-from-name>
Feature name: <Feature name from table>
Ticket/story: <ticket>
Stack scope: <area-aligned scope>
```

3. Optionally: `node cursor/scripts/start-feature.mjs --slug <feature-slug>`

If **Backlog ID** was `create`, add the `FW-*` item to the appropriate `future-work/` README before close.
