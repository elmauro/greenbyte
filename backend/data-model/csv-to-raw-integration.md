# UC1 integration — Excel → CSV → `raw` (PostgreSQL)

**Owner:** Data API (Camilo) · **Status:** Done, raw layer loaded (2026-09-30) · **Load:** `load_id = 1`, `SUCCESS`
**Database:** `greenbyte` on `greenbyte-dev-postgres` (RDS PostgreSQL 16.13, UTF-8), user `greenbyte_user`, schema `raw`
**Related:** [uc1-data-model.md](./uc1-data-model.md) (target model) · [observations.md](../../Hackathon%202026%20-%20Use%20Cases/Hackathon%202026-UseCases/UC1%20-%20Plant%20Capacity%20Utilization/data_sources/observations.md) (column mapping, keys, DQ catalog) · [`backend/database/etl/load_raw.py`](../database/etl/load_raw.py) (loader)

This file summarizes what was built to move the Pasco conditioning extracts into PostgreSQL, the decisions behind it, and the conventions every later layer must follow.

---

## 1. Summary

| | |
| --- | --- |
| Source workbooks | 2 (`Pasco…xlsx`, `Worksheet in Pasco…xlsx`), 32 tabs |
| CSV files | 40: **32 `xlsx_export`** (one per tab, verified) + **8 `manual_transcription`** (typed from images) |
| Raw tables | 40 data tables + 3 bookkeeping tables in schema `raw` |
| Rows loaded | **12,488** (12,269 exported + 219 transcribed) |
| Columns mapped | 466 (`raw.column_map`) |
| Excel → CSV check | 216,638 cells compared with an independent reader: **0 differences** |
| CSV → raw check | Row count + content MD5 per table, recomputed in the database: **40/40 match** |
| Load time | ≈ 66 s (single transaction, `COPY`) |

```text
 Excel workbooks (2)            data_sources/ (40 CSV)                 PostgreSQL  schema raw
 ┌───────────────────┐  export  ┌────────────────────────┐   load    ┌──────────────────────────┐
 │ Pasco.xlsx  16 tabs│────────►│ 32 xlsx_export CSVs     │─────────►│ 40 raw.<csv> tables      │
 │ Worksheet  16 tabs │ verify  │  8 manual_transcription │  verify  │ raw.load_batch           │
 └───────────────────┘ (cells)  │ observations.md         │ (md5)    │ raw.load_file            │
        images ─────transcribed─►└────────────────────────┘          │ raw.column_map           │
                                                                      └────────────┬─────────────┘
                                                                                   │ SQL transforms (build_model.py)
                                                                      silver → gold  (uc1-data-model.md)
```

---

## 2. Step 1: Excel → CSV

**Where:** `Hackathon 2026 - Use Cases/Hackathon 2026-UseCases/UC1 - Plant Capacity Utilization/data_sources/`

| Aspect | Decision |
| --- | --- |
| Reader | `openpyxl` with `data_only=True`: the **stored cell values** (last calculated result of every formula) |
| One file per tab | Tab name → lower case → non-alphanumeric runs → `_` (`LSV Pass_Fail Log` → `lsv_pass_fail_log.csv`). No collisions across the two workbooks |
| No cleaning | Values are written exactly as stored. All standardization is deferred to SQL, so the CSVs stay a provable copy |
| Traceability | Grid starts at **A1**; only trailing empty rows/columns are trimmed, so **CSV record N = Excel row N** and CSV column position = Excel column letter |
| Formats | UTF-8, comma, minimal quoting, `\n`. Integers as-is; decimals at full precision (shortest round-trip); dates `YYYY-MM-DD`; booleans `TRUE`/`FALSE`; empty cell → empty field |
| Verification | (1) CSV re-read = workbook values for all 32 files; (2) every cell compared with `python-calamine` (Rust engine): 216,638 cells, 0 value differences; (3) no non-empty cell outside the exported grid |
| Known engine difference | 13 header cells × 2 files store a line break as `CR LF`. The XML spec normalizes it to `LF`, and Excel's own table definitions use `LF`, so the CSVs use `LF` |

**Not representable in CSV** (documented, none is operational data):

- images and charts (the throughput tabs are charts)
- the embedded workbook object
- formulas (their stored results are exported)
- one cell comment
- merged cells (the value sits in the top-left cell)
- display formats (`26%` is exported as `0.26…`)

`WorkCenter`, `Pack Line` and `Department` in the SAP tab are **VLOOKUPs to an external workbook** (`Plant Schedules.xlsx`, SharePoint), so their values reflect the last refresh.

**Transcribed files.** Eight CSVs were added later by transcribing the workbook images: the SAP COISPI screenshot → `sap_order_headers` / `sap_order_components`; the Data Shuttle UI → `data_shuttle_workflow`; the throughput cards → `*_throughput`; the rate blocks → `packaging_rates_*`.

- They carry their own `dq_flags` (e.g. `work_center_code_inferred`) and their own `source_row_number`, which is a position in the image, not an Excel row.
- A plausibility check against the logs passed: Line 1 card 1,378 kg/h vs 2026 log mean 1,439.
- They're tagged `manual_transcription` so nobody mistakes them for verified cell data.

---

## 3. Step 2: CSV → `raw`

**Loader:** [`backend/database/etl/load_raw.py`](../database/etl/load_raw.py) (Python 3, `psycopg` 3, `openpyxl` for column letters).

### 3.1 What it does

1. **Guards the file set.** It refuses to run if a CSV exists in `data_sources/` that isn't registered in `FILES` (with provenance, source workbook, tab, layout and header row), or if a registered one is missing. So nothing gets loaded with unknown provenance.
2. **Plans each file:**
   - `table` layout: the header row (1, or 2 for `components.csv`) gives the column names, and the data rows follow it.
   - `grid` layout: tabs that are layouts or notes (`packaging_rates`, `sheet1`, `schedule_updating`, the title-only tabs) keep every record, with generic columns `col_a`, `col_b`, …
3. **Hashes** both workbooks and every CSV (SHA-256), and computes a content MD5 per file.
4. **Opens a batch** in `raw.load_batch` (status `RUNNING`, workbook hashes, loader version), committed so failures are recorded too.
5. **In one transaction**, for each file:
   - `DROP TABLE IF EXISTS` + `CREATE TABLE raw.<csv name>`: only the 40 registered tables are touched.
   - Adds comments: the table comment gives provenance and workbook › tab › file; each column comment gives `<letter>: <original header>`.
   - `COPY … FROM STDIN` of all rows (empty field → `NULL`).
   - Writes `raw.column_map` and `raw.load_file`.
6. **Verifies inside the database.** For every table it checks `count(*)` and `md5(string_agg(row, E'\n' ORDER BY _source_row_number))`, with the same row serialization the loader computed locally (field separator `\x1f`, NULL marker `\x1e`). Any mismatch raises an error and **rolls the whole load back**; the batch is marked `FAILED`.
7. Marks the batch `SUCCESS`.

It's **idempotent**: rerun it any time and the raw tables are recreated; `raw.load_batch` keeps the history of runs.

### 3.2 Structure of a raw table

```sql
CREATE TABLE raw.line_1_schedule (
    _source_row_number int PRIMARY KEY,   -- CSV record number = Excel row number
    _load_id           bigint NOT NULL,   -- raw.load_batch.load_id
    run_order          text,              -- COMMENT 'A: Run Order'
    po_status          text,              -- COMMENT 'B: PO Status'
    ...
    warehouse_staging_link text           -- COMMENT 'S: Warehouse Staging Link'
);
COMMENT ON TABLE raw.line_1_schedule IS
  'xlsx_export: Pasco LSV and SSV Conditioning sheets and data.xlsx > Line 1 Schedule (line_1_schedule.csv)';
```

### 3.3 Bookkeeping tables

| Table | Grain | Key columns |
| --- | --- | --- |
| `raw.load_batch` | one execution | `load_id` (PK), `started_at`, `finished_at`, `status` (`RUNNING`/`SUCCESS`/`FAILED`), `loader_version`, `source_workbooks` (jsonb: file → sha256), `loaded_by` |
| `raw.load_file` | execution × CSV | PK (`load_id`, `csv_name`), `raw_table`, `provenance` (`xlsx_export`/`manual_transcription`), `source_workbook`, `source_sheet`, `layout` (`table`/`grid`), `header_row`, `csv_sha256`, `csv_records`, `rows_loaded`, `content_md5` |
| `raw.column_map` | CSV × column | PK (`csv_name`, `column_position`), `column_letter`, `source_header` (verbatim, may contain `\n`), `raw_column` |

### 3.4 How to run

```bash
pip install openpyxl "psycopg[binary]"
# credentials: ~/.pgpass (chmod 600), one line  host:port:db:user:password  or PGPASSWORD. Never commit them.
export PGHOST=greenbyte-dev-postgres.cc5vjagstg6n.us-east-1.rds.amazonaws.com PGPORT=5432 PGDATABASE=greenbyte PGUSER=greenbyte_user
python backend/database/etl/load_raw.py --dry-run   # parse + plan, prints rows/cols per table, no DB access
python backend/database/etl/load_raw.py             # load + verify
```

To add a new CSV: put it in `data_sources/`, register it in `FILES` with its provenance, header row and layout, and rerun.

---

## 4. Conventions

### 4.1 Naming

| Object | Rule | Example |
| --- | --- | --- |
| CSV file | tab name → lower case → non-alphanumeric runs → `_` | `LSV Pass_Fail Log` → `lsv_pass_fail_log.csv` |
| Raw table | `raw.<csv file name without .csv>` | `raw.lsv_pass_fail_log` |
| Raw data column | source header → lower case, `%` → `pct`, non-alphanumeric runs → `_`, trimmed | `Material \nDescription` → `material_description`; `Loss %` → `loss_pct`; `PO Finished?` → `po_finished`; `Input Weight (KG)` → `input_weight_kg`; `Excelis / GMO` → `excelis_gmo` |
| Blank header / grid layout | `col_<excel letter>` | `raw.lsv_gravity.col_a`, `raw.packaging_rates.col_a…col_s` |
| Collisions / leading digit | suffix `_<letter>` / prefix `c_` | none occurred in load 1 |
| Metadata columns | prefixed with `_` so they can never collide with a source header | `_source_row_number`, `_load_id` |
| Source typos | **kept in raw** (verbatim names), fixed in `silver` | `equiment_id`, `specie`, `original_scheduled_finish_date` |
| Target layers (`silver`/`gold`) | snake_case singular tables; `<table>_id` PK; suffixes `_code`, `_number`, `_kg`, `_qty` + `uom_code`, `_h`, `_fraction`, `_date`, `_at`, `is_`, `_raw` | `silver.conditioning_run.run_h`, `quality_test.raw_germ_fraction` |

Identifiers are unquoted-safe (lower case, `[a-z0-9_]`, ≤ 38 characters, well under Postgres's 63).

### 4.2 Data types

**Raw layer: every data column is `text`.** No load can fail on a type error, and nothing is silently converted. That matters because ID-like columns mix numbers and words:

| Column family | Why it can't be numeric | Examples in the data |
| --- | --- | --- |
| PO number | placeholders, lot numbers, leading zeros, typos | `Off System`, `BAYER 1`, `150881768`, `0300097772`, `1.16` |
| Lot number | letters, slashes, leading zeros | `23-MZ1713X1`, `RBR/10248`, `150638606D` |
| Run order | free text and stars | `*1`, `FUMIGATED`, `DESK MOVED TO LINE 2` |
| Priority | free text | `2A`, `6VMEK`, `RUSH`, `spirals & samples` |
| Crop year | suffix | `2023CL` |
| Rates / hours | error text, malformed numbers | `#DIVIDE BY ZERO`, `14..5`, `..42` |
| Germ / vigor | text markers | `NA`, `None` |

**Typed layers (`silver`, `gold`), types:**

| Kind | PostgreSQL type | Rule |
| --- | --- | --- |
| Identifiers (PO, lot, batch as business keys) | `text` | Never numeric. `output_batch_number` may be `bigint` (always numeric) |
| Surrogate keys | `bigint GENERATED ALWAYS AS IDENTITY` | `<table>_id` |
| Weights / quantities | `numeric(14,3)` | Negative values are valid data (1 SSV run with output > input): flag, don't reject |
| Hours | `numeric(6,2)` | |
| Ratios (germ, vigor, loss) | `numeric(5,4)`, stored 0–1 | Never × 100 |
| Ranks / small counts | `smallint` | `priority_rank`, `run_order`, `crop_year` |
| Dates | `date` | No source date has a time part |
| Timestamps | `timestamptz` | `_at` columns (e.g. `data_shuttle_workflow.last_run_at` is ISO text in raw) |
| Booleans | `boolean` | `TRUE`/`FALSE`, `true`/`false` in raw text |
| Enumerations | `text` + `CHECK` (or a reference table) | status, result, fail reason, size, trait, UOM (observations §6.2) |

Cast pattern from raw (never a bare `::numeric`):

```sql
CASE WHEN btrim(x) ~ '^-?[0-9]+(\.[0-9]+)?$' THEN btrim(x)::numeric END          -- else NULL + dq flag
CASE WHEN btrim(po_number) ~ '^(100|240)[0-9]{7}$|^(300|120)[0-9]{6}$|^100[0-9]{6}$'
     THEN btrim(po_number) END                                                       -- R-PO, observations §5.3
```

### 4.3 NULLs and empty values

| Situation | In CSV | In `raw` | In `silver` |
| --- | --- | --- | --- |
| Empty Excel cell | empty field | `NULL` | `NULL` |
| Formula whose stored result is `""` (SAP `Hours`/`Capacity`) | empty field | `NULL` | not migrated |
| Text markers `NA`, `None`, `-` | kept as text | kept as text | `NULL` (+ DQ flag where listed) |
| Error text `#DIVIDE BY ZERO`, `#INVALID OPERATION` (26 cells) | kept | kept | `NULL`; the column is derived, so recompute it |
| Malformed numbers `14..5`, `..42` | kept | kept | `NULL` + DQ-02, never guessed |
| Blank `Pass/Fail` (37) | empty | `NULL` | `result_code = 'PENDING'` |
| Blank trait (`Excelis / GMO`) | empty | `NULL` | `trait_family_code = 'NONE'` |
| Placeholder PO (`Off System`, `BAYER n`) | kept | kept | `po_number NULL`, `is_off_system = true`, `po_number_raw` kept |
| Header-only / empty tabs | header / 0 bytes | table with 0 rows (or no data columns) | — |

**Rule of thumb:** `raw` never changes a value. The only transformation is empty → `NULL`. Every interpretation happens in SQL on the way to `silver`, where it's visible and testable.

### 4.4 Keys and lineage

- `raw`: PK = `_source_row_number` (unique per table, since each run recreates the tables); `_load_id` → `raw.load_batch`.
- `silver`: surrogate PK + `UNIQUE` business key + lineage columns (`source_csv`, `source_row_number`, `source_file_sha256`, `load_id`, `dq_flags`). Any `silver` fact row can be traced to its raw row, its CSV record and its Excel cell.
- Tested key findings (observations §5.4):
  - Unique: `Prod. Order` (SAP), `Work Center` (Resource Info), `Process Order` (Components), `PO Number` (Gravity, Colorsort, Line 2 excluding placeholders).
  - **No natural key** in the conditioning logs and pass/fail log.

---

## 5. Important takeaways

1. **Keep `raw` dumb.** All text, one table per file, verbatim names, and only empty → NULL. This made the load fail-proof and keeps the Excel row as the audit trail.
2. **The PO number is the join key, not the primary key.** It holds placeholders, lot numbers, leading zeros and typos, so `silver` uses surrogate keys, a normalized `po_number`, and `po_number_raw`.
3. **Some POs appear on several lines**, so schedule rows (`line_schedule_item`, PO × work center) are separate from `process_order`.
4. **Logs have no natural key**, not even the full row (15 exact duplicates). Their identity is the lineage.
5. **Don't trust derived Excel columns.** Rates, loss %, week and delay are recomputed in views. They hold all 26 error-text cells.
6. **Provenance matters.** 8 files are transcribed from images and are tagged, so the ranking logic can prefer log-derived numbers.
7. **Verify with a second engine, and verify in the target.** The cell-by-cell comparison caught the line-break encoding question; the database-side MD5 proves nothing changed in transit.
8. **Customer orders don't exist in the extracts.** They'll be synthetic (`is_synthetic = true`), which the demo must say.
9. **Stale "open" POs are signal, not noise.** 103 of 202 are past their SAP finish date: that's the at-risk story.
10. **Credentials stay out of the repo and the chat.** Use `~/.pgpass` (chmod 600) or `PGPASSWORD` in the environment only.

---

## 6. Raw layer inventory (from `raw.load_file`, load 1)

| Raw table | Provenance | Source (workbook › tab) | Layout | Header row | Rows | Data cols |
| --- | --- | --- | --- | --- | --- | --- |
| `raw.lsv_pass_fail_log` | xlsx_export | Pasco › `LSV Pass_Fail Log` | table | 1 | 3,142 | 19 |
| `raw.ssv_conditioning_logs` | xlsx_export | Pasco › `SSV Conditioning Logs` | table | 1 | 2,230 | 17 |
| `raw.lsv_conditioning_logs` | xlsx_export | Pasco › `LSV Conditioning Logs` | table | 1 | 1,899 | 24 |
| `raw.line_5_schedule` | xlsx_export | Pasco › `Line 5 Schedule` | table | 1 | 1,066 | 14 |
| `raw.gravity_schedule` | xlsx_export | Pasco › `Gravity Schedule` | table | 1 | 917 | 16 |
| `raw.line_6_schedule` | xlsx_export | Pasco › `Line 6 Schedule` | table | 1 | 484 | 13 |
| `raw.line_1_schedule` | xlsx_export | Pasco › `Line 1 Schedule` | table | 1 | 476 | 19 |
| `raw.line_2_schedule` | xlsx_export | Pasco › `Line 2 Schedule` | table | 1 | 442 | 19 |
| `raw.colorsort_schedule` | xlsx_export | Pasco › `Colorsort Schedule` | table | 1 | 406 | 14 |
| `raw.line_3_schedule` | xlsx_export | Pasco › `Line 3 Schedule` | table | 1 | 276 | 14 |
| `raw.components` | xlsx_export | Worksheet › `Components` | table | 2 | 214 | 2 |
| `raw.excel_sap_data` | xlsx_export | Pasco › `Excel SAP data` | table | 1 | 202 | 14 |
| `raw.main` | xlsx_export | Worksheet › `Main` | table | 1 | 202 | 14 |
| `raw.seed_health` | xlsx_export | Worksheet › `Seed Health` | table | 1 | 43 | 14 |
| `raw.packaging_rates` | xlsx_export | Worksheet › `Packaging Rates` | grid | — | 42 | 19 |
| `raw.ssv_line_5` | xlsx_export | Worksheet › `SSV Line 5` | table | 1 | 42 | 14 |
| `raw.lsv_line_2` | xlsx_export | Worksheet › `LSV Line 2` | table | 1 | 40 | 12 |
| `raw.resource_info` | xlsx_export | Worksheet › `Resource Info` | table | 1 | 31 | 3 |
| `raw.ssv_line_6` | xlsx_export | Worksheet › `SSV Line 6` | table | 1 | 24 | 14 |
| `raw.lsv_gravity` | xlsx_export | Worksheet › `LSV Gravity` | table | 1 | 22 | 15 |
| `raw.sheet1` | xlsx_export | Worksheet › `Sheet1` | grid | — | 18 | 26 |
| `raw.schedule_updating` | xlsx_export | Pasco › `Schedule Updating` | grid | — | 16 | 2 |
| `raw.ssv_line_3` | xlsx_export | Worksheet › `SSV Line 3` | table | 1 | 16 | 14 |
| `raw.lsv_line_1` | xlsx_export | Worksheet › `LSV Line 1` | table | 1 | 15 | 12 |
| `raw.large_seed_conditioning` | xlsx_export | Pasco › `Large Seed Conditioning` | grid | — | 2 | 2 |
| `raw.small_seed_conditioning` | xlsx_export | Pasco › `Small Seed Conditioning` | grid | — | 2 | 2 |
| `raw.data_shuttle_interface_image` | xlsx_export | Pasco › `Data Shuttle interface image` | grid | — | 0 | 0 |
| `raw.lsv_colorsort` | xlsx_export | Worksheet › `LSV Colorsort` | table | 1 | 0 | 14 |
| `raw.lsv_treatpack` | xlsx_export | Worksheet › `LSV Treatpack` | table | 1 | 0 | 13 |
| `raw.sap_coispi_report` | xlsx_export | Pasco › `SAP Coispi report` | grid | — | 0 | 0 |
| `raw.ssv_line_7` | xlsx_export | Worksheet › `SSV Line 7` | table | 1 | 0 | 14 |
| `raw.ssv_treatpack` | xlsx_export | Worksheet › `SSV Treatpack` | table | 1 | 0 | 13 |
| `raw.packaging_rates_ssv_target_rate` | manual_transcription | Worksheet › `Packaging Rates` | table | 1 | 78 | 4 |
| `raw.packaging_rates_s660_manufacturer_rate` | manual_transcription | Worksheet › `Packaging Rates` | table | 1 | 45 | 7 |
| `raw.small_seed_conditioning_throughput` | manual_transcription | Pasco › `Small Seed Conditioning` | table | 1 | 34 | 11 |
| `raw.sap_order_components` | manual_transcription | Pasco › `SAP Coispi report` | table | 1 | 19 | 7 |
| `raw.sap_order_headers` | manual_transcription | Pasco › `SAP Coispi report` | table | 1 | 19 | 8 |
| `raw.large_seed_conditioning_throughput` | manual_transcription | Pasco › `Large Seed Conditioning` | table | 1 | 10 | 10 |
| `raw.data_shuttle_workflow` | manual_transcription | Pasco › `Data Shuttle interface image` | table | 1 | 8 | 12 |
| `raw.packaging_rates_s60_manufacturer_rate` | manual_transcription | Worksheet › `Packaging Rates` | table | 1 | 6 | 5 |


Data columns exclude the two metadata columns. Tables with 0 rows exist so the raw layer mirrors every tab.

---

## 7. Useful queries

```sql
-- what was loaded, from where
select raw_table, provenance, source_sheet, rows_loaded from raw.load_file where load_id = 1 order by 1;

-- original header of every column of a table
select column_letter, source_header, raw_column from raw.column_map
where csv_name = 'line_1_schedule.csv' order by column_position;

-- trace a value back to Excel: Line 1 Schedule, row 213, column E
select _source_row_number as excel_row, po_number from raw.line_1_schedule where _source_row_number = 213;

-- current open Line 1 queue (12 POs)
select po_status, count(*) from raw.line_1_schedule where po_status <> 'COMPLETE' group by 1;

-- load history
select load_id, status, started_at, finished_at, source_workbooks from raw.load_batch order by load_id;
```

---

## 8. Decisions and alternatives considered

| Topic | Decision | Alternative (not taken) and why |
| --- | --- | --- |
| Raw granularity | One raw table per CSV (40) | Union the 7 schedules into `schedule_history` and the SAP slices into `sap_backlog` in raw: good ideas, but for **`silver`**. Doing it in raw would break the one-table-per-file link to Excel |
| Which files to load | All 40, including empty, header-only and layout tabs | Skip them: they cost nothing to load and make `raw` a complete mirror |
| Duplicate `main` vs `excel_sap_data` (byte-identical) | Both loaded | Load one: dedup belongs in `silver` (SAP is loaded once there) |
| `lsv_gravity` empty column A | Kept as `col_a` | Drop it: keeping it preserves column position = Excel letter |
| Metadata column names | `_`-prefixed | `source_row_number`: it collides with the transcribed files' own `source_row_number` column |
| Null handling | Only empty → NULL in raw | Also convert `NA`/`-`/error text in raw: that's interpretation, deferred to `silver` |
| Load mechanics | `COPY` in one transaction, verify, then commit | Row inserts / per-table commits: slower, and a partial load would be possible |

---

## 9. Known issues and follow-ups

| Item | Status |
| --- | --- |
| `raw.load_batch.finished_at` for load 1 shows the start of the final transaction (Postgres `now()` is fixed per transaction) | Fixed in the loader (`clock_timestamp()`); load 1's row is left as recorded |
| Untracked Finder duplicates (`* 2.csv`) in `data_sources/` make the loader's file guard refuse to run | Remove them before rerunning `load_raw.py` |
| 8 transcribed files not verified against the images | Plausibility check passed (§2); a visual check against the embedded images is still open |
| Excel lock file `~$Pasco…xlsx` was committed in `0d7a658` | Remove it from git and add `~$*` to `.gitignore` |
| `silver` / `gold` layers | ✅ Built and reconciled by `backend/database/etl/build_model.py` ([uc1-data-model.md](./uc1-data-model.md) §5) |
| Open data questions (Q-1…Q-10) | observations §10; model questions in uc1-data-model §9 |
