# UC1 demo target (B+) — Syngenta hackathon (GreenByte)

**Status:** Team-selected use case · **Demo day target** (not minimal MVP only)  
**Persona:** Seed conditioning line scheduler (Pasco)  
**Routes:** `/demo/plant` (interactive demo) · `/demo/plant/tour` (5-step story)  
**Architecture:** [syngenta-demo-architecture.md](./syngenta-demo-architecture.md) §7  
**UI ↔ backend (when/what):** [uc1-ui-backend-flow.md](./uc1-ui-backend-flow.md) · **Live map:** `/demo/plant/flow`  
**Backend handoff (Rush · QA · Explain batch):** [../../backend/docs/api/UC1-SYNGENTA-DEMO-CONTEXT.md](../../backend/docs/api/UC1-SYNGENTA-DEMO-CONTEXT.md)  
**Syngenta brief vs demo assumptions:** [uc1-syngenta-assumptions.md](./uc1-syngenta-assumptions.md)  
**Architecture, events, decisions, AI data model:** [uc1-system-blueprint.md](./uc1-system-blueprint.md)

---

## 1. Scope tiers

| Tier | Name | Purpose |
| --- | --- | --- |
| A | Technical MVP | Table + inject — proves Syngenta minimum |
| **B+** | **Demo target (this doc)** | **What we show judges** — matches initial GreenByte offer + brief |
| C | Vision | Multi-line Gantt, sales chat, UC4 |

We build **B+** for hackathon week; A is embedded in B+; C is explicitly deferred.

---

## 2. Gap we closed (offer vs table-only)

| Initial GreenByte offer | Demo target B+ |
| --- | --- |
| Wow mockup (timeline + copilot) | Simplified **timeline strip** + **full-width wow PNG** after event |
| Pasco-style POs / SAP story | SWCO PO set + **reason per row** + position diff |
| BFF + Data + Agent story | **`plantDemoApi`** + **MSW handlers** same paths as `core-api` |
| 5-step narrative | Prominent **tour CTA** + live screen on same UC |
| GenAI explain | **`explanation` object** in API response (Agent replaces template when live) |

---

## 3. Syngenta brief (unchanged minimum)

- Ranked queue with reasons; inject **rush** or **failed QA** live; replan + plain-language explanation; human accepts; no live ERP; recommendation not opaque solver output.

### 3.1 What we commit to vs what we defer

| In scope for **demo day (B+)** | Explicitly **out** or **later** |
| --- | --- |
| **One** conditioning line (Pasco **LSV Line 1**, `line-1`) | Multi-line Gantt (L2, Gravity, SSV) — tier **C** |
| Two live **ingest** triggers (SAP priority / pass-fail **Fail**) + queue poll | Scheduler UI buttons for rush/QA |
| Replan diff + copilot explanation + **Accept** | Write-back to SAP/ERP |
| Mock queue from Pasco CSV subset (~36 rows; [uc1-plant-demo-mock-data.md](./uc1-plant-demo-mock-data.md)) | Full **476**-row Line 1 Schedule or **202**-PO SAP sheet in UI |
| ETL target: Camilo **GET queue** + **POST replan** from PostgreSQL | Auto-ingest from live COISPI |

**Syngenta alignment detail:** [uc1-syngenta-assumptions.md](./uc1-syngenta-assumptions.md) §3.1 (met / partial / deferred per brief item).  
**Widen demo (fixed replans / L1 only):** [uc1-demo-breadth-roadmap.md](./uc1-demo-breadth-roadmap.md) — P1 replans before P2 multi-line.

---

## 4. Layer 1 — Demo day (required)

| # | Deliverable | Owner |
| --- | --- | --- |
| 1 | `/demo/plant` queue + rush/QA + copilot + accept | Mauricio (UI) — **in repo** |
| 2 | BFF contract: `GET queue`, `POST ingest/*`, `POST accept`, `POST reset` | Mauricio — MSW + `plantDemoServer` until Lambda |
| 3 | Pasco ETL → PostgreSQL; `POST replan` + `GET queue` | Camilo |
| 4 | `POST explain-replan` from structured diff (no invented POs) | David |
| 5 | Wire `VITE_API_BASE_APP` to deployed BFF | Mauricio / infra |
| 6 | Demo script: tour (2 min) → operator **ingest** → UI poll → accept | Team |

### 4.1 UI blocks on `/demo/plant` (current — matches site)

1. Header + **Demo target B+** badge  
2. **Data-feed note** (ingest paths; no rush/QA buttons on scheduler UI)  
3. **Calm state:** `PlantBaselineDashboard` (queue table, KPIs, sidebar chrome) — `GET queue` + poll  
4. **After upstream ingest:** notifications → **Scheduling** + **Copilot** (Gantt, what changed, Accept) — driven by `lastEvent` on GET queue  
5. **Explain my batch** (sales) — `POST batches/explain` (no queue change)  
6. Accept schedule + audit message  

**Tour:** `/demo/plant/tour` embeds the same components (read-only). **Flow map:** `/demo/plant/flow` (steps 03 / 03b / 07 = three triggers).  

### 4.2 API shapes (frontend ↔ BFF)

See §6 in previous revision — `PlantEventResponse` includes `diff` + `explanation`.

Implementation reference:

- Types: `frontend/src/demo/plant/plantDemoTypes.ts`
- Local/MSW server: `frontend/src/demo/plant/plantDemoServer.ts`
- Client: `frontend/src/services/plantDemoApi.ts`
- MSW: `frontend/src/mocks/handlers/plantDemoHandlers.ts`

When `VITE_API_BASE_APP` is set, the same paths hit **core-api**; when empty, **plantDemoServer** serves the contract on the client (static S3 demo). When `VITE_USE_MSW=true`, MSW intercepts HTTP in dev.

---

## 5. Layer 2 — Stretch (if time)

- Batch detail drawer: `GET /demo/plant/batches/{po}/summary`
- Side-by-side before/after queue
- ~~Real rows from Pasco Excel seed~~ **Partial:** `pascoLine1Baseline` generator — align to **active Line 1** slice (see mock-data doc)
- “Adjust manually” disabled with tooltip

**Out:** UC4 product, multi-line, ERP write, plant IoT.

### 5.1 Sales “explain my batch” (Syngenta nice-to-have — in demo)

- UI on `/demo/plant`: PO selector + quick prompts + free-text ask.
- BFF: `POST /demo/plant/batches/explain` `{ po, question, locale }` → `{ answer, citations[] }`.
- Grounding: current queue position, finish, hold/QA, batches ahead (Camilo Data API; Agent paraphrase when live).

---

## 6. Week checklist

### Mauricio (UI + BFF)

- [ ] OpenAPI for §4.2 paths under `backend/docs/api/`
- [ ] Lambda handlers orchestrate Camilo replan → David explain
- [ ] Point production demo env at BFF URL
- [ ] Keep MSW handlers in sync with OpenAPI

### Camilo (Data API)

- [ ] Seed Pasco Excel (Line 1 priority)
- [ ] `GET /lines/line-1/queue`, `POST /schedule/replan`
- [ ] Return `moves[]` + `reasons[]` for explain step

### David (Agent API)

- [ ] `POST /explain-replan` — input: diff JSON; output: `summary` + `bullets[]`
- [ ] No direct DB reads; tools via Data API when needed

---

## 7. Client-facing answers (demo script)

| Question | Answer |
| --- | --- |
| What problem? | Manual conditioning queue; late customer orders; no audit trail for plan changes. |
| What do I do? | Review queue → inject rush or QA → read **what changed and why** → accept. |
| What does the app return? | New queue + diff + copilot explanation + acceptance log — **no SAP write**. |
| Why trust it? | Reasons tied to PO, SAP dates, species/changeover, QA flags — GenAI explains structured facts. |

**Honest scope vs Syngenta wording (rush refresh, customer orders, COISPI queue):** scripted lines for judges — [uc1-judge-wording-gaps.md](./uc1-judge-wording-gaps.md).

---

## References

- [syngenta-demo-architecture.md](./syngenta-demo-architecture.md)
- [mockups/uc1-plant-capacity-wow.png](./mockups/uc1-plant-capacity-wow.png)
- Syngenta `2026_Use_Case_Briefs.pdf` (local `Hackathon 2026 - Use Cases/`)
