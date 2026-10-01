-- Heuristic v1 (uc1-data-model §7.1): a transparent ranking, not a solver. Every replan writes an immutable
-- gold.schedule_plan (version + 1) with entries and machine reasons.
--
-- Ranking of runnable batches (greedy, one pick at a time, clock advancing with each pick):
--   1. ONLINE first (already running).
--   2. Rush (SAP-style priority change that raised urgency).
--   3. Urgent = would finish after its due date even if started now -> earliest due first.
--   4. Priority rank (1 = highest).
--   5. Changeover: same variety as the previous batch, then same species.
--   6. Due date, run order, PO number (stable tie-breaks).
-- Held batches (QA FAIL, ON_HOLD, LAB) go after the planned ones, without planned times.

-- Accepts a BFF lineId ('line-1') or a work-center code ('LSVLN1').
CREATE FUNCTION gold.resolve_line(p_line text) RETURNS silver.work_center
LANGUAGE plpgsql STABLE AS $$
DECLARE
    v silver.work_center;
BEGIN
    SELECT * INTO v FROM silver.work_center
    WHERE demo_line_id = p_line OR work_center_code = upper(btrim(p_line))
    ORDER BY (demo_line_id = p_line) DESC NULLS LAST
    LIMIT 1;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Unknown line %', p_line USING ERRCODE = 'no_data_found';
    END IF;
    RETURN v;
END
$$;

-- Input kg per run hour for a work center and species (species median when well observed, else work-center median).
CREATE FUNCTION gold.est_kg_per_h(p_work_center_id bigint, p_species_code text) RETURNS numeric
LANGUAGE sql STABLE AS $$
    SELECT coalesce(
        (SELECT t.median_kg_per_h FROM gold.v_throughput t
         WHERE t.work_center_id = p_work_center_id AND t.grain = 'SPECIES' AND t.species_code = p_species_code
           AND t.n_runs >= gold.cfg('min_species_runs')::int),
        (SELECT t.median_kg_per_h FROM gold.v_throughput t
         WHERE t.work_center_id = p_work_center_id AND t.grain = 'WORK_CENTER'))
$$;

CREATE FUNCTION gold.changeover_hours(p_work_center_id bigint, p_transition_code text) RETURNS numeric
LANGUAGE sql STABLE AS $$
    SELECT coalesce(
        (SELECT r.hours FROM gold.changeover_rule r
         WHERE r.work_center_id = p_work_center_id AND r.transition_code = p_transition_code
         ORDER BY (r.rule_source = 'SME') DESC LIMIT 1), 0)
$$;

CREATE FUNCTION gold.add_reason(p_schedule_entry_id bigint, p_seq int, p_reason_code text, p_params jsonb)
RETURNS void
LANGUAGE sql AS $$
    INSERT INTO gold.entry_reason (schedule_entry_id, seq, reason_code_id, params)
    SELECT p_schedule_entry_id, p_seq, rc.reason_code_id, jsonb_strip_nulls(p_params)
    FROM gold.reason_code rc WHERE rc.reason_code = p_reason_code
$$;

CREATE FUNCTION gold.replan(p_line text, p_plan_event_id bigint DEFAULT NULL) RETURNS bigint
LANGUAGE plpgsql AS $$
DECLARE
    v_wc        silver.work_center;
    v_parent    gold.schedule_plan;
    v_event     gold.plan_event;
    v_event_po  text;
    v_plan_id   bigint;
    v_tz        text := gold.cfg('plant_time_zone');
    v_clock     timestamptz := gold.cfg('plan_start_at')::timestamptz;
    v_pos       int := 0;
    v_last_species text;
    v_last_variety text;
    v_last_po   text;
    c           record;
    v_trans     text;
    v_co_h      numeric;
    v_run_h     numeric;
    v_start     timestamptz;
    v_end       timestamptz;
    v_slack     int;
    v_urgent    boolean;
    v_prev_pos  int;
    v_entry_id  bigint;
    v_seq       int;
BEGIN
    v_wc := gold.resolve_line(p_line);
    PERFORM pg_advisory_xact_lock(hashtext('gold.replan'), v_wc.work_center_id::int);

    SELECT * INTO v_parent FROM gold.schedule_plan
    WHERE work_center_id = v_wc.work_center_id ORDER BY plan_version DESC LIMIT 1;

    IF p_plan_event_id IS NOT NULL THEN
        SELECT * INTO v_event FROM gold.plan_event WHERE plan_event_id = p_plan_event_id;
        SELECT po_number INTO v_event_po FROM silver.process_order WHERE process_order_id = v_event.process_order_id;
    END IF;

    UPDATE gold.schedule_plan SET status = 'SUPERSEDED'
    WHERE work_center_id = v_wc.work_center_id AND status <> 'SUPERSEDED';

    INSERT INTO gold.schedule_plan
        (work_center_id, plan_version, parent_plan_id, status, plan_event_id, horizon_start, created_by)
    VALUES (v_wc.work_center_id, coalesce(v_parent.plan_version, 0) + 1, v_parent.schedule_plan_id, 'PROPOSED',
            p_plan_event_id, v_clock, gold.cfg('heuristic_version'))
    RETURNING schedule_plan_id INTO v_plan_id;

    DROP TABLE IF EXISTS _cand;
    CREATE TEMP TABLE _cand ON COMMIT DROP AS
    SELECT q.*, NULL::int AS new_pos, gold.est_kg_per_h(q.work_center_id, q.species_code) AS kg_per_h
    FROM gold.v_open_queue q
    WHERE q.work_center_id = v_wc.work_center_id;

    -- Runnable batches, greedy
    LOOP
        SELECT * INTO c FROM _cand
        WHERE new_pos IS NULL AND NOT is_hold
        ORDER BY (status_code = 'ONLINE') DESC,
                 is_rush DESC,
                 (due_date < ((v_clock + coalesce(input_kg / nullif(kg_per_h, 0), 0) * interval '1 hour')
                              AT TIME ZONE v_tz)::date) DESC NULLS LAST,
                 CASE WHEN due_date < ((v_clock + coalesce(input_kg / nullif(kg_per_h, 0), 0) * interval '1 hour')
                                       AT TIME ZONE v_tz)::date THEN due_date END ASC NULLS LAST,
                 priority_rank ASC NULLS LAST,
                 (species_code = v_last_species AND variety_code = v_last_variety) DESC NULLS LAST,
                 (species_code = v_last_species) DESC NULLS LAST,
                 due_date ASC NULLS LAST,
                 run_order ASC NULLS LAST,
                 po_number
        LIMIT 1;
        EXIT WHEN NOT FOUND;

        v_urgent := c.due_date < ((v_clock + coalesce(c.input_kg / nullif(c.kg_per_h, 0), 0) * interval '1 hour')
                                  AT TIME ZONE v_tz)::date;
        v_trans := CASE
            WHEN v_last_po IS NULL THEN NULL
            WHEN c.species_code = v_last_species AND c.variety_code = v_last_variety THEN 'SAME_VARIETY'
            WHEN c.species_code = v_last_species THEN 'SAME_SPECIES'
            ELSE 'SPECIES_CHANGE'
        END;
        v_co_h  := CASE WHEN v_trans IS NULL OR c.status_code = 'ONLINE' THEN 0
                        ELSE gold.changeover_hours(v_wc.work_center_id, v_trans) END;
        v_run_h := round(coalesce(c.input_kg / nullif(c.kg_per_h, 0), 0), 2);
        v_start := v_clock + v_co_h * interval '1 hour';
        v_end   := v_start + v_run_h * interval '1 hour';
        v_clock := v_end;
        v_slack := c.due_date - (v_end AT TIME ZONE v_tz)::date;
        v_pos   := v_pos + 1;

        UPDATE _cand SET new_pos = v_pos WHERE line_schedule_item_id = c.line_schedule_item_id;

        SELECT se.position INTO v_prev_pos FROM gold.schedule_entry se
        WHERE se.schedule_plan_id = v_parent.schedule_plan_id AND se.process_order_id = c.process_order_id;

        INSERT INTO gold.schedule_entry
            (schedule_plan_id, position, process_order_id, line_schedule_item_id, entry_status, planned_start_at,
             planned_end_at, est_run_h, est_changeover_h, due_date, slack_days, is_at_risk, previous_position)
        VALUES (v_plan_id, v_pos, c.process_order_id, c.line_schedule_item_id, 'PLANNED', v_start, v_end,
                v_run_h, v_co_h, c.due_date, v_slack, coalesce(v_slack < 0, false), v_prev_pos)
        RETURNING schedule_entry_id INTO v_entry_id;

        -- Reasons, most important first (seq 1 = reasonShort)
        v_seq := 0;
        IF c.status_code = 'ONLINE' THEN
            v_seq := v_seq + 1;
            PERFORM gold.add_reason(v_entry_id, v_seq, 'ALREADY_RUNNING',
                jsonb_build_object('work_center_code', v_wc.work_center_code, 'status_code', c.status_code));
        END IF;
        IF c.is_rush THEN
            v_seq := v_seq + 1;
            PERFORM gold.add_reason(v_entry_id, v_seq, 'RUSH_PRIORITY',
                jsonb_build_object('priority_rank', c.priority_rank, 'previous_priority', c.schedule_priority_rank,
                                   'source', CASE WHEN c.priority_source = 'INGEST' THEN 'sap_priority_change' ELSE 'schedule' END,
                                   'ingest_event_id', c.priority_ingest_event_id));
        END IF;
        IF p_plan_event_id IS NOT NULL AND v_prev_pos IS DISTINCT FROM v_pos AND v_prev_pos IS NOT NULL
           AND c.po_number IS DISTINCT FROM v_event_po THEN
            v_seq := v_seq + 1;
            PERFORM gold.add_reason(v_entry_id, v_seq, 'RESEQUENCED',
                jsonb_build_object('from_position', v_prev_pos, 'to_position', v_pos,
                                   'event_type', v_event.event_type, 'event_po', v_event_po));
        END IF;
        IF v_slack < 0 THEN
            v_seq := v_seq + 1;
            PERFORM gold.add_reason(v_entry_id, v_seq, 'DUE_DATE_RISK',
                jsonb_build_object('due_date', c.due_date, 'planned_end_date', (v_end AT TIME ZONE v_tz)::date,
                                   'slack_days', v_slack, 'scheduled_finish_date', c.scheduled_finish_date,
                                   'need_by_date', c.need_by_date));
        ELSIF v_urgent THEN
            v_seq := v_seq + 1;
            PERFORM gold.add_reason(v_entry_id, v_seq, 'EARLIEST_DUE', jsonb_build_object('due_date', c.due_date));
        END IF;
        IF c.priority_rank IS NOT NULL AND NOT c.is_rush THEN
            v_seq := v_seq + 1;
            PERFORM gold.add_reason(v_entry_id, v_seq, 'PRIORITY',
                jsonb_build_object('priority_rank', c.priority_rank, 'priority_source', c.priority_source));
        END IF;
        IF v_trans = 'SAME_VARIETY' THEN
            v_seq := v_seq + 1;
            PERFORM gold.add_reason(v_entry_id, v_seq, 'SAME_VARIETY_GROUP',
                jsonb_build_object('variety_code', c.variety_code, 'previous_po', v_last_po,
                                   'saved_h', greatest(gold.changeover_hours(v_wc.work_center_id, 'SAME_SPECIES')
                                                       - gold.changeover_hours(v_wc.work_center_id, 'SAME_VARIETY'), 0)));
        ELSIF v_trans = 'SAME_SPECIES' THEN
            v_seq := v_seq + 1;
            PERFORM gold.add_reason(v_entry_id, v_seq, 'SAME_SPECIES_GROUP',
                jsonb_build_object('species_code', c.species_code, 'previous_po', v_last_po));
        END IF;
        IF c.order_numbers IS NOT NULL THEN
            v_seq := v_seq + 1;
            PERFORM gold.add_reason(v_entry_id, v_seq, 'CUSTOMER_DEMAND',
                jsonb_build_object('order_number', c.order_numbers[1], 'order_numbers', to_jsonb(c.order_numbers),
                                   'need_by_date', c.need_by_date, 'priority_tier', c.priority_tier,
                                   'is_synthetic', true));
        END IF;
        IF v_co_h > 0 THEN
            v_seq := v_seq + 1;
            PERFORM gold.add_reason(v_entry_id, v_seq, 'CHANGEOVER',
                jsonb_build_object('transition_code', v_trans, 'hours', v_co_h, 'from_po', v_last_po));
        END IF;

        v_last_species := c.species_code;
        v_last_variety := c.variety_code;
        v_last_po      := c.po_number;
    END LOOP;

    -- Held batches
    FOR c IN SELECT * FROM _cand WHERE is_hold ORDER BY priority_rank NULLS LAST, due_date NULLS LAST, po_number LOOP
        v_pos := v_pos + 1;
        SELECT se.position INTO v_prev_pos FROM gold.schedule_entry se
        WHERE se.schedule_plan_id = v_parent.schedule_plan_id AND se.process_order_id = c.process_order_id;

        INSERT INTO gold.schedule_entry
            (schedule_plan_id, position, process_order_id, line_schedule_item_id, entry_status, due_date, previous_position)
        VALUES (v_plan_id, v_pos, c.process_order_id, c.line_schedule_item_id, 'HOLD', c.due_date, v_prev_pos)
        RETURNING schedule_entry_id INTO v_entry_id;

        IF c.quality_status = 'FAIL' THEN
            PERFORM gold.add_reason(v_entry_id, 1, 'QA_HOLD',
                jsonb_build_object('quality_test_id', c.latest_fail_test_id, 'fail_reason', c.latest_fail_reason,
                                   'source', 'pass_fail_log'));
        ELSE
            PERFORM gold.add_reason(v_entry_id, 1, 'STATUS_HOLD', jsonb_build_object('status_code', c.status_code));
        END IF;
    END LOOP;

    RETURN v_plan_id;
END
$$;
COMMENT ON FUNCTION gold.replan(text, bigint) IS 'Heuristic v1 replan for one line; inserts schedule_plan v+1 with entries and reasons; returns schedule_plan_id';
