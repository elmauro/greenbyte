# Implementation Notes — Data tweak (GREENBYTE-017)

## Changes

- `etl/transforms/silver/00_rules.sql`: new `silver.demo_as_of()` (2026-10-02), `silver.demo_date_shift_days()` (7) and `silver.to_commit_date(text)` = `silver.to_date(v) + shift`. `silver.extract_as_of()` is unchanged (2026-09-28).
- `etl/transforms/silver/30_facts.sql`: `scheduled_finish_date` and `original_finish_date` use `to_commit_date`.
- `etl/transforms/silver/20_process_order.sql`: `sap_finish_date` uses `to_commit_date`. DQ-15 still compares the **source** date with `extract_as_of()`.
- `seeds/gold_config.sql`: `as_of_date` / `plan_start_at` come from `silver.demo_as_of()`.
- `seeds/silver_customer_order.sql`: unchanged. `need_by_date` follows the shifted finish date.

To change the shift or the clock, edit those two functions and rebuild. Setting the shift to 0 and the clock to `extract_as_of()` restores the original behaviour.

## Not changed (by decision)

- raw, the source CSVs, `run_date`, `test_date`, audit timestamps, the ingest path (`40_ingest.sql`), the SAP batch (`sapBatch.js`), and the scenario test dates (2026-10-03 rush / downtime: still valid after the new clock, and no assertion depends on them).

## Apply (pending sign-off)

```bash
python3 backend/database/etl/build_model.py              # full rebuild of silver + gold (drops gold history)
python3 backend/database/etl/build_model.py --validate
python3 backend/database/etl/build_model.py --scenario
python3 backend/database/etl/build_model.py --reset-demo line-1
python3 backend/database/etl/build_model.py --reset-demo line-2
```
