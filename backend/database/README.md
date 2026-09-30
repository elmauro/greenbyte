# Database

Database migrations, models and local setup.

## Suggested structure

```text
database/
├─ migrations/
├─ models/
├─ seeders/
└─ config/
```


## UC1 raw layer (`raw` schema)

`etl/load_raw.py` loads every CSV in `Hackathon 2026 - Use Cases/…/UC1 - Plant Capacity Utilization/data_sources/` verbatim into PostgreSQL:

- One table per CSV (`raw.<csv name>`). All data columns are `text`, empty → `NULL`. `_source_row_number` (PK) is the CSV record number, which equals the Excel row.
- `raw.load_batch` (one row per run), `raw.load_file` (provenance, source tab, sha256, row counts, content md5) and `raw.column_map` (column letter → source header → raw column).
- It drops and recreates only its own tables, then verifies every table's row count and content md5 inside the database. Any mismatch rolls the load back.
- Mapping, keys and data-quality rules: `data_sources/observations.md`. Model and integration summary: [`backend/data-model/`](../data-model/README.md).

```bash
pip install openpyxl "psycopg[binary]"
# credentials: ~/.pgpass (chmod 600) or PGPASSWORD; never commit them
export PGHOST=<host> PGPORT=5432 PGDATABASE=greenbyte PGUSER=greenbyte_user
python backend/database/etl/load_raw.py --dry-run   # parse and plan only
python backend/database/etl/load_raw.py             # load + verify
```

The loader refuses to run if a CSV is added to or removed from `data_sources/` without being registered in `FILES` with its provenance (`xlsx_export` or `manual_transcription`).
