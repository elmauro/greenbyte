# UC1 plant demo — mock queue provenance and scope

**Related:** [uc1-syngenta-assumptions.md](./uc1-syngenta-assumptions.md) (brief ↔ demo) · [observations.md](../../Hackathon%202026%20-%20Use%20Cases/Hackathon%202026-UseCases/UC1%20-%20Plant%20Capacity%20Utilization/data_sources/observations.md) (full CSV inventory)

The Line 1 dashboard uses a **shared baseline queue** while PostgreSQL and live Data API reads roll out:

| Artifact | Role |
| --- | --- |
| `backend/core-api/services/plantDemo/pascoLine1Baseline.js` | BFF in-memory / Dynamo demo state |
| `frontend/src/demo/plant/pascoLine1Baseline.ts` | MSW `plantDemoServer` (same rows) |

Regenerate both from Pasco CSV extracts:

```bash
node cursor/scripts/generate-pasco-plant-demo-queue.mjs
```

---

## Full Pasco extract vs what the mock uses

Syngenta UC1 ships as **`Pasco LSV and SSV Conditioning sheets and data.xlsx`** (16 tabs) plus an embedded **`Worksheet`** workbook (16 tabs) → **32 CSV files** under `Hackathon 2026 - Use Cases/.../data_sources/`. See **§4 File inventory** in `observations.md`.

| Pasco domain | Example CSV | Scale (data rows) | In UC1 **B+** demo mock? |
| --- | --- | ---: | --- |
| All open SAP conditioning POs | `excel_sap_data.csv`, `main.csv` | 202 (all work centers) | **Subset:** only `WorkCenter = LSVLN1` and **NEW** (~15 POs) |
| LSV Line 1 schedule + history | `line_1_schedule.csv` | 476 | **Subset:** deduped POs with Line 1 routing in comments (`INT Ln1`), capped ~32 by kg — includes **historical COMPLETE** rows mixed with **Incomplete** tail, not a clean “active only” slice |
| LSV Line 2 schedule | `line_2_schedule.csv` | 442 | **No** (tier C / multi-line) |
| Gravity / Colorsort | `gravity_schedule.csv`, `colorsort_schedule.csv` | 917 / 406 | **No** |
| SSV Lines 3 / 5 / 6 | `line_*_schedule.csv`, `ssv_line_*.csv` | hundreds each | **No** (Phase 2 in data model) |
| QA test results | `lsv_pass_fail_log.csv` | 3142 | **One** Fail anchor PO for scripted inject (**1001884747**); log not polled |
| Conditioning run logs | `lsv_conditioning_logs.csv` | 1899 | **No** (ETL / explain enrichment later) |
| Customer orders / capacity rules | brief inputs, not one queue CSV | — | **Gap** in ranking (see assumptions doc) |

**Takeaway:** The mock is **Pasco-shaped** (real PO numbers, crops, kg from extracts) but **not** a faithful export of **Line 1 Schedule** or **Excel SAP data**. It exists so MSW/BFF can demo **one line**, **two ingest events**, and a **scrollable/paginated queue** until Camilo’s ETL serves `GET /lines/line-1/queue` from PostgreSQL.

---

## What the generator does today

Script: `cursor/scripts/generate-pasco-plant-demo-queue.mjs`.

| Step | Rule |
| --- | --- |
| Anchors (fixed order) | **1001759341** (synthetic swap partner), **1001884747** (QA — real Fail/Dent in pass/fail log), **1002307551** (rush — real SAP priority 2; **note:** SAP routes this PO to **LSVLN2**, placed on Line 1 for demo narrative) |
| Filler | Merge `main.csv` (LSVLN1 **NEW**) + `line_1_schedule.csv` (Line 1 comment filter), dedupe by PO, keep top **32** by kg |
| Dates | **Remapped** to `2026-07-07+` hackathon window (not raw SAP/schedule dates) |
| COMPLETE | One historical-style row (**1001887703**) for “recent complete” in queue filters |

Typical output: **~35 PLANNED + 1 COMPLETE** (~36 rows).

---

## Target mock/ETL shape (Syngenta-aligned queue)

When Camilo’s pipeline is ready, **queue snapshot** should match Pasco **Schedule Updating** semantics (see [uc1-syngenta-assumptions.md](./uc1-syngenta-assumptions.md) §2.1):

1. **Source:** active, **non-complete** conditioning POs for **one line** (demo: Line 1).
2. **Primary extract:** tail of `line_1_schedule.csv` where `PO Finished?` / status is **Incomplete**, **NEW**, **RELEASED**, **ONLINE** — not hundreds of **COMPLETE** history rows unless product wants history in a separate view.
3. **Enrich:** join `main.csv` / `excel_sap_data.csv` for priority, SAP finish, material; optional `components.csv` for work center.
4. **Do not** silently remap dates unless the demo script defines a fixed “as-of” window documented to judges.

The generator should be updated to that slice in a follow-up story; this doc records the **intended** contract.

---

## Demo events vs CSV (two triggers, one line)

Syngenta UC1 demo script (brief): inject **rush** or **failed QA** → replan → explain → human accept. GreenByte implements **Line 1 only**:

| Event | Upstream signal (production) | Hackathon inject | Pasco anchor |
| --- | --- | --- | --- |
| Rush | SAP priority / finish / new PO on refresh | `POST .../ingest/sap-priority-change` | Re-order **1002307551** (partial vs “surprise new batch”) |
| QA fail | New **Fail** row in pass/fail log | `POST .../ingest/pass-fail-log` | **1001884747** → HOLD |

Other lines, gravity/colorsort, and thousands of other Fail rows remain in CSV for **ETL and future scenarios**, not in the default mock queue.

---

## When real API is wired

Replace `BASE_QUEUE` seeding with Data API **`GET /lines/line-1/queue`**. Keep MSW/BFF mock aligned with the same snapshot rules so offline demo matches deployed behavior. Update this doc when the generator or ETL adopts the **active Line 1** slice above.
