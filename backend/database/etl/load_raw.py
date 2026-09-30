"""Load the UC1 Pasco CSVs verbatim into the PostgreSQL `raw` schema.

One table per CSV, every data column as text, empty field -> NULL.
Metadata columns are prefixed with `_` so they never collide with source headers:
  _source_row_number  CSV record number (= Excel row number for xlsx exports)  PK
  _load_id            raw.load_batch.load_id

Bookkeeping tables:
  raw.load_batch   one row per execution (source workbook hashes, status)
  raw.load_file    one row per CSV (provenance, sheet, sha256, header row, rows loaded)
  raw.column_map   CSV column position/letter -> source header -> raw column name

Each run drops and recreates the raw tables listed in FILES (idempotent) and
verifies every table with an md5 over its rows computed locally and in the database.

Connection uses standard libpq env vars (PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD)
or ~/.pgpass. See backend/database/README.md.

Usage:
  python load_raw.py --dry-run     # parse + plan only, no database access
  python load_raw.py               # load
"""

import argparse
import csv
import hashlib
import json
import os
import re
import sys
from pathlib import Path

from openpyxl.utils import get_column_letter

REPO = Path(__file__).resolve().parents[3]
UC1 = REPO / "Hackathon 2026 - Use Cases" / "Hackathon 2026-UseCases" / "UC1 - Plant Capacity Utilization"
DATA = UC1 / "data_sources"
SCHEMA = "raw"
LOADER_VERSION = "1.0.0"

WORKBOOKS = {
    "pasco": "Pasco LSV and SSV Conditioning sheets and data.xlsx",
    "worksheet": "Worksheet in Pasco LSV and SSV Conditioning sheets and data.xlsx",
}

# provenance: xlsx_export = cell values exported and verified (observations.md §2)
#             manual_transcription = typed from images in the workbook, not verifiable cell data
# layout: table (header row N) | grid (no single header; columns named col_a, col_b, ...)
FILES = {
    # csv name: (provenance, workbook key, sheet, layout, header_row)
    "schedule_updating.csv": ("xlsx_export", "pasco", "Schedule Updating", "grid", None),
    "sap_coispi_report.csv": ("xlsx_export", "pasco", "SAP Coispi report", "grid", None),
    "excel_sap_data.csv": ("xlsx_export", "pasco", "Excel SAP data", "table", 1),
    "data_shuttle_interface_image.csv": ("xlsx_export", "pasco", "Data Shuttle interface image", "grid", None),
    "large_seed_conditioning.csv": ("xlsx_export", "pasco", "Large Seed Conditioning", "grid", None),
    "line_1_schedule.csv": ("xlsx_export", "pasco", "Line 1 Schedule", "table", 1),
    "line_2_schedule.csv": ("xlsx_export", "pasco", "Line 2 Schedule", "table", 1),
    "gravity_schedule.csv": ("xlsx_export", "pasco", "Gravity Schedule", "table", 1),
    "colorsort_schedule.csv": ("xlsx_export", "pasco", "Colorsort Schedule", "table", 1),
    "lsv_conditioning_logs.csv": ("xlsx_export", "pasco", "LSV Conditioning Logs", "table", 1),
    "lsv_pass_fail_log.csv": ("xlsx_export", "pasco", "LSV Pass_Fail Log", "table", 1),
    "small_seed_conditioning.csv": ("xlsx_export", "pasco", "Small Seed Conditioning", "grid", None),
    "line_3_schedule.csv": ("xlsx_export", "pasco", "Line 3 Schedule", "table", 1),
    "line_5_schedule.csv": ("xlsx_export", "pasco", "Line 5 Schedule", "table", 1),
    "line_6_schedule.csv": ("xlsx_export", "pasco", "Line 6 Schedule", "table", 1),
    "ssv_conditioning_logs.csv": ("xlsx_export", "pasco", "SSV Conditioning Logs", "table", 1),
    "main.csv": ("xlsx_export", "worksheet", "Main", "table", 1),
    "components.csv": ("xlsx_export", "worksheet", "Components", "table", 2),
    "lsv_treatpack.csv": ("xlsx_export", "worksheet", "LSV Treatpack", "table", 1),
    "ssv_treatpack.csv": ("xlsx_export", "worksheet", "SSV Treatpack", "table", 1),
    "seed_health.csv": ("xlsx_export", "worksheet", "Seed Health", "table", 1),
    "ssv_line_3.csv": ("xlsx_export", "worksheet", "SSV Line 3", "table", 1),
    "ssv_line_5.csv": ("xlsx_export", "worksheet", "SSV Line 5", "table", 1),
    "ssv_line_6.csv": ("xlsx_export", "worksheet", "SSV Line 6", "table", 1),
    "ssv_line_7.csv": ("xlsx_export", "worksheet", "SSV Line 7", "table", 1),
    "lsv_line_1.csv": ("xlsx_export", "worksheet", "LSV Line 1", "table", 1),
    "lsv_line_2.csv": ("xlsx_export", "worksheet", "LSV Line 2", "table", 1),
    "lsv_gravity.csv": ("xlsx_export", "worksheet", "LSV Gravity", "table", 1),
    "lsv_colorsort.csv": ("xlsx_export", "worksheet", "LSV Colorsort", "table", 1),
    "resource_info.csv": ("xlsx_export", "worksheet", "Resource Info", "table", 1),
    "packaging_rates.csv": ("xlsx_export", "worksheet", "Packaging Rates", "grid", None),
    "sheet1.csv": ("xlsx_export", "worksheet", "Sheet1", "grid", None),
    "sap_order_headers.csv": ("manual_transcription", "pasco", "SAP Coispi report", "table", 1),
    "sap_order_components.csv": ("manual_transcription", "pasco", "SAP Coispi report", "table", 1),
    "data_shuttle_workflow.csv": ("manual_transcription", "pasco", "Data Shuttle interface image", "table", 1),
    "large_seed_conditioning_throughput.csv": ("manual_transcription", "pasco", "Large Seed Conditioning", "table", 1),
    "small_seed_conditioning_throughput.csv": ("manual_transcription", "pasco", "Small Seed Conditioning", "table", 1),
    "packaging_rates_s60_manufacturer_rate.csv": ("manual_transcription", "worksheet", "Packaging Rates", "table", 1),
    "packaging_rates_s660_manufacturer_rate.csv": ("manual_transcription", "worksheet", "Packaging Rates", "table", 1),
    "packaging_rates_ssv_target_rate.csv": ("manual_transcription", "worksheet", "Packaging Rates", "table", 1),
}

NULL_MARK, FIELD_SEP = "\x1e", "\x1f"


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def snake(header):
    s = str(header).lower().replace("%", " pct ")
    s = re.sub(r"[^0-9a-z]+", "_", s).strip("_")
    return s if s and not s[0].isdigit() else f"c_{s}" if s else ""


def plan_file(name, spec):
    provenance, wb_key, sheet, layout, header_row = spec
    path = DATA / name
    with open(path, newline="", encoding="utf-8") as fh:
        records = list(csv.reader(fh))
    width = max((len(r) for r in records), default=0)
    records = [r + [""] * (width - len(r)) for r in records]
    if layout == "table" and records:
        headers = records[header_row - 1]
        data = [(i + 1, r) for i, r in enumerate(records) if i + 1 > header_row]
    else:
        headers = [None] * width
        data = [(i + 1, r) for i, r in enumerate(records)]
    columns, used = [], set()
    for pos, h in enumerate(headers, 1):
        letter = get_column_letter(pos)
        col = snake(h) if h not in (None, "") else ""
        col = col or f"col_{letter.lower()}"
        if col in used or col.startswith("_"):
            col = f"{col}_{letter.lower()}"
        used.add(col)
        columns.append(dict(position=pos, letter=letter, source_header=h, raw_column=col))
    return dict(csv=name, table=Path(name).stem, provenance=provenance, workbook=WORKBOOKS[wb_key],
                sheet=sheet, layout=layout, header_row=header_row if layout == "table" else None,
                csv_sha256=sha256(path), csv_records=len(records), columns=columns, data=data)


def row_fingerprint(rownum, values):
    return FIELD_SEP.join([str(rownum)] + [NULL_MARK if v == "" else v for v in values])


def local_md5(plan):
    return hashlib.md5("\n".join(row_fingerprint(n, r) for n, r in plan["data"]).encode("utf-8")).hexdigest()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    on_disk = {p.name for p in DATA.glob("*.csv")}
    unknown, missing = sorted(on_disk - FILES.keys()), sorted(FILES.keys() - on_disk)
    if unknown or missing:
        sys.exit(f"CSV set changed. Unknown (add to FILES with provenance): {unknown}. Missing: {missing}")

    plans = [plan_file(n, s) for n, s in FILES.items()]
    wb_hashes = {name: sha256(UC1 / name) for name in WORKBOOKS.values()}
    for p in plans:
        p["md5"] = local_md5(p)

    print(f"{'table':42} {'provenance':21} {'rows':>5} {'cols':>4}")
    for p in plans:
        print(f"{p['table']:42} {p['provenance']:21} {len(p['data']):>5} {len(p['columns']):>4}")
    print(f"total rows: {sum(len(p['data']) for p in plans)}")
    if args.dry_run:
        return

    import psycopg
    from psycopg import sql

    with psycopg.connect(connect_timeout=15, application_name="greenbyte-load-raw") as conn:
        with conn.cursor() as cur:
            cur.execute(sql.SQL("CREATE SCHEMA IF NOT EXISTS {}").format(sql.Identifier(SCHEMA)))
            cur.execute(f"""
                CREATE TABLE IF NOT EXISTS {SCHEMA}.load_batch (
                    load_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                    started_at timestamptz NOT NULL DEFAULT now(),
                    finished_at timestamptz,
                    status text NOT NULL DEFAULT 'RUNNING',
                    loader_version text NOT NULL,
                    source_workbooks jsonb NOT NULL,
                    loaded_by text NOT NULL DEFAULT current_user);
                CREATE TABLE IF NOT EXISTS {SCHEMA}.load_file (
                    load_id bigint NOT NULL REFERENCES {SCHEMA}.load_batch,
                    csv_name text NOT NULL,
                    raw_table text NOT NULL,
                    provenance text NOT NULL CHECK (provenance IN ('xlsx_export','manual_transcription')),
                    source_workbook text NOT NULL,
                    source_sheet text NOT NULL,
                    layout text NOT NULL CHECK (layout IN ('table','grid')),
                    header_row int,
                    csv_sha256 char(64) NOT NULL,
                    csv_records int NOT NULL,
                    rows_loaded int NOT NULL,
                    content_md5 char(32) NOT NULL,
                    PRIMARY KEY (load_id, csv_name));
                CREATE TABLE IF NOT EXISTS {SCHEMA}.column_map (
                    csv_name text NOT NULL,
                    column_position int NOT NULL,
                    column_letter text NOT NULL,
                    source_header text,
                    raw_column text NOT NULL,
                    PRIMARY KEY (csv_name, column_position));""")
            cur.execute(f"INSERT INTO {SCHEMA}.load_batch (loader_version, source_workbooks) VALUES (%s, %s) RETURNING load_id",
                        (LOADER_VERSION, json.dumps(wb_hashes)))
            load_id = cur.fetchone()[0]
        conn.commit()

        try:
            with conn.transaction(), conn.cursor() as cur:
                cur.execute(f"DELETE FROM {SCHEMA}.column_map WHERE csv_name = ANY(%s)", ([p["csv"] for p in plans],))
                for p in plans:
                    t = sql.Identifier(SCHEMA, p["table"])
                    cols = [c["raw_column"] for c in p["columns"]]
                    cur.execute(sql.SQL("DROP TABLE IF EXISTS {}").format(t))
                    cur.execute(sql.SQL("CREATE TABLE {} (_source_row_number int PRIMARY KEY, _load_id bigint NOT NULL{})").format(
                        t, sql.SQL("").join(sql.SQL(", {} text").format(sql.Identifier(c)) for c in cols)))
                    comment = f"{p['provenance']}: {p['workbook']} > {p['sheet']} ({p['csv']})"
                    cur.execute(sql.SQL("COMMENT ON TABLE {} IS {}").format(t, sql.Literal(comment)))
                    for c in p["columns"]:
                        if c["source_header"] not in (None, ""):
                            cur.execute(sql.SQL("COMMENT ON COLUMN {}.{} IS {}").format(
                                t, sql.Identifier(c["raw_column"]), sql.Literal(f"{c['letter']}: {c['source_header']}")))
                    copy_cols = sql.SQL(", ").join(sql.Identifier(c) for c in ["_source_row_number", "_load_id"] + cols)
                    with cur.copy(sql.SQL("COPY {} ({}) FROM STDIN").format(t, copy_cols)) as cp:
                        for n, r in p["data"]:
                            cp.write_row([n, load_id] + [None if v == "" else v for v in r])
                    cur.executemany(f"INSERT INTO {SCHEMA}.column_map VALUES (%s,%s,%s,%s,%s)",
                                    [(p["csv"], c["position"], c["letter"], c["source_header"], c["raw_column"]) for c in p["columns"]])
                    cur.execute(f"""INSERT INTO {SCHEMA}.load_file VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                                (load_id, p["csv"], f"{SCHEMA}.{p['table']}", p["provenance"], p["workbook"], p["sheet"],
                                 p["layout"], p["header_row"], p["csv_sha256"], p["csv_records"], len(p["data"]), p["md5"]))

                # verify: row count + content md5 recomputed inside the database
                failures = []
                for p in plans:
                    t = sql.Identifier(SCHEMA, p["table"])
                    parts = [sql.SQL("_source_row_number::text")] + [
                        sql.SQL("coalesce({}, {})").format(sql.Identifier(c["raw_column"]), sql.Literal(NULL_MARK)) for c in p["columns"]]
                    cur.execute(sql.SQL("SELECT count(*), coalesce(md5(string_agg(concat_ws({}, {}), E'\\n' ORDER BY _source_row_number)), md5('')) FROM {}").format(
                        sql.Literal(FIELD_SEP), sql.SQL(", ").join(parts), t))
                    n, md5 = cur.fetchone()
                    if n != len(p["data"]) or md5 != p["md5"]:
                        failures.append((p["table"], n, len(p["data"]), md5, p["md5"]))
                if failures:
                    raise RuntimeError(f"verification failed: {failures}")
                cur.execute(f"UPDATE {SCHEMA}.load_batch SET status='SUCCESS', finished_at=clock_timestamp() WHERE load_id=%s", (load_id,))
        except Exception:
            with conn.cursor() as cur:
                cur.execute(f"UPDATE {SCHEMA}.load_batch SET status='FAILED', finished_at=clock_timestamp() WHERE load_id=%s", (load_id,))
            conn.commit()
            raise
    print(f"load_id={load_id}: {len(plans)} tables loaded and verified (row count + md5).")


if __name__ == "__main__":
    main()
