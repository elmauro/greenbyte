# UC1 plant demo — mock queue provenance

The Line 1 dashboard uses a **shared baseline queue** while PostgreSQL and live BFF reads roll out:

| Artifact | Role |
| --- | --- |
| `backend/core-api/services/plantDemo/pascoLine1Baseline.js` | BFF in-memory / Dynamo demo state |
| `frontend/src/demo/plant/pascoLine1Baseline.ts` | MSW `plantDemoServer` (same rows) |

Regenerate both from Syngenta Pasco extracts:

```bash
node cursor/scripts/generate-pasco-plant-demo-queue.mjs
```

## Source files (read-only in repo)

Under `Hackathon 2026 - Use Cases/.../UC1 - Plant Capacity Utilization/data_sources/`:

| File | Use |
| --- | --- |
| `lsv_line_1.csv` | **NEW** production orders on **LSV Line 1** (`LSVLN1`) — PO, crop, kg, SAP finish |
| `sap_order_headers.csv` / `excel_sap_data.csv` | Priority and material context for rush anchor **1002307551** |
| `lsv_pass_fail_log.csv` | QA fail narrative for **1001884747** (Fail on LF, 9800 kg) |
| `line_1_schedule.csv` | Historical completes; **1001887703** models a recent **COMPLETE** row |

## Demo anchors (not reordered by generator)

These three rows stay at the top so scripted events still work:

1. **1001759341** — partner PO for rush swap (synthetic finish in hackathon window).
2. **1001884747** — `qa_fail` event → **HOLD**, moved to tail.
3. **1002307551** — `rush` event → moved to position 1; real SAP priority **2**, qty **6400 kg**.

Other **PLANNED** rows merge **`main.csv`** (LSVLN1 **NEW**) with **`line_1_schedule.csv`** batches whose comments reference **Line 1** (`INT Ln1`), deduped by PO, top ~32 by kg. Finish dates map to **2026-07-07+** for the hackathon window (~**35** planned rows for pagination demos).

## When real API is wired

Replace `BASE_QUEUE` seeding with Data API queue reads; keep the generator (or ETL) aligned so MSW and offline demos stay consistent with Pasco-shaped data.
