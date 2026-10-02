-- Demo clock and heuristic parameters. The plan horizon starts on demo day (silver.demo_as_of, R-DATE-SHIFT), not on
-- the extract date (silver.extract_as_of): the demo runs live and the commitment dates are shifted to match.
INSERT INTO gold.config (config_key, value, description) VALUES
    ('as_of_date', silver.demo_as_of()::text, 'Demo clock date (demo day; the Pasco extract is dated silver.extract_as_of()). Slack and at-risk are measured from it'),
    ('plan_start_at', silver.demo_as_of()::text || ' 06:00:00 America/Los_Angeles', 'Horizon start of every plan (Pasco, WA local time)'),
    ('plant_time_zone', 'America/Los_Angeles', 'Time zone for finish strings in API payloads'),
    ('heuristic_version', 'heuristic-v1', 'schedule_plan.created_by for automatic replans'),
    ('min_species_runs', '5', 'Minimum logged runs to use a species-level throughput instead of the work-center median');

CREATE FUNCTION gold.cfg(p_key text) RETURNS text
LANGUAGE sql STABLE AS $$ SELECT value FROM gold.config WHERE config_key = p_key $$;
