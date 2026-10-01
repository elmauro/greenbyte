# UC1 — BFF routes vs Camilo (Data) and David (Agent)

The browser uses **`/demo/plant/*` only**. Those BFF routes **simulate** Camilo and David contracts today and **proxy** to the same paths when `DATA_API_BASE_URL` / `AGENT_API_BASE_URL` are set on `core-api`.

Implementation: `backend/core-api/services/plantDemo/dataApiClient.js`, `agentApiClient.js`, `ingestToDataReplan.js`, `uc1ServiceRoutes.js`.

---

## Route map

| User / operator action | BFF (Mauricio · browser contract) | Camilo · Data API (stub → live) | David · Agent API (stub → live) |
| --- | --- | --- | --- |
| Open plant demo, poll queue | `GET /demo/plant/lines/{lineId}/queue` | **`GET /lines/{lineId}/queue`** — snapshot from PG (stub: Dynamo state) | — |
| SAP priority lands | `POST /demo/plant/ingest/sap-priority-change` | **`POST /schedule/replan`** with `trigger: priority_change`, `ingest: { source, po, priority, … }` | **`POST /explain-replan`** with `diff`, `queueSnapshot`, `eventType` |
| SAP COISPI refresh / new PO | `POST /demo/plant/ingest/sap-queue-refresh` | **`POST /schedule/refresh-from-sap`** (same replan response shape) | **`POST /explain-replan`** |
| Pass/fail Fail lands | `POST /demo/plant/ingest/pass-fail-log` | **`POST /schedule/replan`** with `trigger: pass_fail_log`, `ingest: { po, passFail, … }` | **`POST /explain-replan`** |
| Copilot “what changed” | Ingest response `explanation` (scripted preview) | Structured `diff` and `entry_reason` | **`POST /explain-replan`** (simulated until Agent URL is set) |
| Sales “explain my batch” | `POST /demo/plant/batches/explain` | Tools: **`GET /batches/{po}`** (target; stub reads demo state) | **`POST /batches/explain`** |
| Planner accept | `POST /demo/plant/schedule/accept` | `gold.accept_plan` — `gold.plan_decision` + `schedule_plan` → `ACCEPTED` (no SAP write) | — |

JSON shapes: [uc1-demo-response-examples.json](../../backend/docs/api/uc1-demo-response-examples.json) (BFF) and `internalServices` (Data + Agent fragments).

---

## Data API · `POST /schedule/replan` (request)

Built from BFF ingest by `ingestToDataReplan.js`:

```json
{
  "type": "rush",
  "lineId": "line-1",
  "locale": "en",
  "focusPo": "1002307551",
  "trigger": "priority_change",
  "ingest": {
    "source": "sap_priority_change",
    "po": "1002307551",
    "priority": 2,
    "scheduledFinish": "2026-07-06 09:00"
  }
}
```

QA fail uses `"type": "qa_fail"`, `"trigger": "pass_fail_log"`, and `ingest.source: pass_fail_log`.

**Response (fragment):** `{ "queue": [...], "planVersion": 2, "diff": { "moves": [...], "reasons": [...] } }`

---

## Agent API · `POST /explain-replan` (request)

Sent after every successful replan in `runEvent.js`:

```json
{
  "locale": "en",
  "lineId": "line-1",
  "eventType": "rush",
  "planVersion": 2,
  "diff": { "moves": [...], "reasons": [...] },
  "queueSnapshot": [...]
}
```

**Response:** `PlantExplanation` — `{ alertBanner, summary, bullets, impact? }` (merged into BFF `PlantEventResponse` and GET `pendingExplanation`).

---

## Wiring live services

1. Deploy Camilo Data API and David Agent API with the paths above (or API Gateway stage prefixes — set base URL accordingly).
2. On `core-api` deploy, set environment variables (also in CI / SSM when ready):

   ```bash
   DATA_API_BASE_URL=https://…/data-api-stage
   AGENT_API_BASE_URL=https://…/agent-api-stage
   ```

3. No frontend change: still `VITE_API_BASE_APP` → BFF only.

**Stub mode (default):** empty URLs → `applyEvent` + template explanations inside Lambda (same rules as MSW `plantDemoServer`).

---

## MSW / frontend parity

| Layer | Simulates |
| --- | --- |
| MSW `plantDemoHandlers.ts` | BFF `/demo/plant/*` |
| BFF `dataApiClient` / `agentApiClient` | Camilo / David |
| `plantDemoServer.ts` (in-process) | Full stack in one module for static demo |

When Camilo ships `GET /lines/line-1/queue`, point `DATA_API_BASE_URL` at it; BFF can later refresh queue from Data on GET while keeping accept/reset in Dynamo.

---

## Related

- [UC1-SYNGENTA-DEMO-CONTEXT.md](../../backend/docs/api/UC1-SYNGENTA-DEMO-CONTEXT.md) §7
- [uc1-ui-backend-flow.md](./uc1-ui-backend-flow.md)
- [frontend/docs/development/uc1-bff-agent-ready-ui.md](../../frontend/docs/development/uc1-bff-agent-ready-ui.md)
