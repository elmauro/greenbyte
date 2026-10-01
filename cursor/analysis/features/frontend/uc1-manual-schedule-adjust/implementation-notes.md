# Implementation notes — UC1 manual schedule adjust

## What shipped

The scheduler reorders batches by dragging a row on the program timeline, including the compact view. The same controls stay available in the expanded timeline. Up and down buttons sit on each runnable row. There is no separate Adjust manually action.

- Position 1 (the running batch) has no move buttons.
- Other runnable rows move up or down and cannot pass position 1.
- HOLD rows stay after the runnable sequence and are not in the list.
- A moved row uses reason "Moved by the scheduler" / "Lo movió el planificador" and `previousPosition` from the baseline. Moving it back restores the server reason.

## Where

| Piece | Path |
| --- | --- |
| Overlay record and apply | `frontend/src/demo/plant/plantManualOrder.ts` |
| Reapply on each snapshot | `frontend/src/hooks/usePlantDemoQueue.ts` (`setManualOrder`) |
| Panel | `frontend/src/components/plant/PlantBaselineDashboard.tsx` |
| Wiring | `PlantLineUx.tsx`, `PlantLineMvp.tsx` |
| Copy | `frontend/src/i18n/messages/en.ts`, `es.ts` (`scheduleShell.adjust*`) |

Storage key: `greenbyte-manual-order-v1`. A record is kept only when `lineId` and `planVersion` match. A new plan version drops it.

## What did not change

- `POST` accept still calls `gold.accept_plan` for the server plan. The overlay is not in that body.
- No SAP write. No new core-api route. No migration.

`PlantScheduleWorkspace.tsx` still has an unused display-only button and is not mounted.
