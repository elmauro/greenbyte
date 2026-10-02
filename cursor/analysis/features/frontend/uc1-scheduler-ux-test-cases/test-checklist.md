# Test Checklist — UC1 scheduler UX test cases

## Feature

- Name: UC1 scheduler UX test cases
- Slug: uc1-scheduler-ux-test-cases
- Ticket/story: GREENBYTE-009
- Tester: agent
- Date: 2026-10-02
- Environment: local

---

## SOURCE SCOPE

- Acceptance criteria to validate:
  - Matrix covers the scheduler blocks — source: `user-story.md`
  - Cypress stays read-only — source: `user-story.md`
- Source behaviors excluded:
  - How it works page — reason: `frontend/cypress/e2e/how-it-works.cy.ts`
  - Accept and ingest automation — reason: shared live plan

---

## TARGET SCOPE

- Backend areas to validate:
  - none
- Frontend areas to validate:
  - `docs/hackathon/uc1-scheduler-ux-test-cases.md`
  - `frontend/cypress/e2e/uc1-scheduler-ux.cy.ts`
- Infrastructure areas to validate:
  - none
- Integration points:
  - API contract: unchanged
  - Auth / roles: demo session key only
  - Data: in-process calm queue
  - Mocks / E2E: runner forces in-process mode

---

## Automated Checks

- Lint/build:
  - [x] npm run lint --prefix frontend — PASS 2026-10-02 (exit 0; two existing warnings in PlantProgramGantt and PlantHelpDrawer)
- E2E:
  - [x] node frontend/scripts/run-scheduler-ux-e2e.mjs — PASS 2026-10-02 (5 passing in uc1-scheduler-ux.cy.ts, in-process mock, no Accept or ingest)

---

## Smoke — feature (T2)

- [x] npm run lint --prefix frontend — PASS 2026-10-02
- [x] node frontend/scripts/run-scheduler-ux-e2e.mjs — PASS 2026-10-02

---

## Manual (optional) (T3)

- [ ] UX-05 poll, UX-06 pending bell, UX-09 explain body, UX-10 Accept, UX-11 ingest, UX-13 HOLD — optional until an operator runs them on a plan they are allowed to change. The matrix records why each one stays manual.
- [ ] DATA-R01..R03, INV-01..03, MAN-01 — optional operator/BFF checks; documented in the matrix with links to UX rows.

---

## Results

- Summary:
  - passed: lint and the five Cypress cases
  - failed: none
  - blocked: none
- Notes:
  - Validation gate ran both extra commands on 2026-10-02 and exited 0.
  - The spec never clicks Accept and never posts ingest or explain.
- Sign-off: agent / 2026-10-02

---

## Review / Close

- Review: **pass**
- Close blockers: none

Notes: Selectors match the English copy. The runner forces the in-process mock and a free port. GitHub sync is skipped because cursor/scripts/github-story.config.json is absent.
