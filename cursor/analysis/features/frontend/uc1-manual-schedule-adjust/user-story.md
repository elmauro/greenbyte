# User Story — UC1 manual schedule adjust

## Title

- Name: UC1 manual schedule adjust
- Slug: uc1-manual-schedule-adjust
- Ticket/story: GREENBYTE-006
- Backlog ID: n/a
- Change type: feat
- Stack scope: frontend

---

## Suggested sizing

- Story points (Fibonacci: 1, 2, 3, 5, 8, 13): 3
- Indicative only; re-estimate during planning.
- Rationale: frontend-only overlay on the existing queue; no API or database contract change.

---

## Goal

- As a Pasco scheduler
- I want to move runnable batches up or down on the proposed plan
- So that I can show a human correction on the line without sending anything to SAP

---

## SOURCE SCOPE

- Current behavior included:
  - `Adjust manually` was a label with no reorder — evidence: `frontend/src/components/plant/PlantBaselineDashboard.tsx` (before this story) and `docs/hackathon/uc1-mvp-scope.md` §5
- Current behavior excluded:
  - Writing `plan_event` / a new gold plan version — reason: out of scope; schema allows `manual_adjust` but no `gold.adjust_plan` function or BFF route exists
- Source docs:
  - `docs/hackathon/uc1-mvp-scope.md` — role: prior stretch note (button disabled)
  - `backend/docs/api/UC1-SYNGENTA-DEMO-CONTEXT.md` §10 — role: prior out-of-scope note (display-only)

---

## TARGET SCOPE

- Backend target (`backend/`):
  - API / function: none
  - service / layer: none
  - data / infra: none
- Frontend target (`frontend/`):
  - page / route: `/demo/plant` and `/demo/plant/ux` scheduling section
  - component: `PlantBaselineDashboard` adjust panel
  - service / type: `plantManualOrder.ts` applied inside `usePlantDemoQueue`
- Infrastructure target (`infrastructure/`):
  - module / capability: none
  - env / IAM: none
- Out of scope:
  - PostgreSQL persist and accept of the human order — reason: demo stays read-only toward SAP and does not add a BFF route
  - Gantt drag — reason: numbered list is enough for the demo
  - Moving the batch already running, or rows on HOLD — reason: matches the replan rule that position 1 and holds stay put

---

## FLOW

1. Scheduler opens Scheduling and chooses Adjust manually — expected target: the expanded timeline dialog, with up and down controls on runnable batches — evidence/source: `PlantProgramGantt.tsx`
2. Scheduler moves a batch that is not first — expected target: Gantt order updates and the row says it was moved by the scheduler — evidence/source: `plantManualOrder.ts`
3. The queue poll returns the same plan version — expected target: the manual order stays — evidence/source: `usePlantDemoQueue.ts` + `sessionStorage` key `greenbyte-manual-order-v1`
4. A new plan version arrives — expected target: the overlay is dropped — evidence/source: `applyManualOrder` match on `lineId` + `planVersion`

---

## Acceptance Criteria

1. Adjust manually opens the expanded timeline on the plant and UX scheduling screens, with move controls on runnable batches — validation: manual
2. The running batch stays first and HOLD rows are not in the move list — validation: manual
3. A moved batch shows the scheduler reason and its previous position until it is moved back — validation: manual
4. The order survives the queue poll for the same plan version and is not sent to SAP or `gold.accept_plan` — validation: manual

---

## GAPS

- Deferred acceptance:
  - Persist the human order as `plan_event.event_type = manual_adjust` — reason: needs `gold.adjust_plan` and a BFF POST; not in this story
- Open questions:
  - Whether Accept should store the human order — owner: product; current behavior keeps the overlay on screen only
