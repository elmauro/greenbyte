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

The hackathon **inject buttons** simulate business events for judges; they are not the long-term production trigger model.

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
| **Trigger** | `POST /demo/plant/events` (`rush` \| `qa_fail`) or UI buttons | OK for **demo-ready inject**; production should map to SAP refresh / pass-fail row. |
| **Rush** | Reorder existing PO **`1002307551`** (priority 2, finish 2026-07-06 story) | **Partial:** matches re-prioritization; brief also allows **surprise rush batch** (new PO on refresh). |
| **QA fail** | PO **`1001884747`** → `HOLD`, resequence (anchored to **Fail / Dent** on Line 1 in Pasco pass/fail log) | **Better anchor** than a PO that only **Pass**es in the extract; still **button-triggered** in demo. |
| **Queue** | Six **synthetic** rows (Pasco-style PO numbers, simplified dates) | OK for hackathon; Camilo target = ETL from Excel/PG. |
| **Customer orders** | Not yet a first-class ranking input | **Gap** vs brief success criteria. |

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

- Documented this gap analysis (this file).
- QA demo PO aligned to **1001884747** (Pasco **Fail / Dent**, Line 1) with UI copy stating inject simulates log/SAP-style events.
- Rush copy clarifies: **re-priority of existing PO** in stub; brief also allows **new batch arrival** on refresh.
- Expanded Pasco **Schedule Updating** flow, pass/fail column map, **`1001858227` Pass vs demo fail** warning, and **§5 “Can the event be new?”**

---

## 8. Open items (backlog)

- [ ] Data API: detect `Fail` rows and emit replan input (Camilo).
- [ ] Optional second rush scenario: **new PO** enters head of queue from mock SAP refresh.
- [ ] Mock **open customer orders** fed into ranking reasons.
- [ ] OpenAPI + event payload `source` field for traceability.
