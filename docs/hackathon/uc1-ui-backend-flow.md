# UC1 — UI/UX to backend connection (Pasco Line 1)

**Route:** `/demo/plant`  
**Contract types (frontend):** `frontend/src/demo/plant/plantDemoTypes.ts`  
**Client:** `frontend/src/services/plantDemoApi.ts`  
**Target BFF:** `core-api` (`/demo/plant/*`)  
**Related:** [uc1-mvp-scope.md](./uc1-mvp-scope.md) · [syngenta-demo-architecture.md](./syngenta-demo-architecture.md) §7 · **Live UI ↔ API:** `/demo/plant/flow` · **Backend dev brief:** [../../backend/docs/api/UC1-SYNGENTA-DEMO-CONTEXT.md](../../backend/docs/api/UC1-SYNGENTA-DEMO-CONTEXT.md)

The **browser calls only the BFF**. The BFF calls **Data API (Camilo)** and **Agent API (David)**. Today, if `VITE_API_BASE_APP` is unset, the same JSON is served by `plantDemoServer` on the client for static demo; production target is live BFF.

---

## 1. Container — who talks to whom

```mermaid
flowchart LR
  subgraph UX["React UX /demo/plant"]
    Q[Queue table]
    E[Inject Rush / QA]
    C[Copilot panel]
    T[Timeline + mockup]
    S[Sales explain batch]
    A[Accept schedule]
  end

  subgraph BFF["BFF core-api"]
    P["/demo/plant/*"]
  end

  subgraph Data["Data API Camilo"]
    D1[queue + replan]
    D2[(PostgreSQL Pasco seed)]
  end

  subgraph Agent["Agent API David"]
    G1[explain-replan]
    G2[batch explain optional]
  end

  UX -->|HTTPS JSON| P
  P -->|HTTP| D1
  D1 --> D2
  P -->|HTTP| G1
  P -->|HTTP| G2
  G2 -.->|tools| D1
```

---

## 2. UX action → API call → what the user sees

| # | User action (UX) | When (moment) | Frontend calls BFF | BFF orchestration (target) | Backend response → UI binding |
| --- | --- | --- | --- | --- | --- |
| 1 | Open `/demo/plant` | Page load | `GET /demo/plant/lines/line-1/queue` | Proxy Data `GET /lines/line-1/queue` | **`queue[]`**, `planVersion` → table rows, status badges, “calm” state |
| 2 | Click **Simulate rush batch** | Live demo inject | `POST /demo/plant/events` `{ type: "rush", lineId, locale }` | Data `POST /schedule/replan` → Agent `POST /explain-replan` with diff | **`PlantEventResponse`**: new `queue[]`, `diff.moves[]` (highlight rows), `explanation.*` → banner + copilot, timeline + wow image |
| 3 | Click **Simulate QA failure** | Live demo inject | Same with `type: "qa_fail"` | Same pipeline; replan rules differ (hold + resequence) | Same shape; HOLD status, copilot QA copy |
| 4 | Click **Accept schedule** | After event | `POST /demo/plant/schedule/accept` `{ lineId }` | Log acceptance (BFF or Data audit table) | **`acceptedAt`**, `planVersion` → disabled accept button + confirmation note |
| 5 | Click **Reset queue** | Repeat demo | `POST /demo/plant/reset` `{ lineId }` | Reset demo state / reload baseline seed | Fresh **`queue[]`**, clear copilot & timeline |
| 6 | Sales: pick PO + **Ask** | Anytime (nice-to-have) | `POST /demo/plant/batches/explain` `{ po, question, locale }` | Agent (+ Data tools for batch/queue context) | **`answer`**, **`citations[]`** → chat panel (no queue change) |

**Tour (`/demo/plant/tour`):** read-only **same React components**; no live HTTP (uses `plantFlowSnapshots`).  
**Backend owners per step:** see `/demo/plant/flow` → **Likely backend owners** (Mauricio · BFF, Camilo · Data API, David · Agent API).

---

## 3. Sequence — page load (queue)

```mermaid
sequenceDiagram
  actor User
  participant UI as React PlantLineMvp
  participant BFF as core-api BFF
  participant Data as Data API

  User->>UI: Opens /demo/plant
  UI->>BFF: GET /demo/plant/lines/line-1/queue
  BFF->>Data: GET /lines/line-1/queue
  Data-->>BFF: queue[], planVersion
  BFF-->>UI: PlantQueueResponse
  UI-->>User: Renders table (position, PO, species, reasonShort, atRisk)
```

---

## 4. Sequence — inject rush or QA (main demo)

```mermaid
sequenceDiagram
  actor User
  participant UI as React PlantLineMvp
  participant BFF as core-api BFF
  participant Data as Data API
  participant Agent as Agent API

  User->>UI: Clicks Rush or QA fail
  UI->>BFF: POST /demo/plant/events { type, lineId, locale }
  BFF->>Data: POST /schedule/replan { type, lineId, ... }
  Data-->>BFF: new queue[], moves[], reasons[]
  BFF->>Agent: POST /explain-replan { diff, queue snapshot, locale }
  Agent-->>BFF: summary, bullets[], impact?
  BFF-->>UI: PlantEventResponse (queue + diff + explanation)
  UI-->>User: Alert banner, updated table, copilot, timeline, wow PNG
```

**Important:** The Agent must not invent POs or dates; it paraphrases **`moves`** and **`reasons`** from Data (and optional tool JSON).

---

## 5. Sequence — accept plan (human in the loop)

```mermaid
sequenceDiagram
  actor User
  participant UI as React PlantLineMvp
  participant BFF as core-api BFF

  User->>UI: Accept schedule (enabled after event)
  UI->>BFF: POST /demo/plant/schedule/accept { lineId }
  Note over BFF: Audit only — no ERP write
  BFF-->>UI: { acceptedAt, lineId, planVersion }
  UI-->>User: "Human acceptance logged"
```

---

## 6. Sequence — explain my batch (sales)

```mermaid
sequenceDiagram
  actor User
  participant UI as PlantBatchExplainChat
  participant BFF as core-api BFF
  participant Agent as Agent API
  participant Data as Data API

  User->>UI: Select PO + question (or quick prompt)
  UI->>BFF: POST /demo/plant/batches/explain { po, question, locale }
  BFF->>Agent: forward (or Agent calls Data tools)
  Agent->>Data: GET batch / queue context (read-only)
  Data-->>Agent: facts JSON
  Agent-->>BFF: answer + citations[]
  BFF-->>UI: PlantBatchExplainResponse
  UI-->>User: Answer text + sources (queue unchanged)
```

---

## 7. Request / response JSON (BFF)

**Canonical file (copy into Postman, contract tests, OpenAPI samples):** [../../backend/docs/api/uc1-demo-response-examples.json](../../backend/docs/api/uc1-demo-response-examples.json)

**Live in app:** `/demo/plant/flow` → pick step → **Response JSON** panel (same shapes).

Types: `frontend/src/demo/plant/plantDemoTypes.ts` · mock: `plantDemoServer.ts` · MSW: `plantDemoHandlers.ts`.

### `GET /demo/plant/lines/line-1/queue` → `PlantQueueResponse`

Six rows (5 active + 1 `COMPLETE`). Baseline `planVersion: 1`. Full array in JSON file → `GET .../queue.response200`.

### `POST /demo/plant/events` → `PlantEventResponse`

**Request (rush):**

```json
{ "type": "rush", "lineId": "line-1", "locale": "en" }
```

**Response (200, rush)** — PO `1002307551` moves 3→1; `previousPosition` on moved row; full `queue[]` + `explanation` in JSON file → `response200Rush`.

**Request (QA):**

```json
{ "type": "qa_fail", "lineId": "line-1", "locale": "en" }
```

**Response (200, qa_fail)** — PO `1001884747` → `status: "HOLD"`, moved to end of list; see `response200QaFail`.

**Errors:** `400` `{ "message": "Invalid event type" }` · `404` `{ "message": "Unknown line" }`.

### `POST /demo/plant/batches/explain` → `PlantBatchExplainResponse`

**Request:**

```json
{
  "po": "1002307551",
  "question": "When does it ship?",
  "locale": "en"
}
```

**Response (200)** — includes `answer`, `citations[]`, optional `suggestedFollowUps[]`. Separate HOLD example after QA in JSON file.

**Errors:** `400` `{ "message": "po and question required" }` · `404` `{ "message": "Unknown batch" }`.

### `POST /demo/plant/schedule/accept` → `PlantAcceptResponse`

**Request:** `{ "lineId": "line-1" }`  
**Response:** `{ "acceptedAt": "<ISO-8601>", "lineId": "line-1", "planVersion": 2 }` (example timestamp in JSON file).

### `POST /demo/plant/reset` → `PlantQueueResponse`

**Request:** `{ "lineId": "line-1" }`  
**Response:** baseline queue, `planVersion: 1` (same as GET after reset).

### Internal (BFF only — not browser)

Data replan fragment and Agent `explain-replan` input/output sketches: `uc1-demo-response-examples.json` → `internalServices`.

---

## 8. Deployment modes

| Mode | `VITE_API_BASE_APP` | Behaviour |
| --- | --- | --- |
| Static demo (current default) | empty | `plantDemoServer` in browser — same JSON shapes |
| Dev with MSW | set + `VITE_USE_MSW=true` | MSW handlers mimic BFF |
| Hackathon target | BFF URL on API Gateway | BFF calls Camilo + David URLs from env/SSM |

---

## 9. Team handoff checklist

| Owner | Must expose |
| --- | --- |
| Mauricio | All `/demo/plant/*` routes above; compose Data + Agent responses |
| Camilo | Queue + replan returning `moves` / `reasons` |
| David | `explain-replan` (+ optional batch explain) grounded in structured input |
