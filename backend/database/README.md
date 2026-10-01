# Database

UC1 PostgreSQL model: a **medallion** `raw` → `silver` → `gold`. The model, ER diagram and Data API mapping are in [`backend/data-model/uc1-data-model.md`](../data-model/uc1-data-model.md).

```text
database/
├─ migrations/        DDL: schemas, raw.ingest_event, silver tables, gold tables
├─ etl/
│  ├─ load_raw.py     CSV -> raw (verbatim, verified)
│  ├─ build_model.py  raw -> silver -> gold in one transaction + reconciliation
│  └─ transforms/
│     ├─ silver/      R-* rules (SQL functions), staging, reference, PO, facts, ingest apply
│     └─ gold/        views, heuristic replan, API functions, baseline
├─ seeds/             gold config + reason codes + derived changeover rules, synthetic customer orders
└─ tests/             reconciliation.sql (61 checks), demo_scenario.sql (storyline, rolled back)
```

## Connection

Both scripts use the standard libpq variables. Keep credentials in `~/.pgpass` (chmod 600) or in `PGPASSWORD` in your environment, and never commit them.

```bash
pip install openpyxl "psycopg[binary]"
export PGHOST=<host> PGPORT=5432 PGDATABASE=greenbyte PGUSER=greenbyte_user
```

## 1. Raw layer (`raw` schema)

`etl/load_raw.py` loads every CSV in `Hackathon 2026 - Use Cases/…/UC1 - Plant Capacity Utilization/data_sources/` verbatim into PostgreSQL:

- One table per CSV (`raw.<csv name>`). All data columns are `text`, empty → `NULL`. `_source_row_number` (PK) is the CSV record number, which equals the Excel row.
- `raw.load_batch` (one row per run), `raw.load_file` (provenance, source tab, sha256, row counts, content md5) and `raw.column_map` (column letter → source header → raw column).
- It drops and recreates only its own tables, then verifies every table's row count and content md5 inside the database. Any mismatch rolls the load back.
- It refuses to run if a CSV is added to or removed from `data_sources/` without being registered in `FILES` with its provenance (`xlsx_export` or `manual_transcription`).

```bash
python backend/database/etl/load_raw.py --dry-run   # parse and plan only
python backend/database/etl/load_raw.py             # load + verify
```

## 2. Silver and gold (`build_model.py`)

```bash
python backend/database/etl/build_model.py --dry-run        # list the 19 steps, no database access
python backend/database/etl/build_model.py                  # rebuild silver + gold, reconcile, commit (~6 s)
python backend/database/etl/build_model.py --checks-only    # rerun the 61 reconciliation checks (read-only)
python backend/database/etl/build_model.py --scenario       # storyline test, rolled back
python backend/database/etl/build_model.py --reset-demo line-1
```

- **One transaction.** Migrations, transforms, seeds, the gold functions, the baseline plans and `tests/reconciliation.sql` all run in one transaction. If any check fails, everything rolls back and the previous build stays.
- **Silver and gold are fully derived.** Both schemas are dropped and rebuilt, then the plans are regenerated: baseline v1 for each line with a `demo_line_id`, then every non-voided `raw.ingest_event` is replayed. Accept decisions aren't kept across rebuilds.
- **`raw.ingest_event` is never dropped.** It's the only table the Data API writes outside gold. Rerun `build_model.py` after every `load_raw.py` run.

## 3. Data API usage (gold functions)

```sql
SELECT gold.queue_response('line-1');                                               -- GET queue
SELECT gold.ingest_sap_priority_change('line-1', '1002295402', 2, '2026-10-03');   -- rush lands
SELECT gold.ingest_pass_fail('line-1', '1002307552', 'Fail', 'Dent', 'Line 1');    -- QA fail lands
SELECT gold.accept_plan('line-1', 3);                                               -- scheduler accepts (no SAP write)
SELECT gold.agent_context(<schedule_plan_id>, 'en');                                -- Agent API grounding
SELECT gold.batch_detail('1002307552');                                             -- batch Q&A
SELECT gold.reset_demo('line-1');                                                   -- back to the calm baseline
```

The ingest functions accept an optional idempotency key. They refuse a PO that isn't on the line's open queue, so no PO is ever invented. Mapping, keys and data-quality rules are in `data_sources/observations.md`; the model and integration summary is in [`backend/data-model/`](../data-model/README.md).
