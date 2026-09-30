# UC1 — Syngenta brief vs GreenByte demo assumptions

**Purpose:** Align product, architecture, and demo copy with Syngenta’s official UC1 brief and Pasco extracts.  
**Sources:** `Hackathon 2026 - Use Cases/.../2026_Use_Case_Briefs.pdf` (UC1), `Pasco LSV and SSV Conditioning sheets and data.xlsx` (Schedule Updating, Excel SAP data, LSV Pass_Fail Log).  
**Related:** [uc1-mvp-scope.md](./uc1-mvp-scope.md) · [uc1-system-blueprint.md](./uc1-system-blueprint.md) · [UC1-SYNGENTA-DEMO-CONTEXT.md](../../backend/docs/api/UC1-SYNGENTA-DEMO-CONTEXT.md)

---

## 1. What Syngenta defines (UC1)

| Topic | Syngenta language |
| --- | --- |
| **Job to be done** | When a **new batch arrives** or a **test result lands**, the scheduler wants an **updated run order** with a **stated reason** for each position. |
| **Demo-ready** | Team can **inject** a **surprise rush batch** or a **failed quality test** live; plan **re-sequences** and **explains** in plain language. |
| **Inputs** | Batch list, **plant capacity**, **open customer orders**, changeover rules; extracts: schedules, conditioning logs, **pass/fail results**, ERP/SAP orders. |
| **Triggers (production intent)** | **Rush lands** or **failed test lands** → automatic re-plan loop (human validates before final). |
| **Out of scope** | Live ERP, optimal solver comparison, predicting harvest arrival. |

The hackathon **ingest APIs** (operator / Data API) simulate upstream data landing for judges; they are not the long-term production trigger model. The scheduler UI has **no** rush/QA buttons.

---

## 2. What Pasco Excel implies

| Mechanism | Pasco pattern |
| --- | --- |
| **Queue refresh** | SAP COISPI variant → **active, non-complete** conditioning process orders → pasted into line schedules (`Schedule Updating` sheet). New POs appear on **SAP refresh**, not from an empty queue. |
| **QA signal** | `LSV Pass_Fail Log`: `Pass/Fail = Fail`, `Failed for` (e.g. Dent, Discolored, Smut), tied to **PO Number** and **Equipment ID** (e.g. Line 1). |
| **Rush / priority** | SAP fields such as **Priority**, **Scheduled Finish Date**, notes; heuristics on **same species** / changeover (team rules, not in one Excel column named “rush”). |

### 2.1 Schedule Updating — how the queue enters real life

On the **Schedule Updating** sheet, Pasco documents an operational loop (not a separate “magic event” beside the list):

1. **Source:** SAP **COISPI** — active conditioning **process orders** that are **not complete**.
2. **Exclusion:** **Completed** or **blocked** orders do **not** appear in that variant.
3. **Flow:** SAP report → **paste into Excel** → line tabs such as **Line 1 Schedule** (and related schedule views).

**Product reading:** “**New in queue**” means a **new active PO on SAP** or a **refresh of the extract** — not an empty queue gaining a row with no upstream data change.

### 2.2 LSV Pass_Fail Log — QA signal shape

| Column (Excel) | Role |
| --- | --- |
| **Pass/Fail** | **`Fail`** is the replan trigger for QA hold / isolate. |
| **PO Number** | Must tie to a PO on the **active line schedule**. |
| **Equipment ID** | Line scope (demo: **Line 1**). |
| **Failed for** | Operational reason: Dent, Discolored, Smut, Cob, Broken, etc. |
| **Raw / Ready Germ, vigor** (optional) | Enrichment for explanations; not required to detect fail. |

**Line 1 examples in Pasco (Fail):** **`1001884747`** (Dent), **`1001883359`** (Discolored), among others.

### 2.3 Demo PO caution — do not use Pass rows as QA fail

In the historical extract, PO **`1001858227`** appears as **`Pass`** in `LSV Pass_Fail Log`. Using it as the **QA fail** batch in the demo is **invented narrative**, not a Syngenta fail row. The repo demo anchors QA inject to **`1001884747`** (Fail / Dent, Line 1). If a deployed BFF still mutates **`1001858227`**, treat that as **stale code** — redeploy `core-api` to match [UC1-SYNGENTA-DEMO-CONTEXT.md](../../backend/docs/api/UC1-SYNGENTA-DEMO-CONTEXT.md).

---

## 3. GreenByte demo (current contract)

| Aspect | Demo behavior | Syngenta-aligned? |
| --- | --- | --- |
| **Trigger** | **Ingest:** `POST /demo/plant/ingest/sap-priority-change` · `POST /demo/plant/ingest/pass-fail-log` (operator / Data API); UI polls queue — **no** rush/QA buttons on `/demo/plant` | Aligns with **data lands → replan**; legacy `POST /events` for tests only. |
| **Rush** | Reorder existing PO **`1002307551`** (priority 2, finish 2026-07-06 story) | **Partial:** matches re-prioritization; brief also allows **surprise rush batch** (new PO on refresh). |
| **QA fail** | PO **`1001884747`** → `HOLD`, resequence (anchored to **Fail / Dent** on Line 1 in Pasco pass/fail log) | **Better anchor** than a PO that only **Pass**es in the extract; still **button-triggered** in demo. |
| **Queue** | **~36 rows** from Pasco CSV subset (`pascoLine1Baseline`; see [uc1-plant-demo-mock-data.md](./uc1-plant-demo-mock-data.md)) — not full Line 1 Schedule | **Partial:** real POs/kg; **not** COISPI-active-only slice until Data API |
| **Customer orders** | Not yet a first-class ranking input | **Gap** vs brief success criteria. |
| **Multi-line plant** | UI + mock = **Line 1 only** (`line-1`) | **Aligned** with B+ persona (one scheduler); **data** in xlsx includes L2/SSV/Gravity — **tier C** for UI |

---

## 3.1 Scope alignment verdict (Syngenta UC1 brief ↔ GreenByte B+)

Use this table for demo-day and judge conversations. **Tier B+** is defined in [uc1-mvp-scope.md](./uc1-mvp-scope.md).

| Syngenta / brief expectation | GreenByte B+ delivery | Verdict |
| --- | --- | --- |
| Ranked queue with **reason per position** | Queue + `reasonShort`, replan diff, copilot copy | **Met** (mock/BFF; ETL replaces mock) |
| **Inject rush** live; plan re-sequences | Operator ingest → poll → Scheduling + explain | **Met** (mechanism) |
| Rush = surprise batch **or** urgency | **Re-priority** (`sap-priority-change`) **or** new PO (`sap-queue-refresh`, default `1002408120`) | **Met** (demo mechanisms); production = real COISPI refresh (Camilo) |
| **Inject failed QA** live | Ingest pass/fail → HOLD + resequence | **Met** (mechanism) |
| QA grounded in **pass/fail log** | Anchor **1001884747** (Fail / Dent, Line 1) | **Met** (narrative); log not auto-polled |
| Plain-language **explanation** + human **accept** | `explanation` + Accept schedule | **Met** (template; Agent replaces) |
| **No live ERP** write | Accept = demo audit only | **Met** |
| Transparent rules, not opaque solver | `diff.moves` + `diff.reasons` | **Met** |
| Inputs: batch list, **capacity**, **customer orders**, changeover | Batch list partial-real; **customer_order** demo proxies on key POs; capacity = heuristic KPI | **Partial** (orders not from live systems) |
| **New batch arrives** (queue refresh) | Static baseline until SAP/ETL refresh story | **Partial** — documented in §5 |
| Full Pasco multi-tab / multi-line data in UI | Single line demo; other tabs in ETL scope | **Deferred** (tier C / Camilo Phase 2) |

**Bottom line:** GreenByte B+ **matches what Syngenta asks to prove in the room** (rush + QA inject, replan, explain, accept, no ERP). It **does not** yet deliver the **full** Pasco data surface (all lines, all active POs, customer-order-driven ranking, or both rush shapes). That split is **intentional** for hackathon week; gaps are backlog, not silent scope creep.

**Expanding without changing the brief minimum:** see [uc1-demo-breadth-roadmap.md](./uc1-demo-breadth-roadmap.md) — **Priority 1** = parameterize replans (multiple POs / fail types on L1); **Priority 2** = multi-line UI (tier C).

**Judge script (say explicitly):** [uc1-judge-wording-gaps.md](./uc1-judge-wording-gaps.md) — second rush via SAP refresh, customer orders in ranking, queue = active COISPI L1 not full mock.

---

## 4. Event semantics (deduced criteria)

Deduced from Syngenta UC1 brief + Pasco extracts. Production should **derive** events from data; the hackathon **inject buttons** only simulate the landing of those signals.

### Rush (Syngenta domain)

Rush is **not** a single Excel column; it is a **business scenario** the brief names alongside a “normal” batch list:

| Signal (typical) | Meaning |
| --- | --- |
| **Surprise rush batch** | **New PO** on SAP refresh / new row in the **active** queue with high urgency. |
| **Priority** (SAP / Excel SAP data) | Elevated priority vs peers on the same line. |
| **Scheduled finish / customer window** | Tight due date driving slot pressure. |
| **Open customer orders** (brief input) | Links demand to sequencing; **gap** in current demo ranking. |
| **Re-prioritize existing PO** | Priority or date **change** on a batch already in queue (demo stub: move **`1002307551`** up). |

**Implicit constraints (Pasco + brief):** finite line capacity; **changeover** by species / variety / size (heuristic rules, not a black box); only **active, non-complete** POs (COISPI-style); output is **new order + reason per position**, **not** an ERP write.

Demo **does not** auto-detect rush from queue fields; inject simulates “rush lands.” Stub implements **re-priority of an existing PO** only (fixed PO).

### QA fail (Syngenta + Pasco)

**Canonical trigger:** a **new or updated** row in **`LSV Pass_Fail Log`** with:

| Field | Criterion |
| --- | --- |
| **Pass/Fail** | **`Fail`** |
| **PO Number** | PO on the **active** line schedule |
| **Equipment ID** | e.g. **Line 1** (demo scope) |
| **Failed for** | Dent, Discolored, Smut, Cob, Broken, … |

**Expected plant effect:** **isolate** the batch (**HOLD** / remove from active slot), **resequence** the rest respecting changeover — same shape as demo `qa_fail`, but production trigger is the **log row**, not a hand-picked PO that **Pass**es in the extract.

Demo **does not** poll the log; inject simulates “test result lands.”

---

## 5. Can the event be “new”?

Direct answer for product and demo scripting:

| Event | Can it be “new”? | Syngenta-aligned reading |
| --- | --- | --- |
| **Rush** | **Yes** | Brief: **new batch arrives** and **surprise rush batch** — can be **new PO on SAP refresh** **or** urgency on a batch **already** in queue. GreenByte stub implements only the **second** case (fixed re-priority of **`1002307551`**). |
| **QA fail** | **Not “new in queue”** | Fail is a **test result** on a batch **already in process / on schedule** — trigger = **fail row in pass/fail log**, not registration of a new PO in the queue list. |

---

## 6. Architecture direction (post-hackathon)

```text
SAP COISPI / schedule refresh ──► Data API ──► queue snapshot
LSV Pass_Fail Log (Fail rows)   ──► Data API ──► replan event
                                        │
                                        ▼
                                 BFF POST /events (or internal)
                                        │
                                        ▼
                              Agent explain-replan (diff only)
```

Browser continues to call **BFF only**; events should eventually carry `source` (e.g. `pass_fail_log`, `sap_refresh`) and stable PO IDs from extracts.

---

## 7. Changelog (assumption fixes in repo)

- **§3.1** scope alignment verdict; queue row updated for Pasco baseline mock; multi-line deferred vs xlsx.
- [uc1-plant-demo-mock-data.md](./uc1-plant-demo-mock-data.md): full Pasco vs mock subset + target ETL slice.
- Documented this gap analysis (this file).
- QA demo PO aligned to **1001884747** (Pasco **Fail / Dent**, Line 1) with UI copy stating inject simulates log/SAP-style events.
- Rush copy clarifies: **re-priority of existing PO** in stub; brief also allows **new batch arrival** on refresh.
- Expanded Pasco **Schedule Updating** flow, pass/fail column map, **`1001858227` Pass vs demo fail** warning, and **§5 “Can the event be new?”**

---

## 8. Open items (backlog)

- [ ] **Demo breadth P1:** ingest + replan logic accept **any queue PO**; document scenarios B ([uc1-demo-breadth-roadmap.md](./uc1-demo-breadth-roadmap.md)).
- [ ] Data API: detect `Fail` rows and emit replan input (Camilo).
- [ ] Optional second rush scenario: **new PO** enters head of queue from mock SAP refresh.
- [ ] Mock **open customer orders** fed into ranking reasons.
- [ ] **Demo breadth P2:** multi-line queue (tier C) or architecture-only narrative.
- [ ] OpenAPI + event payload `source` field for traceability.
