# Implementation Notes — Copilot placeholder order fix

## Feature

- Name: Copilot placeholder order fix
- Slug: copilot-placeholder-order-fix
- Ticket/story: GREENBYTE-008
- Implementation date: 2026-10-02
- Branch/PR: feature/greenbyte-008

---

## Summary

- Implemented:
  - Server-side PO resolution that rejects dash and bare "PO" placeholders — source: user-story acceptance 1
  - Client notice filter so a missing-PO stub does not open the bell — source: user-story acceptance 2
  - Banner and bell require explanation copy — source: analysis dashboard finding
- Not implemented:
  - How it works page — reason: GREENBYTE-007, already closed
  - Reason-code SQL — reason: out of scope

---

## Key Decisions

- `resolveExplainPo` walks focus, added, held, moves, a planned row that already moved, then the first queued PO after position 1 — reason: the first listed value was often a placeholder — evidence: `explanationBuilder.js` — approved/assumed: assumed from the working-tree fix
- `shouldSurfacePendingNotice` drops a stub that names no order and has no diff PO — reason: a template banner must not keep that stub on screen — evidence: `plantEventUtils.ts` — approved/assumed: assumed
- Leftover "PO —" text is rewritten to the real PO or to "a batch" / "un lote" — reason: a cached explanation can still contain the dash — evidence: `scrubPlaceholderOrder` — approved/assumed: assumed

---

## SOURCE SCOPE

- Requirements implemented:
  - No dash rendered as an order number — source: user-story
  - Empty bell when the pending explanation is a missing-PO stub — source: user-story
  - Real added, held, or moved POs still notify — source: user-story
- Requirements deferred:
  - New Cypress coverage — reason: existing explanation test plus lint

---

## TARGET SCOPE

- Backend files:
  - `backend/core-api/services/plantDemo/explanationBuilder.js`
  - `backend/core-api/services/plantDemo/planExplanation.js`
  - `backend/core-api/services/plantDemo/agentApiClient.js`
  - `backend/tests/core-api-plant-demo-plan-explanation.test.js`
- Frontend files:
  - `frontend/src/demo/plant/plantEventUtils.ts`
  - `frontend/src/hooks/usePlantDemoQueue.ts`
  - `frontend/src/hooks/usePlantLineNotices.ts`
  - `frontend/src/components/plant/PlantBaselineDashboard.tsx`
- Infrastructure files:
  - none
- Docs / rules:
  - this feature package

---

## FLOW

- Step 1: `explainContextFromPlan` calls `resolveExplainPo` and passes held orders to the agent client — evidence: `planExplanation.js`, `agentApiClient.js`
- Step 2: `buildExplainReplan` writes "a batch" / "un lote" when no usable PO remains — evidence: `explanationBuilder.js`
- Step 3: queue and line-notice hooks call `shouldSurfacePendingNotice` and `scrubPlaceholderOrder` — evidence: `usePlantDemoQueue.ts`, `usePlantLineNotices.ts`
- Step 4: the dashboard hides the banner and the current-line bell unless the explanation has copy and review is still pending — evidence: `PlantBaselineDashboard.tsx`

---

## Residual risks

- A non-numeric order id that is only a dash is treated as missing — mitigation: Pasco demo POs are numeric
- How it works files travel in the same commit because they were still uncommitted under the closed GREENBYTE-007 package — mitigation: that story stays closed
