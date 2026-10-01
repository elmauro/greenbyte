# Test checklist — uc1-manual-schedule-adjust

## Feature

- Name: UC1 manual schedule adjust
- Slug: uc1-manual-schedule-adjust
- Ticket/story: GREENBYTE-006
- Tester: agent
- Date: 2026-10-01
- Environment: local Vite `http://localhost:51730` against the deployed core-api

---

## Automated Checks

- [x] `npm run lint --prefix frontend` — PASS 2026-10-01

---

## Manual — adjust list

- [x] On `/demo/plant/ux?section=scheduling`, Adjust manually opens the runnable list.
- [x] Position 1 (PO 1002267630) is labeled Running and has no arrows.
- [x] PO 1002307552 moved from position 3 to 2; timeline reason became "Moved by the scheduler" and "Moved up · Was position 3".
- [x] Position 2 cannot move above the running batch.
- [x] HOLD rows stayed at the end (POs 1002266350, 1002266913, 1002266889).
- [x] Moving the same PO back restored the server rush reason.

---

## Review

Review: **pass**

Notes: Frontend lint is the automated check because `frontend/package.json` has no `npm test` script. The overlay is client-only; Accept still stores the server plan. Manual check used the live proposed plan in the browser on 2026-10-01.
