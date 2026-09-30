# UC1 — Syngenta brief vs GreenByte demo assumptions

**Purpose:** Align product, architecture, and demo copy with Syngenta’s official UC1 brief and Pasco extracts.  
**Sources:** `Hackathon 2026 - Use Cases/.../2026_Use_Case_Briefs.pdf` (UC1), `Pasco LSV and SSV Conditioning sheets and data.xlsx` (Schedule Updating, Excel SAP data, LSV Pass_Fail Log).  
**Related:** [uc1-mvp-scope.md](./uc1-mvp-scope.md) · [UC1-SYNGENTA-DEMO-CONTEXT.md](../../backend/docs/api/UC1-SYNGENTA-DEMO-CONTEXT.md)

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

### Rush (business)

Possible production triggers (not all implemented in stub):

1. **New active PO** on SAP/schedule refresh with high urgency (surprise rush batch).
2. **Priority or finish date change** on an PO already in the ranked list (demo: move `1002307551` up).
3. Replan respects **line capacity**, **changeover by species/size**, reasons per position.

Demo **does not** auto-detect rush from queue fields; inject simulates “rush lands.”

### QA fail (business)

Production-oriented trigger:

1. New or updated row in **pass/fail log** with **`Fail`** for a PO on an active line schedule.
2. **Failed for** codes the explanation (Dent, Discolored, etc.).
3. Replan: **isolate / HOLD** failed batch, **resequence** downstream (demo: move to tail, `HOLD`).

Demo **does not** poll the log; inject simulates “test result lands.”

---

## 5. Architecture direction (post-hackathon)

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

## 6. Changelog (assumption fixes in repo)

- Documented this gap analysis (this file).
- QA demo PO aligned to **1001884747** (Pasco **Fail / Dent**, Line 1) with UI copy stating inject simulates log/SAP-style events.
- Rush copy clarifies: **re-priority of existing PO** in stub; brief also allows **new batch arrival** on refresh.

---

## 7. Open items (backlog)

- [ ] Data API: detect `Fail` rows and emit replan input (Camilo).
- [ ] Optional second rush scenario: **new PO** enters head of queue from mock SAP refresh.
- [ ] Mock **open customer orders** fed into ranking reasons.
- [ ] OpenAPI + event payload `source` field for traceability.
