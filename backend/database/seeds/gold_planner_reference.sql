-- Planner v2 reference data (Q5a/Q5b, etl/gold-model/gold-data-model.md §7). Typed tables are the source of truth;
-- gold.config 'planner_rules' is generated from them at the end, in the JSON shape the semantic planner reads with
-- gold.cfg('planner_rules'). Idempotent: re-running refreshes planner_rules and adds missing rows.
-- Everything marked origin PLANNER / basis ASSUMPTION comes from the planner team's handoff and is not in the
-- Pasco extract (open questions for the planner team: FM / AP meaning, CERTIFIED_NON_GMO, COB route).

-- Fail reasons: the silver domain (silver.quality_test.fail_reason_code CHECK) + planner-only codes.
INSERT INTO gold.fail_reason (fail_reason_code, description, origin) VALUES
    ('COB', 'Cob pieces', 'SILVER'),
    ('DENT', 'Dented kernels', 'SILVER'),
    ('DISCOLORED', 'Discolored seed', 'SILVER'),
    ('OFF_TYPE', 'Off-type seed', 'SILVER'),
    ('BROKEN', 'Broken / cracked seed', 'SILVER'),
    ('SMUT', 'Smut', 'SILVER'),
    ('WEED', 'Weed seed', 'SILVER'),
    ('INERT', 'Inert matter', 'SILVER'),
    ('TARE', 'Tare (weight)', 'SILVER'),
    ('FM', 'Planner code, meaning to confirm (foreign material?)', 'PLANNER'),
    ('AP', 'Planner code, meaning to confirm', 'PLANNER')
ON CONFLICT (fail_reason_code) DO NOTHING;

-- Trait families: the silver domain (silver.line_schedule_item.trait_family_code CHECK) + planner-only values.
INSERT INTO gold.trait_family (trait_family_code, description, origin) VALUES
    ('EXCELIS', 'Excelis', 'SILVER'),
    ('GMO', 'GMO', 'SILVER'),
    ('FRESH', 'Fresh', 'SILVER'),
    ('NONE', 'No trait family on the schedule', 'SILVER'),
    ('CERTIFIED_NON_GMO', 'Planner value, to confirm (not in the Pasco schedules; closest silver value NONE)', 'PLANNER')
ON CONFLICT (trait_family_code) DO NOTHING;

-- Calendar (HARVEST season): Line 1 and Line 2 work Monday–Saturday, all day.
INSERT INTO gold.work_center_calendar (work_center_id, iso_weekday, start_time, end_time, season)
SELECT wc.work_center_id, d, '00:00', '24:00', 'HARVEST'
FROM silver.work_center wc CROSS JOIN generate_series(1, 6) d
WHERE wc.work_center_code IN ('LSVLN1', 'LSVLN2')
ON CONFLICT (work_center_id, iso_weekday, season) DO NOTHING;

-- Sequencing rules (cleanout length = the line's SPECIES_CHANGE hours in gold.changeover_rule).
INSERT INTO gold.sequence_rule (rule_code, rule_type, transition_code, from_trait_family_code, to_trait_family_code, notes) VALUES
    ('SPECIES_CHANGE', 'CLEANOUT', 'SPECIES_CHANGE', NULL, NULL, 'Full cleanout when the species changes'),
    ('BEFORE_EXCELIS', 'CLEANOUT', NULL, NULL, 'EXCELIS', 'Full cleanout before an Excelis batch'),
    ('AFTER_GMO', 'CLEANOUT', NULL, 'GMO', NULL, 'Full cleanout after a GMO batch'),
    ('GMO_TO_CERTIFIED_NON_GMO', 'FORBIDDEN', NULL, 'GMO', 'CERTIFIED_NON_GMO',
        'A certified non-GMO batch may not follow a GMO batch')
ON CONFLICT (rule_code) DO NOTHING;

-- Repair routes (fail reason -> rework work center). Unmapped reasons (COB, OFF_TYPE, …) stay unknown to the planner.
INSERT INTO gold.repair_route (fail_reason_code, route_work_center_id, notes)
SELECT r.code, wc.work_center_id, r.notes
FROM (VALUES ('DENT', 'LSVCLSRT', 'Colorsort'), ('DISCOLORED', 'LSVCLSRT', 'Colorsort'),
             ('FM', 'LSVGRVTY', 'Gravity'), ('AP', 'LSVGRVTY', 'Gravity')) r (code, wc_code, notes)
JOIN silver.work_center wc ON wc.work_center_code = r.wc_code
ON CONFLICT (fail_reason_code) DO NOTHING;

-- Season and the generated planner_rules JSON (shape agreed with the planner team; repairRoutes values are line types,
-- repairRouteWorkCenters gives the work-center codes; timeZone = gold.config plant_time_zone, single source).
INSERT INTO gold.config (config_key, value, description) VALUES
    ('season', 'HARVEST', 'Planner season (planner v2); selects gold.work_center_calendar rows')
ON CONFLICT (config_key) DO NOTHING;

INSERT INTO gold.config (config_key, value, description)
SELECT 'planner_rules',
       jsonb_build_object(
           'season', gold.cfg('season'),
           'timeZone', gold.cfg('plant_time_zone'),
           'calendar', (SELECT jsonb_object_agg(c.work_center_code, jsonb_build_object(
                               'weekdays', c.weekdays, 'start', c.start_time, 'end', c.end_time))
                        FROM (SELECT wc.work_center_code, jsonb_agg(cal.iso_weekday ORDER BY cal.iso_weekday) AS weekdays,
                                     to_char(min(cal.start_time), 'HH24:MI') AS start_time, max(cal.end_time) AS end_time
                              FROM gold.work_center_calendar cal JOIN silver.work_center wc USING (work_center_id)
                              WHERE cal.season = gold.cfg('season')
                              GROUP BY wc.work_center_code) c),
           'cleanoutTriggers', (SELECT jsonb_agg(rule_code ORDER BY sequence_rule_id)
                                FROM gold.sequence_rule WHERE rule_type = 'CLEANOUT'),
           'forbiddenSequence', (SELECT jsonb_build_object('from', from_trait_family_code, 'to', to_trait_family_code)
                                 FROM gold.sequence_rule WHERE rule_type = 'FORBIDDEN'
                                 ORDER BY sequence_rule_id LIMIT 1),
           'repairRoutes', (SELECT jsonb_object_agg(rr.fail_reason_code, wc.line_type)
                            FROM gold.repair_route rr JOIN silver.work_center wc ON wc.work_center_id = rr.route_work_center_id),
           'repairRouteWorkCenters', (SELECT jsonb_object_agg(rr.fail_reason_code, wc.work_center_code)
                                      FROM gold.repair_route rr
                                      JOIN silver.work_center wc ON wc.work_center_id = rr.route_work_center_id)
       )::text,
       'Planner v2 rules for the semantic planner (gold.cfg(''planner_rules'')). GENERATED from gold.work_center_calendar, gold.sequence_rule, gold.repair_route by seeds/gold_planner_reference.sql: edit the tables, not this row'
ON CONFLICT (config_key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description;
