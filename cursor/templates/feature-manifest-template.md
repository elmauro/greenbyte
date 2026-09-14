# Feature Manifest — `<feature-name>`

> Use Feature name in the title. Use Feature slug only in the `Slug:` field and folder path.

## Feature

- Name: `<feature-name>`
- Slug: `<feature-slug>`
- Ticket/story: `<ticket-or-story-id>`
- Backlog ID: `<FW-*|n/a>` — backlog de producto; no sustituye Ticket/story
- Owner:
- Last updated:
- Stack scope: backend | frontend | infrastructure | full-stack

## Goal

- `<one-line outcome and target user/role>`

---

## Status

- User Story: not started | in progress | done | n/a
- Analysis: not started | in progress | done | n/a
- Implementation: not started | in progress | done | n/a
- Testing: not started | in progress | done | n/a
- Review: not started | in progress | done | n/a
- Current stage: intake | analysis | planned | implementation | validation | review | done

---

## SOURCE SCOPE

- Problem / opportunity status: clear | partial | unknown | n/a
- Source documents:
  - `user-story.md` — present | missing | stale — key scope:
  - `analysis.md` — present | missing | stale — key findings:
- Current behavior in scope:
  - `<behavior>` — evidence: `<repo path / doc>`
- Out of scope:
  - `<item>` — reason:

---

## TARGET SCOPE

- Backend (`backend/`):
  - APIs / functions:
  - services / layers:
  - data / infra:
  - docs / tests:
- Frontend (`frontend/`):
  - pages / components:
  - services / types:
  - mocks / E2E / unit tests:
  - docs:
- Infrastructure (`infrastructure/`):
  - modules / capabilities:
  - env / IAM / deploy:
  - docs:

---

## Documents

- `user-story.md` — present | missing | stale
- `analysis.md` — present | missing | stale | n/a
- `implementation-notes.md` — present | missing | stale | n/a
- `test-checklist.md` — present | missing | stale | n/a

---

## FLOW

- Current shipped/planned flow:
  - Step 1: `<behavior>` — source: `<doc/path>`
  - Step 2: `<behavior>` — source: `<doc/path>`
- Acceptance criteria summary:
  - `<AC>` — source: `<user-story>`

---

## Key Decisions

- `<decision>` — reason: `<reason>` — source: `<doc/path>` — status: proposed | accepted | rejected

---

## GAPS

- Pending decisions:
  - `<decision>` — owner/status:
- Missing/stale artifacts:
  - `<file>` — action:
- Deferred items:
  - `<item>` — source/reason:

---

## RISKS

- Risks/blockers:
  - `<risk>` — impact: high | medium | low — evidence: `<source>` — next check:
- Assumptions:
  - `<assumption>` — validation needed:

---

## Validation plan

- Run tests: yes | no
- Frontend tests: yes | no | n/a
- Backend tests: yes | no | n/a
- Infrastructure validate: yes | no | n/a
- Extra commands:
  - n/a

> Filled at analysis. The validation gate (`run-feature-gates.mjs --phase validation`) runs stack tests and extra commands only when **Run tests: yes**. See [`story-validation.md`](../docs/story-validation.md).

---

## Documentation Sync

- [ ] Manifest status matches current implementation.
- [ ] `user-story.md` and `test-checklist.md` match current acceptance criteria.
- [ ] `implementation-notes.md` reflects shipped behavior when implementation exists.
- [ ] API docs / business rules / frontend docs are updated when contracts changed.

---

## Next Step

- `<single next action>`

---

## Links

- Branch/PR:
- Ticket:
- Related analysis:
- Design/Figma:
