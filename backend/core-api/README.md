# core-api

Primary BFF for GreenByte (`greenbyte-core-api`).

## UC1 plant demo (stub)

Routes mirror MSW / `plantDemoHandlers.ts`. Demo queue state is stored in DynamoDB (`greenbyte-{stage}-demo-plant-state`).

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/demo/plant/lines/{lineId}/queue` | UI poll. When `PGHOST` is set and the latest plan is `PROPOSED`, the response is that order, its reasons, and the simulated copilot text. Otherwise the rows come from `gold.v_open_queue`. |
| POST | `/demo/plant/ingest/sap-priority-change` | Urgency on an existing PO. With `PGHOST` set, calls `gold.ingest_sap_priority_change` (writes `raw.ingest_event` + `silver.process_order_change`, then replans). |
| POST | `/demo/plant/ingest/sap-queue-refresh` | New PO from a COISPI refresh. With `PGHOST` set, inserts `silver.process_order` and `silver.line_schedule_item`, then `gold.replan` writes a proposed plan for that line. |
| POST | `/demo/plant/ingest/pass-fail-log` | QA fail on an existing PO. With `PGHOST` set, calls `gold.ingest_pass_fail` (writes `raw.ingest_event` + `silver.quality_test`, then replans). |
| POST | `/demo/plant/schedule/accept` | Human sign-off. With `PGHOST` set, calls `gold.accept_plan`: inserts `gold.plan_decision` (`ACCEPT`) and sets the latest `gold.schedule_plan` to `ACCEPTED`. No SAP write. |
| POST | `/demo/plant/batches/explain` | Sales nice-to-have. Read-only Q&A on one batch. Simulated until `AGENT_API_BASE_URL` is set. |

Orchestration (not browser-facing): after a database replan, the BFF calls simulated Agent `POST /explain-replan` and returns that text on the ingest response and on `GET .../queue` while the plan is `PROPOSED`. A live Agent replaces the template when `AGENT_API_BASE_URL` is set. See [uc1-bff-data-agent-route-map.md](../../docs/hackathon/uc1-bff-data-agent-route-map.md).

Operator examples: [uc1-demo-operator-ingest.md](../../docs/hackathon/uc1-demo-operator-ingest.md).

## Deploy

1. Apply Terraform table: `infrastructure/dynamodb/` (`demo_plant_state`).
2. From `backend/`: `./deploy-backend.sh dev` (installs `core-api` npm deps, then Serverless).

Set frontend `VITE_USE_MSW=false` and `VITE_API_BASE_APP` to the HTTP API URL from deploy output.

## Health

`GET /api/core/health`
