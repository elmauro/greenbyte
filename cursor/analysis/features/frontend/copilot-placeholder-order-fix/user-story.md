# User Story — Copilot placeholder order fix

## Title

- Name: Copilot placeholder order fix
- Slug: copilot-placeholder-order-fix
- Ticket/story: GREENBYTE-008
- Backlog ID: n/a
- Change type: fix
- Stack scope: full-stack

---

## Suggested sizing

- Story points (Fibonacci: 1, 2, 3, 5, 8, 13): 3
- Indicative only; re-estimate during planning.
- Rationale: frontend notice filtering plus the BFF explanation builder; no schema or SQL change.

---

## Goal

- As a scheduler watching Pasco Line 1
- I want the bell and the copilot to stay quiet unless a real order event exists, and to name that order when one does
- So that a missing PO is not shown as a dash and an empty explanation does not look like a live alert

---

## SOURCE SCOPE

- Current behavior included:
  - Explain copy falls back to an em dash when no order number is present — evidence: `backend/core-api/services/plantDemo/explanationBuilder.js`
  - The line bell and copilot render whenever `lastEvent` is set, including a stub with no usable PO — evidence: `frontend/src/hooks/usePlantDemoQueue.ts`, `frontend/src/hooks/usePlantLineNotices.ts`
  - The amber banner can appear with no lead sentence — evidence: `frontend/src/components/plant/PlantBaselineDashboard.tsx`
- Current behavior excluded:
  - How it works page and header consolidation — reason: already closed as GREENBYTE-007
  - Reason-code SQL and gold planner queries — reason: out of scope
- Source docs:
  - `docs/hackathon/uc1-mvp-scope.md` — role: demo explain contract stays read-only

---

## TARGET SCOPE

- Backend target (`backend/`):
  - API / function: explain-replan payload includes held orders
  - service / layer: `explanationBuilder.js`, `planExplanation.js`, `agentApiClient.js`
  - data / infra: unchanged
- Frontend target (`frontend/`):
  - page / route: plant line dashboard notices
  - component: baseline dashboard banner and bell
  - service / type: `plantEventUtils.ts`, queue and notice hooks
- Infrastructure target (`infrastructure/`):
  - module / capability: unchanged
  - env / IAM: unchanged
- Out of scope:
  - Rewriting reason-code SQL — reason: not part of this defect
  - Reopening GREENBYTE-007 — reason: that package is already closed

---

## FLOW

1. A plan explanation is built — expected target: use a real PO from focus, added, held, moves, or the queue, and never print a dash as the order number — evidence/source: `explanationBuilder.js`
2. The queue poll returns `lastEvent` — expected target: surface a notice only when the copy names an order, the diff has a moved, added, or held PO, or a non-stub alert has text — evidence/source: `plantEventUtils.ts`
3. The dashboard renders the bell and banner — expected target: hide them when the explanation has no usable copy — evidence/source: `PlantBaselineDashboard.tsx`

---

## Acceptance Criteria

1. Copilot sentences use a real PO or a batch phrase, and do not contain "PO —" — validation: backend
2. The bell stays empty when the pending explanation is a missing-PO stub with no order in the diff — validation: frontend
3. A real added, held, or moved PO still produces a notice and names that order — validation: backend
4. Frontend lint and the plant-demo explanation test pass — validation: frontend

---

## GAPS

- Deferred acceptance:
  - Browser walkthrough of the live bell — reason: covered by the unit rules and lint; no new Cypress spec in this story
- Open questions:
  - none
- Unknowns:
  - none
