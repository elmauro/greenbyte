# Analysis — UC1 BFF demo plant Dynamo stub

## Impact

| Stack | Change |
| --- | --- |
| Infrastructure | New DynamoDB table in `infrastructure/dynamodb/` |
| Backend | `core-api` Lambdas + services; `serverless.common.yml` routes, IAM, CORS |
| Frontend | BFF polling on `/demo/plant`; doc update for live stub |
| Contracts | Unchanged shapes (`plantDemoTypes.ts`, `uc1-demo-response-examples.json`) |

## Risks

| Risk | Mitigation |
| --- | --- |
| Lambda stateless without Dynamo | All mutations via GetItem/PutItem on `LINE#line-1` |
| CORS blocks browser | HTTP API CORS in Serverless |
| SDK not bundled | `core-api/package.json` + deploy install |
| Table missing at first request | Lazy init baseline queue in repository |

## Decisions

- Stub logic ported from `frontend/src/demo/plant/plantDemoServer.ts` (not live Data/Agent yet).
- Table name `${project}-${environment}-demo-plant-state` aligned with Serverless stage `dev`.
- WebSocket push deferred; polling every 10s when `connectionMode === 'bff'`.

## Context trace

| Source | Why read |
| --- | --- |
| `UC1-SYNGENTA-DEMO-CONTEXT.md` | Route list and ownership |
| `plantDemoHandlers.ts` | HTTP contract parity |
| GREENBYTE-002 | `plantDemoApi` + env modes |
