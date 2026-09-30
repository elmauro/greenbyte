# core-api

Primary BFF for GreenByte (`greenbyte-core-api`).

## UC1 plant demo (stub)

Routes mirror MSW / `plantDemoHandlers.ts`. Demo queue state is stored in DynamoDB (`greenbyte-{stage}-demo-plant-state`).

| Method | Path |
| --- | --- |
| GET | `/demo/plant/lines/{lineId}/queue` |
| POST | `/demo/plant/events` |
| POST | `/demo/plant/reset` |
| POST | `/demo/plant/schedule/accept` |
| POST | `/demo/plant/batches/explain` |

## Deploy

1. Apply Terraform table: `infrastructure/dynamodb/` (`demo_plant_state`).
2. From `backend/`: `./deploy-backend.sh dev` (installs `core-api` npm deps, then Serverless).

Set frontend `VITE_USE_MSW=false` and `VITE_API_BASE_APP` to the HTTP API URL from deploy output.

## Health

`GET /api/core/health`
