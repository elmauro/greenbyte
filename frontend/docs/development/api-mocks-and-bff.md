# Frontend API modes (mocks → live BFF)

GreenByte follows the same idea as **loyalty-app-vite**: services always call **axios** with stable paths; mocks sit behind HTTP until the real BFF is ready.

## Three modes

| Mode | When | How UC1 `/demo/plant` works |
| --- | --- | --- |
| **MSW** (default dev) | `VITE_USE_MSW=true` | Browser → axios → **MSW** → `plantDemoHandlers` → `plantDemoServer` |
| **In-process** | `VITE_USE_MSW=false` and empty `VITE_API_BASE_APP` | `plantDemoApi` → `plantDemoServer` (no HTTP). Used for static S3 deploy. |
| **Live BFF** | `VITE_USE_MSW=false` and `VITE_API_BASE_APP` set | axios → **core-api** on API Gateway; UC1 stub uses **DynamoDB** for shared demo state |

Camilo and David are **never called from the browser**; the stub BFF implements Pasco rules in Lambda until Data/Agent URLs are wired.

On **live BFF**, `/demo/plant` polls `GET .../queue` every 10s so Postman injects show up without a full page reload.

## Local development (recommended)

```powershell
cd frontend
npm install
npm run dev
```

`.env.development` sets `VITE_USE_MSW=true`. Same JSON as [uc1-demo-response-examples.json](../../../backend/docs/api/uc1-demo-response-examples.json).

## Connect to real BFF (hackathon week)

Create `frontend/.env.local` (gitignored):

```env
VITE_USE_MSW=false
VITE_API_BASE_APP=https://wg7eopv9wl.execute-api.us-east-1.amazonaws.com
```

Restart `npm run dev`. UI code unchanged — only env vars.

**Backend prerequisite (GREENBYTE-003):**

1. `terraform apply` in `infrastructure/dynamodb/` (table `greenbyte-dev-demo-plant-state`).
2. `backend/deploy-backend.sh dev` — deploys UC1 routes on `core-api`.
3. Use the HTTP API base URL from Serverless output as `VITE_API_BASE_APP` (no trailing slash).

## Files to know

| Path | Role |
| --- | --- |
| `src/services/apiConfig.ts` | MSW vs BFF base URLs |
| `src/services/plantDemoApi.ts` | UC1 client (single entry for pages) |
| `src/mocks/handlers/plantDemoHandlers.ts` | MSW routes = BFF contract |
| `src/demo/plant/plantDemoServer.ts` | Mock business rules + JSON |
| `src/demo/plant/plantDemoTypes.ts` | Types shared with backend docs |

## E2E

`npm run test:e2e` starts dev server; set `VITE_USE_MSW=true` so Cypress hits mocked BFF.

## Adding new endpoints

1. Extend `plantDemoTypes.ts`.
2. Implement in `plantDemoServer.ts`.
3. Add MSW handler in `plantDemoHandlers.ts`.
4. Expose via `plantDemoApi.ts` (axios paths only).
5. Update backend OpenAPI / `uc1-demo-response-examples.json`.

When Data/Agent are ready, Mauricio implements the same paths on core-api; frontend only toggles env.
