# Frontend — getting started

GreenByte is a **Vite + React + TypeScript + Tailwind** app. Hackathon focus: **UC1 Plant Capacity** (`/demo/plant`). The UI talks to a **BFF contract**; in local dev that contract is mocked with **MSW** until `core-api` is deployed.

---

## Prerequisites

- **Node.js** 20+ (LTS recommended)
- **npm** 10+
- AWS credentials only if you deploy or call a live API Gateway URL

---

## Run locally (default — mocks on)

From the repo root:

```powershell
cd frontend
npm install
npm run dev
```

Open **http://localhost:51730** (port is fixed in `vite.config.ts`).

Create **`frontend/.env.development`** from [`.env.development.example`](../../.env.development.example) (or copy values below). Vite loads it in dev:

- `VITE_USE_MSW=true` → browser uses **MSW** to mock `/demo/plant/*` (same JSON as backend examples)
- No backend or database required for UC1 demo UI

### Verify UC1 demo

| URL | Purpose |
| --- | --- |
| `/demo/plant` | Interactive Line 1 — rush, QA, explain batch, accept |
| `/demo/plant/tour` | 6-step guided story (rush + QA, same components, read-only) |
| `/demo/plant/flow` | UI ↔ BFF map + JSON + backend owners (steps 01–07 incl. 03c SAP refresh) |
| `/demo/architecture` | Hackathon architecture + endpoint tables |

Footer on `/demo/plant` shows **MSW**, **in-process**, or **live BFF** depending on env.

---

## Environment variables

Copy from [`.env.example`](../.env.example). Vite only exposes vars prefixed with **`VITE_`**.

| Variable | Dev default | Purpose |
| --- | --- | --- |
| `VITE_USE_MSW` | `true` in `.env.development` | Enable Mock Service Worker |
| `VITE_API_BASE_APP` | empty | Live BFF base URL (API Gateway stage) |
| `VITE_API_BASE_AUTH` | empty | Auth API when Cognito flows are wired |
| `VITE_APP_NAME` | `greenbyte-frontend` | Display / config |
| `VITE_PROGRAM_ID` | empty | Optional header for future BFF |

**Live BFF (when Mauricio’s API is ready):** create **`frontend/.env.local`** (gitignored):

```env
VITE_USE_MSW=false
VITE_API_BASE_APP=https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/dev
```

Restart `npm run dev`. See [api-mocks-and-bff.md](./api-mocks-and-bff.md).

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Dev server on port **51730** |
| `npm run build` | Typecheck + production bundle → `dist/` |
| `npm run preview` | Serve `dist/` locally (production-like) |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Cypress (starts dev server on 51730) |

---

## Project layout (hackathon-relevant)

```text
frontend/src/
├─ routes/           AppRoutes, paths.ts
├─ pages/demo/       Plant demo, tour, flow gallery, architecture
├─ components/plant/ UC1 UI (baseline, Gantt, copilot, explain chat)
├─ demo/plant/       Mock domain + types (plantDemoServer, snapshots)
├─ services/         plantDemoApi.ts, apiConfig.ts, axiosInstance.ts
├─ mocks/handlers/   MSW — mirrors BFF paths
└─ i18n/             EN + ES message catalogs
```

**Do not call Data or Agent URLs from the browser** — only BFF paths under `/demo/plant/*`.

Contract references:

- Types: `src/demo/plant/plantDemoTypes.ts`
- Backend JSON examples: `backend/docs/api/uc1-demo-response-examples.json`
- Handoff: `backend/docs/api/UC1-SYNGENTA-DEMO-CONTEXT.md`

---

## Production / static deploy

Build without MSW and without `VITE_API_BASE_APP` → **in-process** mock (works on S3/CloudFront):

```powershell
cd frontend
npm run build
```

Deploy flow: [docs/infrastructure/web-deployment.md](../../../docs/infrastructure/web-deployment.md).

Public demo site: **https://greenbyte-ag.com** (after CI deploy + optional `VITE_API_BASE_APP` at build time for live BFF).

---

## Troubleshooting

| Issue | Check |
| --- | --- |
| MSW not intercepting | `VITE_USE_MSW=true`, hard refresh, `/mockServiceWorker.js` loads (Network tab) |
| CORS errors to API Gateway | BFF must allow your origin; or keep MSW until CORS is configured |
| Wrong port in E2E | Cypress expects **51730** (`vite.config.ts`, `test:e2e` script) |
| Blank page after build | SPA routing — CloudFront error pages must serve `index.html` (see web infra) |

---

## Related docs

- [api-mocks-and-bff.md](./api-mocks-and-bff.md) — three connection modes in detail
- [../README.md](../README.md) — frontend docs index
- `cursor/projects/frontend/project-context.md` — Cursor / agent rules
- Feature **GREENBYTE-002**: `cursor/analysis/features/frontend/uc1-msw-bff-dev-modes/`
