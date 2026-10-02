# Feature Manifest — UC1 scheduler UX test cases

## Feature

- Name: UC1 scheduler UX test cases
- Slug: uc1-scheduler-ux-test-cases
- Ticket/story: GREENBYTE-009
- Backlog ID: n/a
- Change type: test
- Owner: greenbyte-hackathon
- Last updated: 2026-10-02
- Stack scope: frontend

## Goal

- Give reviewers one UC1 scheduler UX matrix and a Cypress spec that does not change the shared live plan.

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
  - `user-story.md` — present — key scope: matrix plus safe Cypress, manual rows for POST
  - `analysis.md` — present — key findings: in-process mock is the safe automated mode
- Current behavior in scope:
  - Scheduler UX, session gate, line query, bell, Scheduling, corner chat, tour — evidence: `docs/hackathon/uc1-mvp-scope.md`, `frontend/src/components/plant/`
- Out of scope:
  - How it works scenarios — reason: existing Cypress spec
  - Live Accept and ingest — reason: shared demo plan

---

## TARGET SCOPE

- Backend (`backend/`):
  - APIs / functions: none
  - services / layers: none
  - data / infra: none
  - docs / tests: none
- Frontend (`frontend/`):
  - pages / components: assertions only
  - services / types: none
  - mocks / E2E / unit tests: `frontend/cypress/e2e/uc1-scheduler-ux.cy.ts` and `frontend/scripts/run-scheduler-ux-e2e.mjs`
  - docs: `docs/hackathon/uc1-scheduler-ux-test-cases.md`
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
  - Step 1: matrix maps each scope block to a case — source: `user-story.md`
  - Step 2: Cypress checks read-only UX against the in-process mock — source: `analysis.md`
- Acceptance criteria summary:
  - Documented cases plus a spec that does not POST — source: `user-story.md`

---

## Key Decisions

- Automate read-only UX on the in-process mock — reason: no call to the live BFF — source: `analysis.md` — status: accepted
- Leave Accept, ingest, explain submit, remote poll, and HOLD adjust manual — reason: POST or missing HOLD rows — source: `analysis.md` — status: accepted
- Skip GitHub issue sync — reason: `cursor/scripts/github-story.config.json` is absent — source: `analysis.md` — status: accepted

---

## GAPS

- Pending decisions:
  - none
- Missing/stale artifacts:
  - matrix, spec, implementation notes, checklist — action: implementation
- Deferred items:
  - Live ingest then Accept — source/reason: shared plan

---

## RISKS

- Risks/blockers:
  - A dev env file can point Vite at API Gateway — impact: high — evidence: `frontend/src/services/apiConfig.ts` — next check: runner overrides MSW and the API base
- Assumptions:
  - Existing aria labels are stable enough for Cypress — validation needed: the spec run

---

## Validation plan

- Run tests: yes
- Frontend tests: no
- Backend tests: n/a
- Infrastructure validate: n/a
- Extra commands:
  - npm run lint --prefix frontend
  - node frontend/scripts/run-scheduler-ux-e2e.mjs

Frontend has no unit-test script. Lint is the frontend check. The node script starts Vite with MSW off and an empty API base, then runs cypress run --spec cypress/e2e/uc1-scheduler-ux.cy.ts. That spec does not click Accept and does not post ingest or explain.

---

## Documentation Sync

- [x] Manifest status matches current implementation.
- [x] `user-story.md` and `test-checklist.md` match current acceptance criteria.
- [x] `implementation-notes.md` reflects shipped behavior when implementation exists.
- [x] API docs / business rules / frontend docs are updated when contracts changed. The scope doc points at the matrix. No API contract changed.

---

## Next Step

- n/a. GitHub issue sync was skipped because cursor/scripts/github-story.config.json is absent.

---

## Links

- Branch/PR: feature/greenbyte-009 (not opened)
- Ticket: GREENBYTE-009
- Related analysis: `docs/hackathon/uc1-mvp-scope.md`
- Design/Figma: n/a
