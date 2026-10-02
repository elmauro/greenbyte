-- In-place upgrade of a live gold v4 database to gold planner v2 (etl/build_model.py --upgrade-gold-planner-v2).
-- Decision Q9a: gold holds mock data that does not flow from silver on a schedule, so the existing gold tables are
-- ALTERed in place (migrations/008_gold_planner_v2.sql: additive columns only, no existing column or row changes,
-- comments give the reason) and no *_legacy copy is made. raw and silver are not touched.
-- This step drops gold VIEWS and FUNCTIONS (code, recreated by the v4 transforms re-run after 008); tables and their
-- rows (plans, entries, reasons, decisions, facts, legacy tables) stay. gold.cfg() is kept.
-- Refuses to run twice (gold.plan_override already exists) or on a database without gold v4.

DO $$
DECLARE
    r record;
BEGIN
    IF to_regclass('gold.plan_override') IS NOT NULL THEN
        RAISE EXCEPTION 'gold planner v2 already applied (gold.plan_override exists)';
    END IF;
    IF to_regclass('gold.policy') IS NULL OR to_regclass('gold.semantic_fact') IS NULL THEN
        RAISE EXCEPTION 'gold v4 not found: run --upgrade-gold-v4 or a full build first';
    END IF;
    FOR r IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = 'gold' AND c.relkind IN ('v', 'm') LOOP
        EXECUTE format('DROP VIEW IF EXISTS gold.%I CASCADE', r.relname);
    END LOOP;
    FOR r IN SELECT p.oid::regprocedure AS sig FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'gold' AND p.proname <> 'cfg' LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS %s CASCADE', r.sig);
    END LOOP;
END
$$;
