# UC1 — Judge wording: three gaps to state explicitly

Use this when aligning **spoken narrative** with Syngenta UC1 language at 100%. The **live demo** can stay B+; these lines prevent judges from thinking we claim full Pasco/ERP coverage.

**Related:** [uc1-syngenta-assumptions.md](./uc1-syngenta-assumptions.md) §3.1 · [uc1-demo-breadth-roadmap.md](./uc1-demo-breadth-roadmap.md)

---

## 1. Second rush shape — “surprise batch” / SAP refresh

| | |
| --- | --- |
| **Syngenta says** | Demo can inject a **surprise rush batch**; production: **new batch arrives** when SAP COISPI refresh adds an **active, non-complete** PO to the line schedule. |
| **We show today** | **Re-priority** via `POST …/ingest/sap-priority-change` **or** **new PO on refresh** via `POST …/ingest/sap-queue-refresh` (default PO `1002408120`). |
| **Say to judges** | “Production ties surprise rush to **SAP COISPI refresh**. We demo both **priority change** on an existing PO and **script C** — a refresh ingest that **adds** an active PO and replans to head — same explain + accept path, no ERP write.” |
| **Close the gap (build)** | Camilo `POST /schedule/refresh-from-sap` from real ETL; optional live second beat in demo script. |

---

## 2. Customer orders in ranking

| | |
| --- | --- |
| **Syngenta says** | Inputs include **open customer orders** alongside batch list, capacity, and changeover rules; reasons for position should reflect demand pressure. |
| **We show today** | Demo **proxies**: `customerOrderId` on key POs, `customer_order` in `diff.reasons[]`, copilot bullets cite order id/window — **not** live order-system joins. |
| **Say to judges** | “**Customer orders** are in the brief; we model them as **structured demo fields** on rush POs until ETL joins real open orders. Ranking still uses Pasco heuristics, not full demand planning.” |
| **Close the gap (build)** | Camilo ETL: real order context on `reasons[]`; Agent paraphrase from that JSON only. |

---

## 3. Queue = active COISPI Line 1 (not truncated mock)

| | |
| --- | --- |
| **Syngenta / Pasco says** | Queue = **active, non-complete** conditioning POs for the line (COISPI → Excel **Line 1 Schedule**); not the full 476-row history mix. |
| **We show today** | **`pascoLine1Baseline`** (~36 rows): subset of `main.csv` + `line_1_schedule.csv`, **dates remapped** to July 2026, **not** a strict Incomplete-only slice ([mock-data doc](./uc1-plant-demo-mock-data.md)). |
| **Say to judges** | “What you see is **Pasco-real PO numbers and kg** in a **hackathon snapshot** so the UI is usable offline. **Production queue** comes from Camilo’s **`GET /lines/line-1/queue`** — **active COISPI rows only**, same contract as MSW/BFF. The generator will converge to that slice; we’re transparent that today’s seed is **curated for demo**, not a full Excel export.” |
| **Close the gap (build)** | Regenerator: tail of `line_1_schedule` **Incomplete/NEW/RELEASED** + join SAP; ETL replaces mock; MSW mirrors Data API snapshot. |

---

## One-liner (optional close)

“We hit the brief’s **live rush and QA fail**, **explain**, and **human accept** on **Line 1**; **customer orders**, **SAP refresh rush**, and **full COISPI queue** are the **next data-layer milestones**, not hidden limitations.”

---

## Where this lives in the demo UI

- **Architecture** route (`/demo/architecture`) — point to Data API + ETL.
- **Flow gallery** step 01 — queue source; steps 03 / 03b — ingest triggers.
- **Data-feed note** on plant demo — ingest paths, no ERP write.
