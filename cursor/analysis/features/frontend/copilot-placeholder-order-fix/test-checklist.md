# Test Checklist — Copilot placeholder order fix

## Feature

- Name: Copilot placeholder order fix
- Slug: copilot-placeholder-order-fix
- Ticket/story: GREENBYTE-008
- Tester: greenbyte-hackathon
- Date: 2026-10-02
- Environment: local

---

## SOURCE SCOPE

- Acceptance criteria to validate:
  - No dash used as a PO — source: user-story
  - Empty bell for a missing-PO stub — source: user-story
  - Real PO still notifies — source: user-story
- Source behaviors excluded:
  - How it works navigation — reason: GREENBYTE-007

---

## TARGET SCOPE

- Backend areas to validate:
  - explanation builder and plan explanation — evidence: implementation-notes
- Frontend areas to validate:
  - notice helpers and dashboard bell — evidence: implementation-notes
- Infrastructure areas to validate:
  - none
- Integration points:
  - API contract: explain copy only
  - Auth / roles: unchanged
  - Data: unchanged
  - Mocks / E2E: no new spec

---

## FLOW

### Happy Path

- [x] Scenario: explanation names a real PO
  - Steps:
    1. Run the plant-demo explanation test
  - Expected result: sentences use the order number
  - Evidence / mapping: backend/tests/core-api-plant-demo-plan-explanation.test.js — 10 passed

### Edge Cases

- [x] Scenario: missing PO does not become a dash or a bell
  - Expected result: batch wording and no surfaced stub notice
  - Evidence: explanation test plus shouldSurfacePendingNotice in plantEventUtils.ts

---

## Automated Checks

- Backend unit/service:
  - [x] npm test --prefix backend -- tests/core-api-plant-demo-plan-explanation.test.js — result: PASS 2026-10-02 (1 suite, 10 tests)
- Frontend unit:
  - [x] n/a — result: frontend has no unit-test script
- Lint/build:
  - [x] npm run lint --prefix frontend — result: PASS 2026-10-02 (exit 0, 2 existing warnings in PlantProgramGantt.tsx and PlantHelpDrawer.tsx, outside this diff)

---

## Results

- Summary:
  - passed: frontend lint; plant-demo explanation Jest (10)
  - failed: none
  - blocked: none
- Notes:
  - Validation plan lists the two commands as plain lines. They were run in this session and both exited 0.
- Sign-off: validation complete 2026-10-02

---

## Review / Close

- Findings: no blockers or majors. Placeholder POs are rejected on the server and empty stubs are dropped before the bell. Two eslint warnings remain in files this story does not change.
- Review: **pass**
- Close blockers: none
