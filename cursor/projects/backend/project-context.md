# Backend Context - GreenByte

## Overview

Backend for `GreenByte`, domain `AgTech — intelligent agriculture and crop data`.

## Stack

- Node.js 20
- AWS Lambda
- API Gateway
- Terraform for infrastructure

## Expected structure

```text
backend/
├─ <selected-api>/
├─ <selected-layer>/
├─ database/
├─ docs/
├─ tests/
├─ backend.config.json
├─ deploy-backend.sh
└─ package.json
```

Generated APIs: `core-api auth-api`

Generated layers: `layer-transversal`

Use `backend/backend.config.json` as the source of truth for selected APIs and layers.

## Hackathon UC1 (Pasco Line 1 — selected use case)

Backend must support **three demo triggers** aligned with the live site:

1. **Rush batch** — `POST /demo/plant/ingest/sap-priority-change` (legacy: `POST /demo/plant/events` `{ type: "rush" }`)
2. **QA failure** — `POST /demo/plant/ingest/pass-fail-log` (legacy: `{ type: "qa_fail" }`)
3. **Explain my batch** — `POST /demo/plant/batches/explain`

Scheduler UI polls `GET .../queue`; it does not call ingest or legacy events.

Full handoff (owners Mauricio/Camilo/David, JSON shapes, demo POs, flow URLs):

- **`backend/docs/api/UC1-SYNGENTA-DEMO-CONTEXT.md`**
- **`docs/hackathon/uc1-ui-backend-flow.md`**
- Frontend contract: **`frontend/src/demo/plant/plantDemoTypes.ts`** + **`plantDemoServer.ts`**

Interactive map for backend owners: **`/demo/plant/flow`** on the deployed frontend.

## Rules

- Separate handlers, services and shared utilities.
- Validate inputs at the HTTP edge.
- Keep errors and responses consistent.
- Document endpoints and contracts in `docs/api/`.
- Do not store secrets in code or versioned files.
