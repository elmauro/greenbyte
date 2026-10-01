# core-api

Primary BFF for GreenByte (`greenbyte-core-api`).

## UC1 plant demo (stub)

Routes mirror MSW / `plantDemoHandlers.ts`. Demo queue state is stored in DynamoDB (`greenbyte-{stage}-demo-plant-state`).

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/demo/plant/lines/{lineId}/queue` | UI poll. When `PGHOST` or `DATABASE_URL` is set, the queue rows come from `gold.v_open_queue` (direct TLS to public RDS, no RDS Proxy). A pending Line 1 replan still comes from Dynamo until it is accepted. |
| POST | `/demo/plant/ingest/sap-priority-change` | Urgency on an existing PO. With `PGHOST` set, calls `gold.ingest_sap_priority_change` (writes `raw.ingest_event` + `silver.process_order_change`, then replans). |
| POST | `/demo/plant/ingest/sap-queue-refresh` | New PO from a COISPI refresh. With `PGHOST` set, inserts `silver.process_order` and `silver.line_schedule_item`, then `gold.replan` writes a proposed plan for that line. |
| POST | `/demo/plant/ingest/pass-fail-log` | QA fail on an existing PO. With `PGHOST` set, calls `gold.ingest_pass_fail` (writes `raw.ingest_event` + `silver.quality_test`, then replans). |
| POST | `/demo/plant/events` | Legacy inject (`rush` \| `qa_fail`) |
| POST | `/demo/plant/reset` | Demo reset |
| POST | `/demo/plant/schedule/accept` | Human sign-off |
| POST | `/demo/plant/batches/explain` | Sales Q&A |

Orchestration (not browser-facing): BFF ingest → **Data** `POST /schedule/replan` → **Agent** `POST /explain-replan` (stubbed in Lambda until `DATA_API_BASE_URL` / `AGENT_API_BASE_URL` are set). See [uc1-bff-data-agent-route-map.md](../../docs/hackathon/uc1-bff-data-agent-route-map.md).

Operator examples: [uc1-demo-operator-ingest.md](../../docs/hackathon/uc1-demo-operator-ingest.md).

## Deploy

1. Apply Terraform table: `infrastructure/dynamodb/` (`demo_plant_state`).
2. From `backend/`: `./deploy-backend.sh dev` (installs `core-api` npm deps, then Serverless).

Set frontend `VITE_USE_MSW=false` and `VITE_API_BASE_APP` to the HTTP API URL from deploy output.

## Health

`GET /api/core/health`
