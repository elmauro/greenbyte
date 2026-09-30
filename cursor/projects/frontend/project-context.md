# Frontend Context - GreenByte

## Overview

Web frontend for `GreenByte`, domain `AgTech — intelligent agriculture and crop data`.

## Stack

- React
- TypeScript
- Vite
- Tailwind CSS

## Expected structure

```text
frontend/
├─ src/
│  ├─ components/
│  ├─ pages/
│  ├─ routes/
│  ├─ services/
│  ├─ types/
│  └─ utils/
├─ docs/
└─ package.json
```

Generated features: `router,services,types,tailwind,msw`

Use `frontend/frontend.config.json` as the source of truth for selected frontend features.

## Run locally

```powershell
cd frontend && npm install && npm run dev
```

→ **http://localhost:51730** · UC1: `/demo/plant`

Docs: **`frontend/docs/development/getting-started.md`** · mocks/BFF: **`frontend/docs/development/api-mocks-and-bff.md`**.

## Rules

- Do not hardcode environment configuration.
- Keep HTTP services in `src/services/`.
- Update types and tests when API contracts change.
- Document routes, critical flows and frontend deployment.

## UC1 API modes (hackathon)

- **Dev default:** MSW (`VITE_USE_MSW=true` in `.env.development`) — axios → MSW → `plantDemoServer`.
- **Live BFF:** `VITE_USE_MSW=false` + `VITE_API_BASE_APP` (Mauricio core-api; Camilo/David behind BFF).
- **Static deploy:** in-process `plantDemoServer` when no base URL and MSW off.
- Runbook: `frontend/docs/development/api-mocks-and-bff.md` · Feature package: `cursor/analysis/features/frontend/uc1-msw-bff-dev-modes/`.
