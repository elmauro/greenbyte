# Analysis — Copilot placeholder order fix

## Feature

- Name: Copilot placeholder order fix
- Slug: copilot-placeholder-order-fix
- Ticket/story: GREENBYTE-008
- Analysis date: 2026-10-02
- Stack scope: full-stack

---

## SOURCE SCOPE

- Problem / opportunity:
  - The demo copilot printed "PO —" when the explain context had no order number, and the bell stayed on for that empty stub.
- Current behavior:
  - `buildExplainReplan` used `focusPo ?? added[0] ?? moves[0]?.po ?? '—'` — evidence: `backend/core-api/services/plantDemo/explanationBuilder.js`
  - `explainContextFromPlan` picked the first added, held, or moved PO without rejecting placeholders — evidence: `backend/core-api/services/plantDemo/planExplanation.js`
  - `usePlantDemoQueue` treated any `lastEvent` as a pending notice — evidence: `frontend/src/hooks/usePlantDemoQueue.ts`
- Source files or docs reviewed:
  - `backend/tests/core-api-plant-demo-plan-explanation.test.js` — role: existing explanation contract — evidence: plan explanation cases
  - `frontend/src/demo/plant/plantEventUtils.ts` — role: notice and PO helpers — evidence: `shouldSurfacePendingNotice`
- Out of scope:
  - GREENBYTE-007 How it works page — reason: closed package, shipped in the same working tree but not this story
  - Reason-code SQL — reason: not required to stop the placeholder
- Unknowns:
  - none — evidence checked: working tree diff for explanation builder, plan explanation, queue hook, and line notices

---

## TARGET SCOPE

- Backend impact (`backend/`):
  - APIs / functions: explain-replan body gains `held`
  - services / layers: `resolveExplainPo` and `isUsablePo` reject dash and bare "PO" placeholders
  - data / DynamoDB / PostgreSQL: unchanged
  - API docs / business rules: no new public route
  - tests: extend `core-api-plant-demo-plan-explanation.test.js`
- Frontend impact (`frontend/`):
  - pages / components: banner and bell require real explanation copy
  - services / types / hooks: scrub leftover "PO —" text and drop empty notices
  - mocks / MSW: unchanged
  - E2E: no new spec
- Infrastructure impact (`infrastructure/`):
  - modules / capabilities: unchanged
  - env / IAM / deploy: unchanged
- Integration points:
  - API contract: same explain fields; copy no longer uses a dash as a PO
  - Auth / roles: unchanged
  - Data: queue rows and plan diff already on the response
  - Mocks / E2E: MSW still mirrors the BFF payload

---

## Decisions

- Resolve the order on the server before writing the sentence, and filter the notice on the client if a stub still arrives — reason: both the live BFF and a cached explanation can carry the placeholder.
- Say "a batch" / "un lote" when no usable PO exists — reason: the sentence stays grammatical without inventing an order number.

---

## Risks

- A legitimate order whose text is only a dash would be dropped — impact: low — evidence: Pasco POs are numeric.
- Hiding a stub also hides a template banner that has no order — impact: low — evidence: `shouldSurfacePendingNotice` still keeps a non-stub alert and any real PO in the diff.
