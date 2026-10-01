# Implementation notes — GREENBYTE-005

## Delivered

- **Migrations:** `001_schemas` (drop/recreate silver + gold), `002_raw_ingest_event` (persistent), `003_silver_reference`, `004_silver_facts`, `005_gold_runtime`.
- **Silver transforms:** `00_rules` (R-PO, R-NUM, R-STATUS, R-PRIORITY, R-TRAIT, R-SIZE, R-FAIL, R-CROPYEAR, material parser), `05_staging`, `10_reference`, `20_process_order`, `30_facts`, `40_ingest` (`silver.apply_ingest_event`).
- **Gold:** `10_views`, `20_replan` (heuristic v1), `30_api` (queue/event responses, ingest, accept, reset, replay, agent context, batch detail), `40_baseline`.
- **Seeds:** gold config, reason codes, derived changeover rules, 16 synthetic customer orders.
- **Runner:** `etl/build_model.py` (`--dry-run`, `--checks-only`, `--scenario`, `--reset-demo`).
- **Tests:** `tests/reconciliation.sql` (61 checks), `tests/demo_scenario.sql` (storyline, rolled back).

## Ops runbook

```bash
pip install openpyxl "psycopg[binary]"
export PGHOST=<host> PGPORT=5432 PGDATABASE=greenbyte PGUSER=greenbyte_user   # password via ~/.pgpass
python backend/database/etl/build_model.py
python backend/database/etl/build_model.py --scenario
```

## Follow-up

- Data API HTTP endpoints over the gold functions; BFF switch from the DynamoDB stub (and to the new demo anchors).
- SME answers: trait-family changeover, throughput basis, QA fail scope (per PO vs output batch), status authority.
- Remove the untracked Finder duplicates (`* 2.*`) — they block `load_raw.py`'s file guard.
- Pseudonymize operator names (DQ-19) before any shared use.
