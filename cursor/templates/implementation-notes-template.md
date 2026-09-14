# Implementation Notes — `<feature-name>`

> Use Feature name in the title. Use Feature slug only in the `Slug:` field and folder path.

## Feature

- Name: `<feature-name>`
- Slug: `<feature-slug>`
- Ticket/story:
- Implementation date:
- Branch/PR:

---

## Summary

- Implemented:
  - `<capability>` — source: `<user-story / analysis>`
- Not implemented:
  - `<item>` — reason:

---

## Key Decisions

- `<decision>` — reason: `<reason>` — evidence: `<path + symbol/doc>` — approved/assumed:

---

## SOURCE SCOPE

- Requirements implemented:
  - `<acceptance criterion / behavior>` — source: `<user-story / analysis>`
- Requirements deferred:
  - `<item>` — reason:

---

## TARGET SCOPE

- Backend files affected:
  - `<path>` — layer: API | service | layer | data | infra | docs | tests — reason:
- Frontend files affected:
  - `<path>` — area: page | component | service | type | mock | test | docs — reason:
- Infrastructure files affected:
  - `<path>` — area: module | capability | env | docs — reason:
- Patterns reused:
  - `<pattern/service/component/helper>` — evidence: `<path + symbol>`
- New components or helpers:
  - `<path/symbol>` — reason no existing pattern covered it:

---

## FLOW

- Step 1: `<expected behavior>` → `<implementation>` — files: `<paths>`
- Step 2: `<expected behavior>` → `<implementation>` — files: `<paths>`
- Step 3: `<expected behavior>` → `<implementation>` — files: `<paths>`

---

## Contract / Documentation Sync

- API docs updated: yes | no | n/a — file:
- Business rules updated: yes | no | n/a — file:
- Frontend docs updated: yes | no | n/a — file:
- Mock handlers updated: yes | no | n/a — file:
- E2E/unit/integration tests updated: yes | no | n/a — files:

---

## Deviations

- From analysis/user story:
  - `<difference>` — reason: `<reason>` — approved/assumed:
- From existing pattern:
  - `<difference>` — reason: `<reason>` — approved/assumed:

---

## GAPS

- Deferred items:
  - `<item>` — source: `<analysis/user-story>` — reason:
- Known limitations:
  - `<limitation>` — impact:
- Unknowns:
  - `<unknown>` — evidence checked:

---

## Context trace (optional)

> When context reads were heavy or ambiguous, record 2–4 rows per `cursor/docs/context-trace-matrix.md`.

| Context | Used for | Value | Action |
| --- | --- | --- | --- |
| `<path>` | `<decision>` | High \| Medium \| Low | Keep scoped \| Optional \| Do not default |

---

## RISKS

- Implementation risks:
  - `<risk>` — mitigation: `<code/test/QA check>`
- Regression risks:
  - `<area>` — validation:
- Follow-ups:
  - `<task>` — owner/status:

---

## How to Test Manually

1. `<step>`
2. `<step>`
3. `<step>`
