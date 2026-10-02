-- =====================================================================================================================
-- UC1 planner v2 — what gold now provides for the semantic planner (handoff queries)
-- =====================================================================================================================
-- For: the planner team (Agent API) · Database: greenbyte (dev RDS) · Built: 2026-10-02
-- Design and decisions: backend/database/etl/gold-model/gold-data-model.md §7, WORKING-PLAN.md §6
--
-- How to run:  psql -X -f backend/database/queries/uc1_planner_v2_handoff.sql      (or run section by section)
-- Sections 1–4 are read-only. Section 5 runs the full planner path inside BEGIN … ROLLBACK: nothing is kept.
--
-- Your ask -> what was built
--   1. config row 'planner_rules'      -> gold.cfg('planner_rules') returns your JSON (same keys + repairRouteWorkCenters).
--                                         It is GENERATED from typed tables (calendar, sequence rules, repair routes);
--                                         timeZone = the existing plant_time_zone.
--   2. policy version 2                -> inserted ACTIVE with engine = 'PLANNER'. Policy v1 is NOT retired: it stays
--                                         ACTIVE with engine = 'HEURISTIC' because the heuristic sorts by it (retiring
--                                         it would break every rush / QA replan). basis stored as ASSUMPTION until
--                                         Syngenta confirms SQ-02 / SQ-04 (you sent CONFIRMED).
--   3. branch in gold.replan           -> same signature replan(p_line, p_plan_event_id). Differences from the note:
--      * use a NEW event with event_type = 'planner_run' (not the ingest event: ingest already has a heuristic plan,
--        so "return the existing plan" would hide yours). Link it to the event it answers via parent_plan_event_id.
--      * entries are stored as sent; three guards, any failure rejects the whole plan:
--          (1) lineScheduleItemId belongs to processOrderId
--          (2) the row is on the plan's line, OR the PO has an active LINE_SWAP to this line (in this payload or earlier)
--          (3) PLANNED: plannedStartAt <= plannedEndAt; HOLD: both null
--      * reasons go through gold.add_reason (existing codes + their required params), factIds are linked.
--      * entries get due_date_basis = 'SAP_FINISH' (send "dueDateBasis" to override).
--      * payload is stored unchanged; overrides / downtime / proposals are ALSO copied into typed tables
--        (gold.plan_override, gold.line_downtime, gold.repair_proposal). impact is read from the payload by
--        gold.v_plan_impact next to the numbers derived from the entries.
--      * a planner_run WITHOUT entries runs the heuristic, which respects active overrides
--        (LINE_SWAP away = not planned on the old line, FORCE_HOLD = HOLD, PIN_POSITION = that position).
--   event_response / agent_context: unchanged.
--
-- Open questions for you (loaded as assumptions meanwhile): FM / AP meaning; CERTIFIED_NON_GMO vs trait NONE;
-- COB (most frequent fail) has no route — intended?; SPECIES_GROUP = same variety then same species?;
-- does an override end at a date or only with active = false?
-- =====================================================================================================================


-- ---------------------------------------------------------------------------------------------- 1. planner_rules
SELECT jsonb_pretty(gold.cfg('planner_rules')::jsonb) AS planner_rules;

-- The typed tables the JSON is generated from
SELECT wc.work_center_code, cal.season, array_agg(cal.iso_weekday ORDER BY cal.iso_weekday) AS iso_weekdays,
       min(cal.start_time) AS start_time, max(cal.end_time) AS end_time
FROM gold.work_center_calendar cal JOIN silver.work_center wc USING (work_center_id)
GROUP BY wc.work_center_code, cal.season ORDER BY 1;

SELECT rule_code, rule_type, transition_code, from_trait_family_code, to_trait_family_code, basis, notes
FROM gold.sequence_rule ORDER BY sequence_rule_id;

SELECT rr.fail_reason_code, fr.origin, fr.description, wc.work_center_code AS route_work_center, wc.line_type AS route
FROM gold.repair_route rr
JOIN gold.fail_reason fr USING (fail_reason_code)
JOIN silver.work_center wc ON wc.work_center_id = rr.route_work_center_id
ORDER BY 1;

-- Codes gold accepts (origin SILVER = in the Pasco extract; PLANNER = yours, to confirm)
SELECT 'fail_reason' AS domain, fail_reason_code AS code, origin, description FROM gold.fail_reason
UNION ALL
SELECT 'trait_family', trait_family_code, origin, description FROM gold.trait_family
ORDER BY 1, 3 DESC, 2;


-- ---------------------------------------------------------------------------------------------- 2. policies
SELECT policy_id, policy_version, engine, status, ranking_mode, jsonb_pretty(criteria) AS criteria, fact_min_confidence, notes
FROM gold.policy ORDER BY policy_version;

-- What each engine resolves to for the demo lines
SELECT wc.demo_line_id, wc.work_center_code,
       (gold.active_policy(wc.work_center_id, 'HEURISTIC')).policy_version AS heuristic_policy,
       (gold.active_policy(wc.work_center_id, 'PLANNER')).policy_version   AS planner_policy
FROM silver.work_center wc WHERE wc.demo_line_id IS NOT NULL ORDER BY 1;


-- ---------------------------------------------------------------------------------------------- 3. what replan reads
-- Open queue per line (your candidate rows): lineScheduleItemId, processOrderId, SAP finish (your due date),
-- holds and the override columns gold maintains.
SELECT q.demo_line_id, q.line_schedule_item_id AS "lineScheduleItemId", q.process_order_id AS "processOrderId",
       q.po_number, q.status_code, q.species_code, q.variety_code, q.trait_family_code, q.input_kg,
       q.priority_rank, q.sap_finish_date, q.due_date AS heuristic_due_date, q.due_date_basis AS heuristic_basis,
       q.is_hold, q.hold_reason, q.swapped_to_work_center_id, q.override_pinned_position
FROM gold.v_open_queue q
WHERE q.demo_line_id IS NOT NULL
ORDER BY q.demo_line_id, q.priority_rank NULLS LAST, q.po_number;

-- Reason codes you can send, with the params each one must carry
SELECT reason_code, category, param_keys, template FROM gold.reason_code ORDER BY category, reason_code;

-- Latest plan per line and who wrote it
SELECT wc.demo_line_id, ps.plan_version, ps.status, sp.created_by, p.engine AS policy_engine, pe.event_type,
       ps.is_accepted, ps.accepted_at
FROM gold.v_plan_status ps
JOIN gold.schedule_plan sp USING (schedule_plan_id)
JOIN silver.work_center wc ON wc.work_center_id = sp.work_center_id
LEFT JOIN gold.policy p ON p.policy_id = sp.policy_id
LEFT JOIN gold.plan_event pe ON pe.plan_event_id = sp.plan_event_id
WHERE ps.is_latest AND wc.demo_line_id IS NOT NULL ORDER BY 1;


-- ---------------------------------------------------------------------------------------------- 4. planner data so far
SELECT pe.plan_event_id, wc.demo_line_id, pe.parent_plan_event_id, pe.created_at, pe.created_by,
       jsonb_array_length(coalesce(pe.payload -> 'entries', '[]')) AS n_entries,
       sp.plan_version, sp.created_by AS plan_created_by
FROM gold.plan_event pe
JOIN silver.work_center wc USING (work_center_id)
LEFT JOIN gold.schedule_plan sp USING (plan_event_id)
WHERE pe.event_type = 'planner_run' ORDER BY pe.plan_event_id DESC;

SELECT * FROM gold.v_active_override ORDER BY process_order_id, override_type;
SELECT * FROM gold.line_downtime ORDER BY work_center_id, starts_at;
SELECT * FROM gold.repair_proposal ORDER BY repair_proposal_id DESC;
SELECT * FROM gold.v_plan_impact WHERE created_by = 'planner-v2' ORDER BY schedule_plan_id DESC;


-- ---------------------------------------------------------------------------------------------- 5. try it (rolled back)
-- The exact Data API sequence: INSERT a planner_run event with your payload -> gold.replan -> gold.event_response.
-- Here the entries are built from the current Line 1 plan (SAP finish as due date) plus one Line 2 batch swapped
-- onto Line 1, with a downtime window, a repair proposal and the LINE_SWAP override. Everything is rolled back.

BEGIN;

CREATE TEMP TABLE _demo ON COMMIT DROP AS
WITH l1 AS (SELECT schedule_plan_id FROM gold.v_latest_plan WHERE work_center_id = (gold.resolve_line('line-1')).work_center_id),
cur AS (
    SELECT se.*, po.sap_finish_date, po.po_number
    FROM gold.schedule_entry se JOIN l1 USING (schedule_plan_id) JOIN silver.process_order po USING (process_order_id)
),
np AS (SELECT count(*) FILTER (WHERE entry_status = 'PLANNED') AS n, max(planned_end_at) AS last_end FROM cur),
swap AS (
    SELECT q.* FROM gold.v_open_queue q
    WHERE q.demo_line_id = 'line-2' AND q.status_code <> 'ONLINE' AND NOT q.is_hold AND q.priority_rank IS NOT NULL
    ORDER BY q.po_number LIMIT 1
),
entries AS (
    SELECT jsonb_agg(e ORDER BY (e ->> 'position')::int) AS entries FROM (
        SELECT jsonb_build_object(
                   'lineScheduleItemId', c.line_schedule_item_id, 'processOrderId', c.process_order_id,
                   'position', CASE WHEN c.entry_status = 'HOLD' THEN c.position + 1 ELSE c.position END,
                   'entryStatus', c.entry_status, 'plannedStartAt', c.planned_start_at, 'plannedEndAt', c.planned_end_at,
                   'estRunH', c.est_run_h, 'estChangeoverH', c.est_changeover_h, 'dueDate', c.sap_finish_date,
                   'slackDays', c.sap_finish_date - (c.planned_end_at AT TIME ZONE gold.cfg('plant_time_zone'))::date,
                   'isAtRisk', coalesce(c.sap_finish_date < (c.planned_end_at AT TIME ZONE gold.cfg('plant_time_zone'))::date, false),
                   'previousPosition', c.position,
                   'reasons', (SELECT jsonb_agg(jsonb_build_object('seq', er.seq, 'code', rc.reason_code, 'params', er.params,
                                   'factIds', coalesce((SELECT jsonb_agg(f.semantic_fact_id) FROM gold.entry_reason_fact f
                                                        WHERE f.entry_reason_id = er.entry_reason_id), '[]')) ORDER BY er.seq)
                               FROM gold.entry_reason er JOIN gold.reason_code rc USING (reason_code_id)
                               WHERE er.schedule_entry_id = c.schedule_entry_id)) AS e
        FROM cur c
        UNION ALL
        SELECT jsonb_build_object(
                   'lineScheduleItemId', s.line_schedule_item_id, 'processOrderId', s.process_order_id,
                   'position', np.n + 1, 'entryStatus', 'PLANNED',
                   'plannedStartAt', np.last_end, 'plannedEndAt', np.last_end + interval '5 hours',
                   'estRunH', 5, 'estChangeoverH', 0, 'dueDate', s.sap_finish_date, 'isAtRisk', false,
                   'reasons', jsonb_build_array(jsonb_build_object('seq', 1, 'code', 'PRIORITY', 'params',
                       jsonb_build_object('priority_rank', s.priority_rank, 'priority_source', s.priority_source))))
        FROM swap s, np
    ) x
)
SELECT (SELECT po_number FROM swap) AS swap_po,
       jsonb_build_object(
           'entries', entries.entries,
           'impact', jsonb_build_object('newlyLate', '[]'::jsonb, 'weeklyLoad', '[]'::jsonb),
           'proposals', jsonb_build_array(jsonb_build_object('parentPo', '1002307552', 'route', 'COLORSORT', 'status', 'PROPOSED')),
           'downtime', jsonb_build_array(jsonb_build_object('lineId', 'line-2', 'startsAt', '2026-10-03T06:00:00-07:00',
                                                            'endsAt', '2026-10-03T18:00:00-07:00', 'reason', 'BREAKDOWN')),
           'overrides', jsonb_build_array(jsonb_build_object('po', (SELECT po_number FROM swap), 'type', 'LINE_SWAP',
                                                             'workCenterCode', 'LSVLN1', 'active', true))) AS payload
FROM entries;

-- (a) the Data API inserts the planner_run event (parent = the event it answers; NULL here)
CREATE TEMP TABLE _ev ON COMMIT DROP AS
WITH ins AS (
    INSERT INTO gold.plan_event (work_center_id, event_type, source, parent_plan_event_id, payload, created_by)
    SELECT (gold.resolve_line('line-1')).work_center_id, 'planner_run', 'ui_manual', NULL, d.payload, 'handoff-demo'
    FROM _demo d RETURNING plan_event_id
) SELECT plan_event_id FROM ins;

-- (b) replan stores your plan; (c) a second call with the same event returns the same plan id
SELECT gold.replan('line-1', plan_event_id) AS schedule_plan_id,
       gold.replan('line-1', plan_event_id) AS same_id_on_repeat
FROM _ev;

-- The stored plan: author, policy, your entries (the swapped Line 2 row included)
SELECT sp.plan_version, sp.created_by, p.policy_version, p.engine, se.position, po.po_number, wc.work_center_code AS row_line,
       se.entry_status, se.planned_end_at, se.due_date, se.due_date_basis, se.is_at_risk
FROM _ev JOIN gold.schedule_plan sp USING (plan_event_id)
JOIN gold.policy p USING (policy_id)
JOIN gold.schedule_entry se USING (schedule_plan_id)
JOIN silver.process_order po ON po.process_order_id = se.process_order_id
JOIN silver.line_schedule_item li ON li.line_schedule_item_id = se.line_schedule_item_id
JOIN silver.work_center wc ON wc.work_center_id = li.work_center_id
ORDER BY se.position;

-- Typed copies of the payload grains
SELECT 'override' AS kind, o.override_type AS detail, po.po_number, o.override_json AS as_sent
FROM _ev JOIN gold.plan_override o USING (plan_event_id) JOIN silver.process_order po USING (process_order_id)
UNION ALL
SELECT 'downtime', d.reason || ' ' || d.starts_at || ' → ' || d.ends_at, NULL, d.downtime_json
FROM _ev JOIN gold.line_downtime d USING (plan_event_id)
UNION ALL
SELECT 'proposal', r.fail_reason_code || ' → ' || w.work_center_code || ' (test ' || coalesce(r.quality_test_id::text, '-') || ')',
       po.po_number, r.proposal_json
FROM _ev JOIN gold.repair_proposal r USING (plan_event_id)
JOIN silver.process_order po ON po.process_order_id = r.parent_process_order_id
JOIN silver.work_center w ON w.work_center_id = r.route_work_center_id;

-- Impact (derived from the entries, next to your claim) and the unchanged response JSON
SELECT i.n_planned, i.n_hold, i.n_at_risk, i.newly_late, i.late_on_changed_basis, i.n_moved, i.changeover_h,
       i.parent_changeover_h, i.planner_impact
FROM _ev JOIN gold.schedule_plan sp USING (plan_event_id) JOIN gold.v_plan_impact i USING (schedule_plan_id);

SELECT jsonb_pretty(gold.event_response(sp.schedule_plan_id)) AS event_response
FROM _ev JOIN gold.schedule_plan sp USING (plan_event_id);

-- The heuristic on Line 2 now leaves the swapped batch out
SELECT d.swap_po, EXISTS (SELECT 1 FROM gold.schedule_entry se JOIN silver.process_order po USING (process_order_id)
                          WHERE se.schedule_plan_id = gold.replan('line-2') AND po.po_number = d.swap_po) AS still_on_line_2
FROM _demo d;

ROLLBACK;   -- nothing above is kept


-- ---------------------------------------------------------------------------------------------- 6. guard errors
-- What a rejected plan looks like (each raises invalid_parameter_value and saves nothing):
--   planner entries[0] (lineScheduleItemId 4021): schedule row 4021 is on another line and the PO has no active LINE_SWAP to LSVLN1
--   planner entries[2] (lineScheduleItemId 3990): schedule row 3990 belongs to process order 1204, not 1301
--   planner entries[5] (lineScheduleItemId 3995): PLANNED needs plannedStartAt <= plannedEndAt; HOLD has no times
--   planner entries[1] (…): Reason PRIORITY needs params {priority_rank,priority_source} (got {…})
--   payload.entries is only accepted on planner_run events (event 41 is rush)
