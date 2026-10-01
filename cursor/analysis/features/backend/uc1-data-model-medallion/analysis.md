# Analysis — UC1 data model medallion (raw silver gold)

## Impact

| Stack | Change |
| --- | --- |
| Backend / database | New `backend/database/migrations/`, `etl/transforms/{silver,gold}/`, `seeds/`, `tests/`, `etl/build_model.py` |
| Database (dev RDS `greenbyte`) | New schemas `silver`, `gold`; new table `raw.ingest_event`. Raw CSV tables untouched |
| Contracts | No BFF/frontend code change. Gold JSON follows `plantDemoTypes.ts` (`PlantQueueResponse`, `PlantEventResponse` facts, `PlantAcceptResponse`) |
| Docs | `backend/data-model/*` v3, `backend/database/README.md`, `docs/hackathon/uc1-system-blueprint.md` §4.1/§7, `uc1-demo-operator-ingest.md`, observations pointers |

## Risks

| Risk | Mitigation |
| --- | --- |
| Rebuild breaks runtime state | Silver/gold are fully derived; plans are regenerated from `raw.ingest_event` replay. Accept decisions are demo-session state (documented) |
| Partial build | One transaction for all steps + reconciliation; any failure rolls back |
| Agent invents facts | `gold.agent_context` returns `citable` ids only; ingest refuses POs not on the open queue |
| Stub anchors don't exist in the open queue | New anchors proposed (`1002295402` rush, `1002307552` QA fail), tested in `demo_scenario.sql`; BFF switch left to its owner |

## Decisions

- Medallion instead of `ref`/`ops`/`plan`: `silver` = conformed inputs (incl. synthetic customer orders and ingest overlays), `gold` = derived + decisions. `changeover_rule` and `reason_code` moved to gold (they are derived / use-case artifacts).
- `silver.process_order.po_number` is `UNIQUE NOT NULL`; placeholders and lot numbers stay on fact rows (`po_number_raw`, `po_number_status`).
- R-PO: the 9-digit `100…` pattern is narrowed to `10002\d{4}` (Seed Health), so the typo `100184897` stays SUSPECT.
- Throughput for durations uses input kg/h (the source `RAW KG per hour`, 1,377 on Line 1). The v2 figure (1,114) is the output basis.
- Heuristic implemented in PL/pgSQL (`gold.replan`) so it is testable with psql; the Data API is a thin HTTP layer over gold functions.

## Context trace

| Source | Why read |
| --- | --- |
| `backend/data-model/uc1-data-model.md` v2, `csv-to-raw-integration.md` | Target design, raw conventions |
| `observations.md` §5–§10 | Column mapping, R-* rules, DQ catalog, reconciliation targets |
| `docs/hackathon/uc1-blueprint-narrative.md`, `uc1-system-blueprint.md`, `uc1-demo-operator-ingest.md` | Storyline, events, contract, ingest routes |
| `frontend/src/demo/plant/plantDemoTypes.ts` | JSON shapes gold must return |
