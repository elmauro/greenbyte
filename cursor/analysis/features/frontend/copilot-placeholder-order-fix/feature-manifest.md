# Feature Manifest — Copilot placeholder order fix

## Feature

- Name: Copilot placeholder order fix
- Slug: copilot-placeholder-order-fix
- Ticket/story: GREENBYTE-008
- Backlog ID: n/a
- Change type: fix
- Owner: greenbyte-hackathon
- Last updated: 2026-10-02
- Stack scope: full-stack

## Goal

- Keep the plant bell and copilot off when there is no real order event, and name the PO when one exists.

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
  - `user-story.md` — present — key scope: no dash-as-PO and no empty bell
  - `analysis.md` — present — key findings: resolve the PO on the server and filter notices on the client
- Current behavior in scope:
  - Explain fallback and unconditional lastEvent notice — evidence: `explanationBuilder.js`, `usePlantDemoQueue.ts`
- Out of scope:
  - How it works reference — reason: GREENBYTE-007 is already closed
  - Reason-code SQL — reason: not this defect

---

## TARGET SCOPE

- Backend (`backend/`):
  - APIs / functions: explain-replan includes held orders
  - services / layers: explanationBuilder, planExplanation, agentApiClient
  - data / infra: unchanged
  - docs / tests: plant-demo plan explanation test
- Frontend (`frontend/`):
  - pages / components: PlantBaselineDashboard banner and bell
  - services / types: plantEventUtils, usePlantDemoQueue, usePlantLineNotices
  - mocks / E2E / unit tests: lint; no new Cypress spec
  - docs: unchanged for this story
- Infrastructure (`infrastructure/`):
  - modules / capabilities: unchanged
  - env / IAM / deploy: unchanged
  - docs: unchanged

---

## Documents

- `user-story.md` — present
- `analysis.md` — present
- `implementation-notes.md` — present
- `test-checklist.md` — present

---

## FLOW

- Current shipped/planned flow:
  - Step 1: resolve a usable PO or omit it — source: `analysis.md`
  - Step 2: surface a notice only for a real order or a non-stub alert — source: `user-story.md`
- Acceptance criteria summary:
  - No "PO —" copy, empty bell for stubs, real POs still notify — source: `user-story.md`

---

## Validation plan

- Run tests: yes
- Frontend tests: no
- Backend tests: no
- Infrastructure validate: n/a
- Extra commands:
  - npm run lint --prefix frontend
  - npm test --prefix backend -- tests/core-api-plant-demo-plan-explanation.test.js

Frontend has no unit-test script. Lint is the frontend check. The backend check is the existing plant-demo explanation test.

---

## Handoff

- Next step: implementation notes and validation evidence
