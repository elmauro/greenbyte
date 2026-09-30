# UC1 (Pasco Line 1) — Backend developer context

**Status:** Team-selected Syngenta hackathon use case · **Demo target B+**  
**Audience:** Mauricio (BFF / `core-api`), Camilo (Data API), David (Agent API)  
**Frontend contract (source of truth until OpenAPI is published):** `frontend/src/demo/plant/plantDemoTypes.ts`  
**Reference implementation (mock):** `frontend/src/demo/plant/plantDemoServer.ts` · MSW: `frontend/src/mocks/handlers/plantDemoHandlers.ts`  
**Request/response JSON (all BFF routes):** [uc1-demo-response-examples.json](./uc1-demo-response-examples.json)

**Live UI (what judges see):**

| URL | Purpose |
| --- | --- |
| `/demo/plant` | Interactive demo — inject rush / QA, accept, sales explain |
| `/demo/plant/tour` | 5-step story with **same React components** (read-only) |
| `/demo/plant/flow?step=01`…`07` | UI ↔ BFF map + JSON + **backend owner** per step |

Production demo: `https://greenbyte-ag.com/demo/plant` (after deploy + `VITE_API_BASE_APP`).

---

## 1. Three Syngenta demo triggers (must implement)

These are the **only** business events the hackathon demo script requires beyond loading the queue.

| # | Trigger (ES/EN UI) | User action | BFF route | Changes queue? |
| --- | --- | --- | --- | --- |
| **A** | **Rush batch** / Lote rush | **Simulate rush batch** | `POST /demo/plant/events` | **Yes** — replan |
| **B** | **QA failure** / Fallo QA | **Simulate QA failure** | `POST /demo/plant/events` | **Yes** — HOLD + resequence |
| **C** | **Explain my batch** (sales nice-to-have) | PO + question / quick prompts | `POST /demo/plant/batches/explain` | **No** — read-only Q&A |

Supporting (not Syngenta “inject” but required for demo):

| Action | BFF route | Owner |
| --- | --- | --- |
| Load calm queue | `GET /demo/plant/lines/line-1/queue` | Camilo data · Mauricio proxy |
| Human sign-off | `POST /demo/plant/schedule/accept` | Mauricio audit |
| Repeat demo | `POST /demo/plant/reset` | Mauricio / demo helper |

---

## 2. Trigger A — Rush batch

### UX (already built)

- Button: **Simulate rush batch** on `/demo/plant`
- After response: `PlantScheduleWorkspace` (Gantt + copilot + alert)
- Flow map: `/demo/plant/flow?step=03`

### BFF

```http
POST /demo/plant/events
Content-Type: application/json

{
  "type": "rush",
  "lineId": "line-1",
  "locale": "en" | "es"
}
```

### BFF orchestration (target)

1. **Camilo — Data API** `POST /schedule/replan` with `{ type: "rush", lineId }`
2. **David — Agent API** `POST /explain-replan` with `{ diff, queue, locale }` — **no invented POs/dates**
3. Return single **`PlantEventResponse`** to browser (shape below)

### Demo behavior (mock today — Camilo should match)

| Field | Demo rule |
| --- | --- |
| Rush PO | **`1002307551`** (SWCO, priority 2, finish `2026-07-06 09:00`) |
| Replan | Move rush PO from position **3 → 1** |
| `diff.moves[]` | `{ po: "1002307551", fromPosition: 3, toPosition: 1 }` |
| `diff.reasons[]` | `priority_2`, `sap_finish_2026-07-06`, `same_species_changeover` |
| `explanation` | Localized banner + bullets + impact (Agent replaces text when live) |

### Response type

`PlantEventResponse` — see `plantDemoTypes.ts` (`eventType`, `queue`, `planVersion`, `diff`, `explanation`).

**Example (200, rush, `locale: en`):** full request/response in [uc1-demo-response-examples.json](./uc1-demo-response-examples.json) → `POST /demo/plant/events.response200Rush`. The UI also shows this JSON on `/demo/plant/flow?step=03`.

---

## 3. Trigger B — QA failure

### UX

- Button: **Simulate QA failure**
- UI: **`HOLD`** on failed batch; line re-sequences without that slot
- Flow map: `/demo/plant/flow?step=03b`

### BFF

Same route as rush, different body:

```json
{ "type": "qa_fail", "lineId": "line-1", "locale": "en" | "es" }
```

### Demo behavior (mock — Camilo should match)

| Field | Demo rule |
| --- | --- |
| Failed PO | **`1001858227`** |
| Status | **`HOLD`** (pass/fail log — Pasco seed narrative) |
| Replan | Remove hold batch from active slot; shift downstream |
| `diff.reasons[]` | `qa_fail_pass_fail_log`, `isolate_hold`, `resequence_downstream` |
| `explanation` | QA-specific copy (EN/ES) |

Same **`PlantEventResponse`** shape as rush.

**Example (200, qa_fail):** [uc1-demo-response-examples.json](./uc1-demo-response-examples.json) → `response200QaFail` · UI: `/demo/plant/flow?step=03b`.

---

## 4. Trigger C — Explain my batch (sales)

### UX

- Section **Explain my batch** on `/demo/plant` (below workspace/table)
- PO `<select>`, quick prompts (“When does it ship?”, …), free-text **Ask**
- Flow map: `/demo/plant/flow?step=07`

### BFF

```http
POST /demo/plant/batches/explain

{
  "po": "1001858227",
  "question": "When does it ship?",
  "locale": "en" | "es"
}
```

### BFF orchestration (target)

- **David — Agent API** answers from **facts** (queue position, finish, hold state, batches ahead)
- **Camilo — Data API** tools: current line queue, batch row (read-only) — **no replan**
- Optional: Agent calls Data; BFF forwards request/response unchanged

### Demo behavior (mock)

- Response: `PlantBatchExplainResponse` — `{ po, answer, citations[] }`
- Answers reference **current** queue snapshot (`planVersion`, finish, position)
- Must **not** mutate queue or ERP

**Example (200):** [uc1-demo-response-examples.json](./uc1-demo-response-examples.json) → `POST /demo/plant/batches/explain` (includes HOLD variant after QA). UI: `/demo/plant/flow?step=07`.

---

## 5. Baseline queue (before A or B)

```http
GET /demo/plant/lines/line-1/queue
```

**Response:** `PlantQueueResponse` — `{ lineId, planVersion, queue[] }`

**Camilo:** `GET /lines/line-1/queue` from PostgreSQL (Pasco seed).  
**UI:** `PlantBaselineDashboard` — steps 01–02 on `/demo/plant/flow`.

Demo queue: 6 rows in `plantDemoServer.ts` (`BASE_QUEUE`) — SWCO/CORN POs, two `atRisk`, one `COMPLETE`.

**Example (200):** [uc1-demo-response-examples.json](./uc1-demo-response-examples.json) → `GET .../queue.response200`.

---

## 6. Accept & reset (demo hygiene)

```http
POST /demo/plant/schedule/accept   { "lineId": "line-1" }
POST /demo/plant/reset             { "lineId": "line-1" }
```

- **Accept:** audit only — **no ERP write** (Syngenta brief)
- **Reset:** restore baseline queue for repeat demos (BFF or in-memory; may stay BFF-only)

**Examples:** accept → `POST .../schedule/accept.response200` · reset → `POST .../reset.response200` (same queue as baseline GET). Error bodies (`400`/`404`) are listed per route in the same JSON file.

---

## 7. Service ownership matrix

| Capability | Mauricio · BFF `core-api` | Camilo · Data API | David · Agent API |
| --- | --- | --- | --- |
| Rush / QA inject | `POST /demo/plant/events` orchestrates | `POST /schedule/replan` → `queue`, `diff.moves`, `diff.reasons` | `POST /explain-replan` ← structured diff |
| Explain batch | `POST /demo/plant/batches/explain` proxy | Tools: queue + batch read | NL answer + `citations[]` |
| Queue load | `GET /demo/plant/.../queue` proxy | Pasco ETL → PG | — |
| Accept / reset | Implement demo routes | Optional persist accept | — |

**Browser rule:** React calls **only BFF** (`plantDemoApi.ts`). Never call Data or Agent from the browser.

---

## 8. Implementation checklist (backend)

- [ ] OpenAPI for `/demo/plant/*` under `backend/docs/api/` (align with §2–6)
- [x] Lambda BFF handlers match MSW + `plantDemoHandlers.ts` status codes (stub + Dynamo — `core-api`, GREENBYTE-003)
- [ ] Camilo: replan rules for `rush` and `qa_fail` produce **`moves`** + **`reasons`**
- [ ] David: `explain-replan` input = Data output only; batch explain = tools, no DB direct
- [ ] Env: Data + Agent base URLs (SSM / env vars) for BFF orchestration
- [ ] Deploy: set `VITE_API_BASE_APP` to API Gateway BFF stage

---

## 9. Related repo docs

| Doc | Path |
| --- | --- |
| MVP scope & week plan | `docs/hackathon/uc1-mvp-scope.md` |
| Sequences + narrative | `docs/hackathon/uc1-ui-backend-flow.md` |
| **BFF request/response JSON (all routes)** | [uc1-demo-response-examples.json](./uc1-demo-response-examples.json) |
| Architecture §7 | `docs/hackathon/syngenta-demo-architecture.md` |
| Frontend types | `frontend/src/demo/plant/plantDemoTypes.ts` |

---

## 10. Out of scope (UC1 demo)

- UC4 breeding (`/demo/breeding`) — separate contract
- ERP / SAP writes
- Multi-line plant
- “Adjust manually” Gantt drag (UI button is display-only)
