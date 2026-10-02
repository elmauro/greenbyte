-- Planner v2 storyline (etl/gold-model/gold-data-model.md §7). Run by `etl/build_model.py --scenario` after
-- demo_scenario.sql, inside the same ROLLED BACK transaction. Covers: planner_run plan stored as sent (with a line
-- swap from Line 2), typed overrides / downtime / repair proposal, idempotency, the three guards (whole plan
-- rejected), heuristic respecting LINE_SWAP / FORCE_HOLD / PIN_POSITION, and reset.

DO $$
DECLARE
    v_tz        text := gold.cfg('plant_time_zone');
    v_l1        bigint := (SELECT work_center_id FROM silver.work_center WHERE work_center_code = 'LSVLN1');
    v_l2        bigint := (SELECT work_center_id FROM silver.work_center WHERE work_center_code = 'LSVLN2');
    v_qa_event  bigint;
    v_heur      bigint;
    v_swap      record;
    v_other     record;
    v_online    record;
    v_a         record;
    v_b         record;
    v_entries   jsonb;
    v_payload   jsonb;
    v_ev        bigint;
    v_plan      bigint;
    v_n_plans   int;
    v_n_heur    int;
    v_plan2     bigint;
BEGIN
    PERFORM gold.reset_demo('line-1');
    PERFORM gold.reset_demo('line-2');

    -- The QA fail lands (heuristic plan, as today)
    PERFORM gold.ingest_pass_fail('line-1', '1002307552', 'Fail', 'Dent', 'Line 1');
    SELECT schedule_plan_id, plan_event_id INTO v_heur, v_qa_event FROM gold.v_latest_plan WHERE work_center_id = v_l1;
    SELECT count(*) INTO v_n_heur FROM gold.schedule_entry WHERE schedule_plan_id = v_heur;

    -- A Line 2 batch the planner swaps onto Line 1, and another one it does not
    SELECT q.* INTO v_swap FROM gold.v_open_queue q
    WHERE q.work_center_id = v_l2 AND q.status_code <> 'ONLINE' AND NOT q.is_hold AND q.priority_rank IS NOT NULL
    ORDER BY q.po_number LIMIT 1;
    SELECT q.* INTO v_other FROM gold.v_open_queue q
    WHERE q.work_center_id = v_l2 AND q.status_code <> 'ONLINE' AND q.po_number <> v_swap.po_number
    ORDER BY q.po_number LIMIT 1;

    -- Planner entries: the heuristic order, the swapped batch after the last planned one, holds after it.
    -- due_date = SAP finish (the planner's commitment), reasons copied with their fact ids.
    WITH h AS (
        SELECT se.*, po.sap_finish_date FROM gold.schedule_entry se
        JOIN silver.process_order po USING (process_order_id) WHERE se.schedule_plan_id = v_heur
    ), np AS (SELECT count(*) FILTER (WHERE entry_status = 'PLANNED') AS n, max(planned_end_at) AS last_end FROM h)
    SELECT jsonb_agg(x.e ORDER BY (x.e ->> 'position')::int) INTO v_entries
    FROM (
        SELECT jsonb_build_object(
                   'lineScheduleItemId', h.line_schedule_item_id, 'processOrderId', h.process_order_id,
                   'position', CASE WHEN h.entry_status = 'HOLD' THEN h.position + 1 ELSE h.position END,
                   'entryStatus', h.entry_status, 'plannedStartAt', h.planned_start_at, 'plannedEndAt', h.planned_end_at,
                   'estRunH', h.est_run_h, 'estChangeoverH', h.est_changeover_h, 'dueDate', h.sap_finish_date,
                   'slackDays', h.sap_finish_date - (h.planned_end_at AT TIME ZONE v_tz)::date,
                   'isAtRisk', coalesce(h.sap_finish_date < (h.planned_end_at AT TIME ZONE v_tz)::date, false),
                   'previousPosition', h.position,
                   'reasons', (SELECT jsonb_agg(jsonb_build_object(
                                   'seq', er.seq, 'code', rc.reason_code, 'params', er.params,
                                   'factIds', coalesce((SELECT jsonb_agg(f.semantic_fact_id) FROM gold.entry_reason_fact f
                                                        WHERE f.entry_reason_id = er.entry_reason_id), '[]'))
                                   ORDER BY er.seq)
                               FROM gold.entry_reason er JOIN gold.reason_code rc USING (reason_code_id)
                               WHERE er.schedule_entry_id = h.schedule_entry_id)) AS e
        FROM h
        UNION ALL
        SELECT jsonb_build_object(
                   'lineScheduleItemId', v_swap.line_schedule_item_id, 'processOrderId', v_swap.process_order_id,
                   'position', np.n + 1, 'entryStatus', 'PLANNED',
                   'plannedStartAt', np.last_end, 'plannedEndAt', np.last_end + interval '5 hours',
                   'estRunH', 5, 'estChangeoverH', 0, 'dueDate', v_swap.sap_finish_date,
                   'slackDays', v_swap.sap_finish_date - ((np.last_end + interval '5 hours') AT TIME ZONE v_tz)::date,
                   'isAtRisk', coalesce(v_swap.sap_finish_date < ((np.last_end + interval '5 hours') AT TIME ZONE v_tz)::date, false),
                   'reasons', jsonb_build_array(jsonb_build_object('seq', 1, 'code', 'PRIORITY', 'params',
                       jsonb_build_object('priority_rank', v_swap.priority_rank, 'priority_source', v_swap.priority_source),
                       'factIds', '[]'::jsonb)))
        FROM np
    ) x;

    v_payload := jsonb_build_object(
        'entries', v_entries,
        'impact', jsonb_build_object('newlyLate', jsonb_build_array('1002307551'), 'weeklyLoad', '[]'::jsonb),
        'proposals', jsonb_build_array(jsonb_build_object('parentPo', '1002307552', 'route', 'COLORSORT', 'status', 'PROPOSED')),
        'downtime', jsonb_build_array(jsonb_build_object('lineId', 'line-2', 'startsAt', '2026-10-03T06:00:00-07:00',
                                                         'endsAt', '2026-10-03T18:00:00-07:00', 'reason', 'BREAKDOWN')),
        'overrides', jsonb_build_array(jsonb_build_object('po', v_swap.po_number, 'type', 'LINE_SWAP',
                                                          'workCenterCode', 'LSVLN1', 'active', true)));

    -- Data API path (Q8a): insert the planner_run event, then replan, same transaction
    INSERT INTO gold.plan_event (work_center_id, event_type, source, parent_plan_event_id, payload, created_by)
    VALUES (v_l1, 'planner_run', 'ui_manual', v_qa_event, v_payload, 'scenario') RETURNING plan_event_id INTO v_ev;
    v_plan := gold.replan('line-1', v_ev);

    ASSERT (SELECT created_by FROM gold.schedule_plan WHERE schedule_plan_id = v_plan) = 'planner-v2', 'planner plan created_by';
    ASSERT (SELECT p.engine FROM gold.schedule_plan sp JOIN gold.policy p USING (policy_id)
            WHERE sp.schedule_plan_id = v_plan) = 'PLANNER', 'planner plan cites the PLANNER policy';
    ASSERT (SELECT count(*) FROM gold.schedule_entry WHERE schedule_plan_id = v_plan) = v_n_heur + 1, 'entries stored as sent';
    ASSERT (SELECT count(*) FROM gold.schedule_entry WHERE schedule_plan_id = v_plan
            AND line_schedule_item_id = v_swap.line_schedule_item_id) = 1, 'swapped Line 2 row is on the Line 1 plan';
    ASSERT NOT EXISTS (SELECT 1 FROM gold.schedule_entry WHERE schedule_plan_id = v_plan
                       AND due_date_basis IS DISTINCT FROM 'SAP_FINISH'), 'planner entries default to SAP_FINISH';
    ASSERT (SELECT count(*) FROM gold.entry_reason_fact f JOIN gold.entry_reason er USING (entry_reason_id)
            JOIN gold.schedule_entry se USING (schedule_entry_id) WHERE se.schedule_plan_id = v_plan)
         = (SELECT count(*) FROM gold.entry_reason_fact f JOIN gold.entry_reason er USING (entry_reason_id)
            JOIN gold.schedule_entry se USING (schedule_entry_id) WHERE se.schedule_plan_id = v_heur), 'fact links kept';
    ASSERT (SELECT payload FROM gold.plan_event WHERE plan_event_id = v_ev) = v_payload, 'payload stored unchanged';
    ASSERT (SELECT count(*) FROM gold.plan_override WHERE plan_event_id = v_ev AND override_type = 'LINE_SWAP'
            AND from_work_center_id = v_l2 AND to_work_center_id = v_l1) = 1, 'typed LINE_SWAP override';
    ASSERT (SELECT count(*) FROM gold.line_downtime WHERE plan_event_id = v_ev AND work_center_id = v_l2) = 1, 'typed downtime';
    ASSERT (SELECT count(*) FROM gold.repair_proposal rp JOIN silver.quality_test qt USING (quality_test_id)
            JOIN silver.work_center w ON w.work_center_id = rp.route_work_center_id
            WHERE rp.plan_event_id = v_ev AND rp.fail_reason_code = 'DENT' AND qt.result_code = 'FAIL'
              AND w.work_center_code = 'LSVCLSRT') = 1, 'typed repair proposal on the failed test';
    ASSERT (SELECT planner_impact FROM gold.v_plan_impact WHERE schedule_plan_id = v_plan) = v_payload -> 'impact',
        'impact view shows the planner claim';
    ASSERT jsonb_array_length(gold.event_response(v_plan) -> 'queue') = v_n_heur + 1, 'event_response serves the planner plan';
    ASSERT gold.agent_context(v_plan) ->> 'planVersion' IS NOT NULL, 'agent_context serves the planner plan';

    -- Idempotent: same event again returns the saved plan
    SELECT count(*) INTO v_n_plans FROM gold.schedule_plan;
    ASSERT gold.replan('line-1', v_ev) = v_plan, 'repeat replan returns the same plan';
    ASSERT (SELECT count(*) FROM gold.schedule_plan) = v_n_plans, 'no extra plan';

    -- Heuristic on Line 2 respects the swap
    v_plan2 := gold.replan('line-2');
    ASSERT NOT EXISTS (SELECT 1 FROM gold.schedule_entry WHERE schedule_plan_id = v_plan2
                       AND process_order_id = v_swap.process_order_id), 'swapped PO left the Line 2 heuristic plan';
    ASSERT (SELECT due_date_basis FROM gold.schedule_entry WHERE schedule_plan_id = v_plan2 AND position = 1) IS NOT NULL,
        'heuristic entries carry due_date_basis';

    -- Guard 2: a Line 2 row without a swap rejects the whole plan (nothing saved)
    SELECT count(*) INTO v_n_plans FROM gold.schedule_plan;
    BEGIN
        INSERT INTO gold.plan_event (work_center_id, event_type, source, payload)
        VALUES (v_l1, 'planner_run', 'ui_manual', jsonb_build_object('entries', jsonb_build_array(jsonb_build_object(
            'lineScheduleItemId', v_other.line_schedule_item_id, 'position', 1, 'entryStatus', 'HOLD'))))
        RETURNING plan_event_id INTO v_ev;
        PERFORM gold.replan('line-1', v_ev);
        RAISE EXCEPTION 'guard 2 should reject';
    EXCEPTION WHEN invalid_parameter_value THEN NULL;
    END;
    ASSERT (SELECT count(*) FROM gold.schedule_plan) = v_n_plans, 'rejected plan not saved';

    -- Guard 1: schedule row of another PO; Guard 3: PLANNED without times
    SELECT q.* INTO v_online FROM gold.v_open_queue q WHERE q.work_center_id = v_l1 AND q.status_code = 'ONLINE';
    BEGIN
        INSERT INTO gold.plan_event (work_center_id, event_type, source, payload)
        VALUES (v_l1, 'planner_run', 'ui_manual', jsonb_build_object('entries', jsonb_build_array(jsonb_build_object(
            'lineScheduleItemId', v_online.line_schedule_item_id, 'processOrderId', v_swap.process_order_id,
            'position', 1, 'entryStatus', 'HOLD'))))
        RETURNING plan_event_id INTO v_ev;
        PERFORM gold.replan('line-1', v_ev);
        RAISE EXCEPTION 'guard 1 should reject';
    EXCEPTION WHEN invalid_parameter_value THEN NULL;
    END;
    BEGIN
        INSERT INTO gold.plan_event (work_center_id, event_type, source, payload)
        VALUES (v_l1, 'planner_run', 'ui_manual', jsonb_build_object('entries', jsonb_build_array(jsonb_build_object(
            'lineScheduleItemId', v_online.line_schedule_item_id, 'position', 1, 'entryStatus', 'PLANNED'))))
        RETURNING plan_event_id INTO v_ev;
        PERFORM gold.replan('line-1', v_ev);
        RAISE EXCEPTION 'guard 3 should reject';
    EXCEPTION WHEN invalid_parameter_value THEN NULL;
    END;

    -- entries are only accepted on planner_run events
    BEGIN
        INSERT INTO gold.plan_event (work_center_id, event_type, source, payload)
        VALUES (v_l1, 'manual_adjust', 'ui_manual', jsonb_build_object('entries', '[]'::jsonb))
        RETURNING plan_event_id INTO v_ev;
        PERFORM gold.replan('line-1', v_ev);
        RAISE EXCEPTION 'entries on a non-planner event should be rejected';
    EXCEPTION WHEN invalid_parameter_value THEN NULL;
    END;

    -- Overrides only (no entries): the heuristic plans, applying FORCE_HOLD and PIN_POSITION
    SELECT q.* INTO v_a FROM gold.v_open_queue q
    WHERE q.work_center_id = v_l1 AND q.status_code IN ('NEW', 'RELEASED') AND NOT q.is_hold ORDER BY q.po_number LIMIT 1;
    SELECT q.* INTO v_b FROM gold.v_open_queue q
    WHERE q.work_center_id = v_l1 AND q.status_code IN ('NEW', 'RELEASED') AND NOT q.is_hold AND q.po_number <> v_a.po_number
    ORDER BY q.po_number DESC LIMIT 1;
    INSERT INTO gold.plan_event (work_center_id, event_type, source, payload)
    VALUES (v_l1, 'planner_run', 'ui_manual', jsonb_build_object('overrides', jsonb_build_array(
        jsonb_build_object('po', v_a.po_number, 'type', 'FORCE_HOLD', 'reason', 'waiting for seed', 'active', true),
        jsonb_build_object('po', v_b.po_number, 'type', 'PIN_POSITION', 'position', 2, 'active', true))))
    RETURNING plan_event_id INTO v_ev;
    v_plan := gold.replan('line-1', v_ev);
    ASSERT (SELECT created_by FROM gold.schedule_plan WHERE schedule_plan_id = v_plan) = gold.cfg('heuristic_version'),
        'overrides-only planner_run runs the heuristic';
    ASSERT (SELECT q.po_number FROM gold.v_plan_queue q WHERE q.schedule_plan_id = v_plan AND q.position = 1) = v_online.po_number,
        'running batch stays first';
    ASSERT (SELECT q.position FROM gold.v_plan_queue q WHERE q.schedule_plan_id = v_plan AND q.po_number = v_b.po_number) = 2
           AND (SELECT count(*) FROM gold.v_plan_queue q WHERE q.schedule_plan_id = v_plan AND q.po_number = v_b.po_number
                AND q.reasons @> '[{"code": "OVERRIDE_PIN"}]') = 1, 'pinned batch at position 2 with OVERRIDE_PIN';
    ASSERT (SELECT count(*) FROM gold.v_plan_queue q WHERE q.schedule_plan_id = v_plan AND q.po_number = v_a.po_number
            AND q.entry_status = 'HOLD' AND q.reasons @> '[{"code": "OVERRIDE_HOLD"}]') = 1, 'forced hold with OVERRIDE_HOLD';

    -- Reset clears the line's planner events and their typed rows
    PERFORM gold.reset_demo('line-1');
    PERFORM gold.reset_demo('line-2');
    ASSERT NOT EXISTS (SELECT 1 FROM gold.plan_override) AND NOT EXISTS (SELECT 1 FROM gold.line_downtime)
           AND NOT EXISTS (SELECT 1 FROM gold.repair_proposal), 'reset removes planner rows';

    RAISE NOTICE 'planner scenario passed';
END
$$;
