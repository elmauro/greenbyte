# Feature Manifest — UC1 manual schedule adjust

## Feature

- Name: UC1 manual schedule adjust
- Slug: uc1-manual-schedule-adjust
- Ticket/story: GREENBYTE-006
- Backlog ID: n/a
- Change type: feat
- Owner: frontend
- Last updated: 2026-10-01
- Stack scope: frontend

## Goal

- Let a scheduler reorder runnable batches on the Pasco line without writing PostgreSQL or SAP.

---

## Status

- User Story: done
- Analysis: done
- Implementation: done
- Testing: done
- Review: done
- Current stage: done

---

## SOURCE SCOPE

- Problem / opportunity status: clear
- Source documents:
  - `user-story.md` — present — key scope: browser reorder, no persist
  - `analysis.md` — present — key findings: overlay on the current plan version
- Current behavior in scope:
  - Adjust list on the scheduling section — evidence: `frontend/src/components/plant/PlantBaselineDashboard.tsx`
- Out of scope:
  - `gold.adjust_plan` and BFF POST — reason: deferred

---

## TARGET SCOPE

- Backend (`backend/`):
  - APIs / functions: none
  - services / layers: none
  - data / infra: none
  - docs / tests: `backend/docs/api/UC1-SYNGENTA-DEMO-CONTEXT.md` §10 wording
- Frontend (`frontend/`):
  - pages / components: `PlantBaselineDashboard`, `PlantLineUx`, `PlantLineMvp`
  - services / types: `frontend/src/demo/plant/plantManualOrder.ts`, `usePlantDemoQueue`
  - mocks / E2E / unit tests: none (no frontend unit runner)
  - docs: `docs/hackathon/uc1-mvp-scope.md` §5
- Infrastructure (`infrastructure/`):
  - modules / capabilities: none
  - env / IAM / deploy: none
  - docs: none

---

## Documents

- `user-story.md` — present
- `analysis.md` — present
- `implementation-notes.md` — present
- `test-checklist.md` — present

---

## FLOW

- Current shipped/planned flow:
  - Step 1: open Adjust manually — source: `PlantBaselineDashboard.tsx`
  - Step 2: move a runnable batch — source: `plantManualOrder.ts`
  - Step 3: poll reapplies the same order — source: `usePlantDemoQueue.ts`
- Acceptance criteria summary:
  - Running batch and holds stay put — source: `user-story.md`
  - Order is not sent to SAP — source: `user-story.md`

---

## Key Decisions

- Browser overlay keyed by line and plan version — reason: no new API — source: `analysis.md` — status: accepted

---

## GAPS

- Pending decisions:
  - Persist on Accept — owner: product / deferred
- Missing/stale artifacts:
  - none
- Deferred items:
  - `gold.adjust_plan` — source: `analysis.md`

---

## RISKS

- Risks/blockers:
  - Accept stores the server plan while the screen can still show the overlay — impact: medium — evidence: `usePlantDemoQueue.ts` — next check: product decision before a backend story
- Assumptions:
  - Demo login session is enough; no multi-user lock — validation needed: none for hackathon demo

---

## Validation plan

- Run tests: yes
- Frontend tests: no
- Backend tests: n/a
- Infrastructure validate: n/a
- Extra commands:
  - `npm run lint --prefix frontend`

Frontend has no unit-test script. Lint is the stack check. The browser check of the adjust list is recorded in test-checklist.md.

---

## Documentation Sync

- [x] Manifest status matches current implementation.
- [x] `user-story.md` and `test-checklist.md` match current acceptance criteria.
- [x] `implementation-notes.md` reflects shipped behavior when implementation exists.
- [x] API docs / business rules / frontend docs are updated when contracts changed.

---

## Next Step

- Close the package after review gate passes.

---

## Links

- Branch/PR: local working tree on `master` (not committed with this package)
- Ticket: GREENBYTE-006
- Related analysis: `docs/hackathon/uc1-mvp-scope.md`
- Design/Figma: n/a
