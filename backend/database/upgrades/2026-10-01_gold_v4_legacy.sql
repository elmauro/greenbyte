-- In-place upgrade of a live database to gold model v4 (etl/build_model.py --upgrade-gold-v4), without dropping data.
-- Rules (team decision 2026-10-01):
--   raw / silver: nothing is dropped. v4 changes no silver table; raw only gains new tables (006_raw_note_curation.sql).
--   gold: every TABLE whose definition changes is renamed to <name>_legacy (with its indexes and identity sequences,
--         so the v4 table can take the original name), and commented with the reason. Gold VIEWS and FUNCTIONS are
--         code: they are dropped here and recreated by the v4 transforms. gold.config and gold.changeover_rule do not
--         change and are reused as they are; gold.cfg() is kept.
-- Refuses to run twice (gold.schedule_plan_legacy already exists).
-- Note: a later full build (etl/build_model.py without flags) drops the gold schema, legacy tables included.

DO $$
DECLARE
    t      record;
    r      record;
    v_name text;
BEGIN
    IF to_regclass('gold.schedule_plan_legacy') IS NOT NULL THEN
        RAISE EXCEPTION 'gold v4 upgrade already applied (gold.schedule_plan_legacy exists)';
    END IF;
    IF to_regclass('gold.schedule_plan') IS NULL THEN
        RAISE EXCEPTION 'gold.schedule_plan not found: nothing to upgrade, run a full build instead';
    END IF;

    -- 1. Code: drop every gold view and function except gold.cfg (seeded with gold.config, unchanged).
    FOR r IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = 'gold' AND c.relkind IN ('v', 'm') LOOP
        EXECUTE format('DROP VIEW IF EXISTS gold.%I CASCADE', r.relname);
    END LOOP;
    FOR r IN SELECT p.oid::regprocedure AS sig FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'gold' AND p.proname <> 'cfg' LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS %s CASCADE', r.sig);
    END LOOP;

    -- 2. Changed tables -> <name>_legacy (data kept), with the reason of the change.
    FOR t IN SELECT * FROM (VALUES
        ('reason_code',    'v4 adds param_keys (required params per code, G-21) and the note-backed codes NOT_READY_HOLD, NOT_READY_WARNING, NOTE_HOLD, NOTE_RUSH, NOTE_DEADLINE, THROUGHPUT_FALLBACK'),
        ('plan_event',     'v4 adds event_type note_review and one plan_event per ingest event (unique ingest_event_id)'),
        ('schedule_plan',  'v4 adds policy_id (plans cite the ranking policy that built them, D-02/D-06)'),
        ('schedule_entry', 'v4 makes line_schedule_item_id NOT NULL and references the v4 schedule_plan'),
        ('entry_reason',   'v4 references the v4 schedule_entry / reason_code and gains entry_reason_fact links to semantic facts'),
        ('plan_decision',  'v4 references the v4 schedule_plan; acceptance history is read through gold.v_plan_status (D-04)')
    ) AS x (tbl, reason) LOOP
        -- identity sequences first (their names derive from the table name)
        FOR r IN SELECT s.relname AS seq FROM pg_class s
                 JOIN pg_depend d ON d.objid = s.oid AND d.deptype IN ('a', 'i')
                 JOIN pg_class tb ON tb.oid = d.refobjid
                 JOIN pg_namespace n ON n.oid = tb.relnamespace
                 WHERE s.relkind = 'S' AND n.nspname = 'gold' AND tb.relname = t.tbl LOOP
            EXECUTE format('ALTER SEQUENCE gold.%I RENAME TO %I', r.seq, left(r.seq, 56) || '_legacy');
        END LOOP;
        -- indexes (PK / UNIQUE constraint indexes are renamed with their constraint)
        FOR r IN SELECT i.relname AS idx FROM pg_index x
                 JOIN pg_class i ON i.oid = x.indexrelid
                 JOIN pg_class tb ON tb.oid = x.indrelid
                 JOIN pg_namespace n ON n.oid = tb.relnamespace
                 WHERE n.nspname = 'gold' AND tb.relname = t.tbl LOOP
            EXECUTE format('ALTER INDEX gold.%I RENAME TO %I', r.idx, left(r.idx, 56) || '_legacy');
        END LOOP;
        v_name := t.tbl || '_legacy';
        EXECUTE format('ALTER TABLE gold.%I RENAME TO %I', t.tbl, v_name);
        EXECUTE format('COMMENT ON TABLE gold.%I IS %L', v_name,
                       'LEGACY gold v3, renamed 2026-10-01 by upgrades/2026-10-01_gold_v4_legacy.sql. Replaced by gold.'
                       || t.tbl || ' because ' || t.reason || '. Kept read-only for comparison; see etl/gold-model/gold-data-model.md');
    END LOOP;
END
$$;
