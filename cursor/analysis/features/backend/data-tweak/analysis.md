# Analysis — Data tweak (GREENBYTE-017)

## Request

Move the scheduled finish dates forward in the gold layer (first ask: +2 months), keeping every key relation. Reason: the dates are already in the past, and the demo shows delivery dates live.

## Findings (2026-10-02)

1. **The finish date is not stored in gold.** It lives in `silver.line_schedule_item.scheduled_finish_date`. Gold reads it in `v_open_queue`, `replan` and the API functions. Every full build drops gold (`DROP SCHEMA gold CASCADE`, rule G-01), so an `UPDATE` on gold would be lost. → Apply the shift in the silver transform; leave raw and the CSVs untouched.
2. **Keys are safe.** No date is part of a primary, business or foreign key (`process_order_id`, `work_center_id`, `po_number`, `source_csv` + `source_row_number`).
3. **Other date fields:**

| Field | Decision | Why |
| --- | --- | --- |
| `line_schedule_item.scheduled_finish_date` | shift | the requested change |
| `line_schedule_item.original_finish_date` | shift | keeps "original vs current" consistent |
| `process_order.sap_finish_date` | shift | the semantic planner's lateness basis (`SAP_FINISH`) |
| `customer_order.need_by_date` | follows | the synthetic seed derives it from the shifted finish (−2 to +5 days) |
| `process_order_change.scheduled_finish_date` (ingest), SAP batch | not shifted | dates entered live, against the new clock |
| `conditioning_run.run_date`, `quality_test.test_date` | not shifted | history: throughput medians, run order |
| `*_at` audit timestamps | not shifted | real event times |
| `schedule_entry.due_date`, `planned_*` | regenerated | rebuilt by replan |
| DQ-15 flag | source date | describes the extract (still 103 of 202) |

4. **The clock was the key decision.** `as_of_date` / `plan_start_at` were 2026-09-28. Shifting the dates +2 months with that clock adds about 61 days of slack, which removes every at-risk order, the core of the demo story.

## Options and decision

- A: shift the dates and the clock together. Relations are kept exactly, but "today" becomes 2026-11-28.
- B: clock to demo day, dates +2 months. Nothing is at risk.
- **C (chosen):** clock to demo day (2026-10-02), dates shifted just enough to keep a few orders tight. All lines.

Simulation on the CSVs (153 open schedule rows, finish date vs the 2026-10-02 clock):

| Shift | Overdue | Due 0–3 d | Due 4–7 d | > 7 d | SAP before clock |
| --- | --- | --- | --- | --- | --- |
| +4 d | 17 | 38 | 11 | 87 | 103 |
| **+7 d (chosen)** | **8** | **20** | **33** | **92** | **93** |
| +10 d | 3 | 13 | 22 | 115 | 70 |
| +14 d | 1 | 2 | 13 | 137 | 63 |
| +61 d (≈ 2 months) | 0 | 0 | 0 | 153 | 26 |

The real at-risk count depends on the planned run times (replan), so it must be checked on the database after the build.

## Risks

- A full rebuild drops gold history: legacy tables, accept decisions and stored planner plans. The team must sign off before it runs on the shared dev RDS.
- Ingest events recorded before the shift carry dates from the old clock, and they are replayed on rebuild. → `--reset-demo` the demo lines after the build.
- The MSW mocks and BFF fallbacks still carry dates from the old clock. This is a follow-up for the UI/BFF owner.
