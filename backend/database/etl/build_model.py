"""Build the UC1 silver and gold layers from raw (PostgreSQL), then reconcile.

Medallion (backend/data-model/uc1-data-model.md §5):
  raw     verbatim CSV tables (load_raw.py) + raw.ingest_event (upstream signals, append-only)
  silver  typed, conformed entities         dropped and rebuilt here
  gold    serving layer for the Data API    dropped and rebuilt here; plans regenerated
          (baseline v1 per line + replay of the non-voided raw.ingest_event rows)

Every step runs in ONE transaction, followed by tests/reconciliation.sql. Any failure rolls
everything back, so the previous silver/gold stay in place.

Connection uses standard libpq env vars (PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD)
or ~/.pgpass. See backend/database/README.md.

Usage:
  python build_model.py --dry-run          # list the steps and check the files exist, no database access
  python build_model.py                    # rebuild silver + gold, reconcile, commit
  python build_model.py --checks-only      # run the reconciliation against the current build (read-only)
  python build_model.py --scenario         # run tests/demo_scenario.sql and roll it back
  python build_model.py --reset-demo line-1  # void the line's ingest events and restore the baseline plan
  python build_model.py --validate         # grain / relation / constraint report (read-only, tests/gold_v4_validation.sql)
  python build_model.py --upgrade-gold-v4  # live DB: keep raw/silver, rename changed gold tables to *_legacy,
                                           # create gold v4 and regenerate the plans (etl/gold-model/)
"""

import argparse
import sys
import time
from pathlib import Path

DB = Path(__file__).resolve().parents[1]
BUILDER_VERSION = "1.1.0"

# Order respects the FKs (observations.md §9.3).
STEPS = [
    "migrations/001_schemas.sql",
    "migrations/002_raw_ingest_event.sql",
    "migrations/006_raw_note_curation.sql",
    "migrations/003_silver_reference.sql",
    "migrations/004_silver_facts.sql",
    "migrations/005_gold_runtime.sql",
    "migrations/007_gold_v4_runtime.sql",
    "etl/transforms/silver/00_rules.sql",
    "etl/transforms/silver/05_staging.sql",
    "etl/transforms/silver/10_reference.sql",
    "seeds/gold_config.sql",
    "etl/transforms/silver/20_process_order.sql",
    "etl/transforms/silver/30_facts.sql",
    "etl/transforms/silver/40_ingest.sql",
    "seeds/gold_reason_code.sql",
    "seeds/gold_policy.sql",
    "etl/transforms/gold/05_semantic.sql",
    "etl/transforms/gold/10_views.sql",
    "seeds/gold_changeover_rule.sql",
    "seeds/silver_customer_order.sql",
    "etl/transforms/gold/20_replan.sql",
    "etl/transforms/gold/30_api.sql",
    "etl/transforms/gold/40_baseline.sql",
]
# Gold v4 in place (team decision 2026-10-01): raw/silver untouched, changed gold tables kept as *_legacy,
# gold.config / gold.changeover_rule reused, gold code recreated, plans regenerated (baseline + ingest replay).
UPGRADE_GOLD_V4 = [
    "migrations/006_raw_note_curation.sql",
    "upgrades/2026-10-01_gold_v4_legacy.sql",
    "migrations/007_gold_v4_runtime.sql",
    "seeds/gold_reason_code.sql",
    "seeds/gold_policy.sql",
    "etl/transforms/gold/05_semantic.sql",
    "etl/transforms/gold/10_views.sql",
    "etl/transforms/gold/20_replan.sql",
    "etl/transforms/gold/30_api.sql",
    "etl/transforms/gold/40_baseline.sql",
]
RECONCILIATION = "tests/reconciliation.sql"
GOLD_V4_CHECKS = "tests/gold_v4_checks.sql"
VALIDATION = "tests/gold_v4_validation.sql"
SCENARIO = "tests/demo_scenario.sql"

SUMMARY_SQL = """
SELECT 'silver.' || t, n FROM (VALUES
    ('work_center', (SELECT count(*) FROM silver.work_center)),
    ('species', (SELECT count(*) FROM silver.species)),
    ('material', (SELECT count(*) FROM silver.material)),
    ('lot', (SELECT count(*) FROM silver.lot)),
    ('process_order', (SELECT count(*) FROM silver.process_order)),
    ('line_schedule_item', (SELECT count(*) FROM silver.line_schedule_item)),
    ('conditioning_run', (SELECT count(*) FROM silver.conditioning_run)),
    ('quality_test', (SELECT count(*) FROM silver.quality_test)),
    ('customer_order (synthetic)', (SELECT count(*) FROM silver.customer_order))) v(t, n)
UNION ALL
SELECT 'gold.schedule_plan', count(*) FROM gold.schedule_plan
UNION ALL
SELECT 'gold.source_note', count(*) FROM gold.source_note
UNION ALL
SELECT 'gold.semantic_fact (trusted)', count(*) FROM gold.v_trusted_fact
UNION ALL
SELECT 'raw.note_reading', count(*) FROM raw.note_reading
UNION ALL
SELECT 'raw.ingest_event (active)', count(*) FROM raw.ingest_event WHERE voided_at IS NULL
"""


def read(step):
    return (DB / step).read_text(encoding="utf-8")


def run_checks(cur):
    """Run the reconciliation file (raises on any mismatch); return the number of checks."""
    cur.execute(read(RECONCILIATION))
    cur.execute("SELECT count(*) FROM _check")
    return cur.fetchone()[0]


def run_v4_checks(cur):
    """Run the gold v4 checks (raises on any mismatch); return the number of checks."""
    cur.execute(read(GOLD_V4_CHECKS))
    cur.execute("SELECT count(*) FROM _check_v4")
    return cur.fetchone()[0]


def main():
    ap = argparse.ArgumentParser()
    mode = ap.add_mutually_exclusive_group()
    mode.add_argument("--dry-run", action="store_true")
    mode.add_argument("--checks-only", action="store_true")
    mode.add_argument("--scenario", action="store_true")
    mode.add_argument("--reset-demo", metavar="LINE")
    mode.add_argument("--upgrade-gold-v4", action="store_true")
    mode.add_argument("--validate", action="store_true")
    args = ap.parse_args()

    missing = [s for s in STEPS + UPGRADE_GOLD_V4 + [RECONCILIATION, GOLD_V4_CHECKS, VALIDATION, SCENARIO] if not (DB / s).is_file()]
    if missing:
        sys.exit(f"Missing SQL files: {missing}")

    if args.dry_run:
        for i, s in enumerate(STEPS, 1):
            print(f"{i:>2}. {s}")
        print(f"    then {RECONCILIATION} + {GOLD_V4_CHECKS} (same transaction)")
        print("--upgrade-gold-v4:")
        for i, s in enumerate(UPGRADE_GOLD_V4, 1):
            print(f"{i:>2}. {s}")
        print(f"    then {GOLD_V4_CHECKS} (same transaction)")
        return

    import psycopg

    notices = []
    with psycopg.connect(connect_timeout=15, application_name="greenbyte-build-model") as conn:
        conn.add_notice_handler(lambda d: notices.append(f"{d.severity}: {d.message_primary}"))
        with conn.cursor() as cur:
            if args.checks_only:
                failed = False
                for name, fn in (("reconciliation", run_checks), ("gold v4", run_v4_checks)):
                    try:
                        with conn.transaction(force_rollback=True):
                            print(f"{name}: {fn(cur)} checks passed")
                    except psycopg.Error as e:
                        failed = True
                        print(f"{name}: FAILED: {e.diag.message_primary}")
                if failed:
                    sys.exit(1)
                return

            if args.validate:
                with conn.transaction(force_rollback=True):
                    cur.execute("SET TRANSACTION READ ONLY")
                    cur.execute(read(VALIDATION))
                    rows = cur.fetchall()
                counts = {}
                for r in rows:
                    counts[r[8]] = counts.get(r[8], 0) + 1
                    if r[8] != "PASS":
                        gap = f" [{r[5]}]" if r[5] else ""
                        print(f"{r[8]:4} {r[0]}.{r[1]:26} {r[2]:11} {r[3]}{gap}: {r[7]} (expected {r[6]})"
                              + (f" e.g. {r[9]}" if r[9] else ""))
                print(f"validation: {len(rows)} checks — " + ", ".join(f"{k} {v}" for k, v in sorted(counts.items())))
                if counts.get("FAIL"):
                    sys.exit(1)
                return

            if args.upgrade_gold_v4:
                started = time.monotonic()
                with conn.transaction():
                    for i, s in enumerate(UPGRADE_GOLD_V4, 1):
                        t0 = time.monotonic()
                        cur.execute(read(s))
                        print(f"{i:>2}. {s:48} {time.monotonic() - t0:6.1f}s")
                    print(f"gold v4: {run_v4_checks(cur)} checks passed")
                    cur.execute(SUMMARY_SQL)
                    summary = cur.fetchall()
                for w in (x for x in notices if x.startswith("WARNING")):
                    print(w)
                for name, n in summary:
                    print(f"{name:34} {n:>7}")
                print(f"gold v4 upgrade committed in {time.monotonic() - started:.1f}s")
                return

            if args.scenario:
                with conn.transaction(force_rollback=True):
                    cur.execute(read(SCENARIO))
                print("\n".join(x for x in notices if "scenario" in x) or "scenario ran")
                print("demo scenario passed (rolled back)")
                return

            if args.reset_demo:
                with conn.transaction():
                    cur.execute("SELECT gold.reset_demo(%s) ->> 'planVersion'", (args.reset_demo,))
                    print(f"{args.reset_demo}: reset to plan v{cur.fetchone()[0]}")
                return

            started = time.monotonic()
            with conn.transaction():
                for i, s in enumerate(STEPS, 1):
                    t0 = time.monotonic()
                    cur.execute(read(s))
                    print(f"{i:>2}. {s:48} {time.monotonic() - t0:6.1f}s")
                n = run_checks(cur)
                print(f"reconciliation: {n} checks passed")
                print(f"gold v4: {run_v4_checks(cur)} checks passed")
                cur.execute(SUMMARY_SQL)
                summary = cur.fetchall()

    for w in (x for x in notices if x.startswith("WARNING")):
        print(w)
    print(f"{'object':34} {'rows':>7}")
    for name, n in summary:
        print(f"{name:34} {n:>7}")
    print(f"build {BUILDER_VERSION} committed in {time.monotonic() - started:.1f}s")


if __name__ == "__main__":
    main()
