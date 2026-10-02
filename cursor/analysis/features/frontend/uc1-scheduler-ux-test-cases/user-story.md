# User Story — UC1 scheduler UX test cases

## Title

- Name: UC1 scheduler UX test cases
- Slug: uc1-scheduler-ux-test-cases
- Ticket/story: GREENBYTE-009
- Backlog ID: n/a
- Change type: test
- Stack scope: frontend

---

## Suggested sizing

- Story points (Fibonacci: 1, 2, 3, 5, 8, 13): 5
- Indicative only; re-estimate during planning.
- Rationale: one UX matrix plus a read-only Cypress spec; no product behavior change.

---

## Goal

- As a scheduler demo reviewer
- I want one documented UX test matrix for the UC1 Pasco scheduler, with safe automated checks
- So that sign-in, line choice, the calm queue, notifications, Scheduling, Accept, and both copilot surfaces are covered without posting to the shared live plan

---

## SOURCE SCOPE

- Current behavior included:
  - Demo-day UI blocks on the plant routes — evidence: `docs/hackathon/uc1-mvp-scope.md` section 4.1 and section 5.1
  - Scheduler workspace at `/demo/plant/ux` — evidence: `frontend/src/pages/demo/PlantCapacityUxDemo.tsx`, `frontend/src/components/plant/PlantLineUx.tsx`
  - Session gate — evidence: `frontend/src/components/demo/DemoSessionGuard.tsx`, session key `greenbyte-plant-ux-session-v1`
  - Older partial checklists — evidence: `cursor/analysis/features/frontend/uc1-plant-ux-compare/test-checklist.md`, `cursor/analysis/features/frontend/uc1-manual-schedule-adjust/test-checklist.md`
  - Cypress today covers language and How it works only — evidence: `frontend/cypress/e2e/language.cy.ts`, `frontend/cypress/e2e/how-it-works.cy.ts`
- Current behavior excluded:
  - How it works page behavior — reason: already covered by `frontend/cypress/e2e/how-it-works.cy.ts`
  - Rewriting product copy or plan logic — reason: this story records tests, it does not change the scheduler
- Source docs:
  - `docs/hackathon/uc1-mvp-scope.md` — role: scope the matrix must map to
  - `frontend/src/i18n/messages/en.ts` — role: English UI copy the spec asserts

---

## TARGET SCOPE

- Backend target (`backend/`):
  - API / function: none
  - service / layer: none
  - data / infra: none
- Frontend target (`frontend/`):
  - page / route: `/demo/sign-in`, `/demo/plant`, `/demo/plant/ux`, `/demo/plant/tour`
  - component: no behavior change; selectors already exist (aria labels and data attributes)
  - service / type: none
- Infrastructure target (`infrastructure/`):
  - module / capability: none
  - env / IAM: none
- Out of scope:
  - Clicking Accept or posting ingest against the live BFF — reason: that mutates the shared demo plan
  - How it works scenarios — reason: existing Cypress spec
  - UC4, ERP write-back, multi-line Gantt — reason: deferred in the scope doc

---

## FLOW

1. Reviewer opens the matrix — expected target: each scheduler block from the scope doc has an id, route, precondition, steps, expected result, and automated or manual — evidence/source: `docs/hackathon/uc1-mvp-scope.md`
2. Reviewer runs the safe Cypress spec — expected target: sign-in redirect, signed-in UX workspace, line query param, Scheduling, corner chat, and a calm bell with no placeholder order — evidence/source: `frontend/cypress/e2e/uc1-scheduler-ux.cy.ts`
3. Reviewer follows the manual rows for poll, Accept, ingest, explain submit, and HOLD adjust — expected target: those rows say why they stay manual — evidence/source: matrix

---

## Acceptance Criteria

1. One English matrix in `docs/hackathon/` maps the UC1 scheduler blocks to test cases — validation: manual
2. Cypress covers the read-only scheduler flows and does not POST accept, ingest, or explain — validation: E2E
3. Accept, ingest, the explain submit, queue poll on a remote mode, and HOLD adjust stay manual, with the reason written down — validation: manual
4. How it works is named as out of scope and points at the existing Cypress spec — validation: manual
5. The guided tour route is included because `/demo/plant/tour` still exists — validation: E2E

---

## GAPS

- Deferred acceptance:
  - A full ingest-then-accept browser run against the live plan — reason: it would change the shared demo plan
- Unknowns:
  - Whether the deployed BFF currently has a pending event — evidence checked: the spec does not read that plan

---

## RISKS

- Product / contract risks:
  - A Cypress run pointed at the live API Gateway would GET or POST the shared plan — mitigation/check: the e2e runner forces the in-process mock
- Validation focus:
  - Bell copy must not show a dash standing in for an order number — expected result: calm bell says there are no new notifications

---

## Notes

- Environment / flags: Cypress starts Vite with MSW off and an empty API base so the page uses the in-process queue
- Test data: session username `greenbyte_user` in sessionStorage; no password in the spec or in this story
- Related docs: `docs/hackathon/uc1-scheduler-ux-test-cases.md`
- Last updated: 2026-10-02
