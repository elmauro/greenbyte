# core-api

Primary BFF for GreenByte (`greenbyte-core-api`).

## UC1 plant demo (stub)

Routes mirror MSW / `plantDemoHandlers.ts`. Demo queue state is stored in DynamoDB (`greenbyte-{stage}-demo-plant-state`).

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/demo/plant/lines/{lineId}/queue` | UI poll |
| POST | `/demo/plant/ingest/sap-priority-change` | Primary demo — rush replan |
| POST | `/demo/plant/ingest/pass-fail-log` | Primary demo — QA hold replan |
| POST | `/demo/plant/events` | Legacy inject (`rush` \| `qa_fail`) |
| POST | `/demo/plant/reset` | Demo reset |
| POST | `/demo/plant/schedule/accept` | Human sign-off |
| POST | `/demo/plant/batches/explain` | Sales Q&A |

Operator examples: [uc1-demo-operator-ingest.md](../../docs/hackathon/uc1-demo-operator-ingest.md).

## Deploy

1. Apply Terraform table: `infrastructure/dynamodb/` (`demo_plant_state`).
2. From `backend/`: `./deploy-backend.sh dev` (installs `core-api` npm deps, then Serverless).

Set frontend `VITE_USE_MSW=false` and `VITE_API_BASE_APP` to the HTTP API URL from deploy output.

## Health

`GET /api/core/health`
