-- Heuristic v1 (uc1-data-model §7.1): a transparent ranking, not a solver. Every replan writes an immutable
-- gold.schedule_plan (version + 1) with entries and machine reasons.
--
-- v4: the soft ranking comes from the active gold.policy (seeds/gold_policy.sql; policy v1 = the heuristic-v1 order
-- below) and is recorded in schedule_plan.policy_id. Hard rules stay here: ONLINE first, held batches out.
-- Ranking of runnable batches (greedy, one pick at a time, clock advancing with each pick), policy v1:
--   1. ONLINE first (already running).                                    ONLINE_FIRST (always, hard rule)
--   2. Rush (SAP-style priority change, RUSH priority text, trusted RUSH note).   RUSH
--   3. Urgent = would finish after its due date even if started now -> earliest due first.   URGENT_DUE
--   4. Priority rank (1 = highest).                                       PRIORITY
--   5. Changeover: same variety as the previous batch, then same species. SAME_VARIETY, SAME_SPECIES
--   6. Due date, run order (stable tie-breaks), then PO number (always last).   DUE_DATE, RUN_ORDER
-- Held batches (QA FAIL, ON_HOLD, LAB, trusted NOT_READY / HOLD note unless ONLINE) go after the planned ones,
-- without planned times.
--
-- planner v2 (etl/gold-model/gold-data-model.md §7, decisions Q1–Q9):
--   * One plan per event: calling replan again for an event that already has a plan returns that plan.
--   * planner_run events: payload.overrides / downtime / proposals are stored typed (gold.plan_override,
--     gold.line_downtime, gold.repair_proposal; each element kept as JSON). The payload itself is never changed.
--   * payload.entries present (planner_run only): the planner's order is stored as sent (created_by 'planner-v2',
--     the ACTIVE PLANNER policy). Guards: schedule row belongs to the PO; row on this line or the PO has an active
--     LINE_SWAP to it; PLANNED has start <= end, HOLD has no times. Any failure rejects the whole plan.
--   * Otherwise the heuristic runs, and respects active overrides: LINE_SWAP away = not planned here, FORCE_HOLD =
--     HOLD (OVERRIDE_HOLD), PIN_POSITION = placed at that position (OVERRIDE_PIN; the running batch stays first).

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

-- v4: validates the code and its required params (reason_code.param_keys, G-21) and links the supporting facts.
CREATE FUNCTION gold.add_reason(p_schedule_entry_id bigint, p_seq int, p_reason_code text, p_params jsonb,
                                p_fact_ids bigint[] DEFAULT NULL)
RETURNS bigint
LANGUAGE plpgsql AS $$
DECLARE
    v_rc     gold.reason_code;
    v_params jsonb := jsonb_strip_nulls(coalesce(p_params, '{}'));
    v_id     bigint;
BEGIN
    SELECT * INTO v_rc FROM gold.reason_code WHERE reason_code = p_reason_code;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Unknown reason code %', p_reason_code USING ERRCODE = 'invalid_parameter_value';
    END IF;
    IF NOT (v_params ?& v_rc.param_keys) THEN
        RAISE EXCEPTION 'Reason % needs params % (got %)', p_reason_code, v_rc.param_keys, v_params
            USING ERRCODE = 'invalid_parameter_value';
    END IF;
    INSERT INTO gold.entry_reason (schedule_entry_id, seq, reason_code_id, params)
    VALUES (p_schedule_entry_id, p_seq, v_rc.reason_code_id, v_params)
    RETURNING entry_reason_id INTO v_id;
    IF p_fact_ids IS NOT NULL THEN
        INSERT INTO gold.entry_reason_fact (entry_reason_id, semantic_fact_id)
        SELECT v_id, f FROM unnest(p_fact_ids) f WHERE f IS NOT NULL
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN v_id;
END
$$;

-- Fact params for a reason (semantic_fact_id, label, note text) from gold.v_trusted_fact.
CREATE FUNCTION gold.fact_params(p_semantic_fact_id bigint) RETURNS jsonb
LANGUAGE sql STABLE AS $$
    SELECT jsonb_build_object('semantic_fact_id', f.semantic_fact_id, 'fact_label', f.fact_label, 'note_text', f.note_text,
                              'fact_type', f.fact_type, 'source', f.source_csv || ':' || f.source_row_number || ':' || f.source_column,
                              'reader', f.model_id)
    FROM gold.v_trusted_fact f WHERE f.semantic_fact_id = p_semantic_fact_id
$$;

-- ORDER BY of the greedy pick for a LEXICOGRAPHIC policy. Placeholders: $1 clock, $2 plant time zone,
-- $3 previous species, $4 previous variety. ONLINE_FIRST is forced first; po_number is always the last tie-break.
CREATE FUNCTION gold.policy_order_by(p_policy gold.policy) RETURNS text
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
    v_urgent constant text :=
        '(due_date < (($1 + coalesce(input_kg / nullif(kg_per_h, 0), 0) * interval ''1 hour'') AT TIME ZONE $2)::date)';
    v_parts text[] := ARRAY['(status_code = ''ONLINE'') DESC'];
    v_code  text;
BEGIN
    IF p_policy.ranking_mode <> 'LEXICOGRAPHIC' THEN
        RAISE EXCEPTION 'Policy % ranking_mode % is not implemented yet', p_policy.policy_id, p_policy.ranking_mode
            USING ERRCODE = 'feature_not_supported';
    END IF;
    FOR v_code IN SELECT c ->> 'code' FROM jsonb_array_elements(p_policy.criteria) c LOOP
        v_parts := v_parts || CASE v_code
            WHEN 'ONLINE_FIRST' THEN NULL
            WHEN 'RUSH'         THEN ARRAY['is_rush DESC']
            WHEN 'URGENT_DUE'   THEN ARRAY[v_urgent || ' DESC NULLS LAST',
                                           'CASE WHEN ' || v_urgent || ' THEN due_date END ASC NULLS LAST']
            WHEN 'PRIORITY'     THEN ARRAY['priority_rank ASC NULLS LAST']
            WHEN 'SAME_VARIETY' THEN ARRAY['(species_code = $3 AND variety_code = $4) DESC NULLS LAST']
            WHEN 'SAME_SPECIES' THEN ARRAY['(species_code = $3) DESC NULLS LAST']
            WHEN 'DUE_DATE'     THEN ARRAY['due_date ASC NULLS LAST']
            WHEN 'RUN_ORDER'    THEN ARRAY['run_order ASC NULLS LAST']
        END;
        IF v_code NOT IN ('ONLINE_FIRST', 'RUSH', 'URGENT_DUE', 'PRIORITY', 'SAME_VARIETY', 'SAME_SPECIES', 'DUE_DATE', 'RUN_ORDER')
           OR v_code IS NULL THEN
            RAISE EXCEPTION 'Policy % has unknown criterion %', p_policy.policy_id, v_code USING ERRCODE = 'invalid_parameter_value';
        END IF;
    END LOOP;
    RETURN array_to_string(v_parts || ARRAY['po_number'], ', ');
END
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
    v_policy    gold.policy;
    v_order_by  text;
    v_found     int;
    -- planner v2
    v_existing  bigint;
    v_planner   boolean := false;
    v_pinned    boolean;
    v_bad       text;
    e           record;
    r           record;
    v_li        silver.line_schedule_item;
    v_po_id     bigint;
    v_status    text;
    v_e_start   timestamptz;
    v_e_end     timestamptz;
BEGIN
    v_wc := gold.resolve_line(p_line);
    PERFORM pg_advisory_xact_lock(hashtext('gold.replan'), v_wc.work_center_id::int);

    IF p_plan_event_id IS NOT NULL THEN
        SELECT * INTO v_event FROM gold.plan_event WHERE plan_event_id = p_plan_event_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'plan_event % not found', p_plan_event_id USING ERRCODE = 'no_data_found';
        END IF;
        IF v_event.work_center_id <> v_wc.work_center_id THEN
            RAISE EXCEPTION 'plan_event % is for another line than %', p_plan_event_id, v_wc.work_center_code
                USING ERRCODE = 'invalid_parameter_value';
        END IF;
        -- planner v2 (Q1): one plan per event; a repeat call returns the saved plan
        SELECT schedule_plan_id INTO v_existing FROM gold.schedule_plan WHERE plan_event_id = p_plan_event_id;
        IF FOUND THEN
            RETURN v_existing;
        END IF;
        SELECT po_number INTO v_event_po FROM silver.process_order WHERE process_order_id = v_event.process_order_id;
        v_planner := coalesce(jsonb_typeof(v_event.payload -> 'entries') = 'array', false);
        IF v_planner AND v_event.event_type <> 'planner_run' THEN
            RAISE EXCEPTION 'payload.entries is only accepted on planner_run events (event % is %)', p_plan_event_id,
                v_event.event_type USING ERRCODE = 'invalid_parameter_value';
        END IF;

        IF v_event.event_type = 'planner_run' THEN
            -- typed copies of the payload grains (Q3, Q4a, Q4b); unknown POs / lines / routes reject the call
            SELECT string_agg(format('overrides[%s] po %s', o.ord - 1, o.el ->> 'po'), ', ') INTO v_bad
            FROM jsonb_array_elements(coalesce(v_event.payload -> 'overrides', '[]')) WITH ORDINALITY o (el, ord)
            WHERE NOT EXISTS (SELECT 1 FROM silver.process_order po
                              WHERE po.po_number = (silver.norm_po(o.el ->> 'po')).po_number);
            IF v_bad IS NOT NULL THEN
                RAISE EXCEPTION 'unknown PO in %', v_bad USING ERRCODE = 'no_data_found';
            END IF;
            INSERT INTO gold.plan_override
                (plan_event_id, element_seq, process_order_id, override_type, from_work_center_id, to_work_center_id,
                 pinned_position, hold_reason, is_active, override_json)
            SELECT p_plan_event_id, o.ord, po.process_order_id, upper(o.el ->> 'type'),
                   (SELECT li.work_center_id FROM silver.line_schedule_item li
                    WHERE li.process_order_id = po.process_order_id AND li.status_code <> 'COMPLETE' AND NOT li.is_duplicate
                    ORDER BY li.line_schedule_item_id LIMIT 1),
                   CASE WHEN upper(o.el ->> 'type') = 'LINE_SWAP'
                        THEN (gold.resolve_line(coalesce(o.el ->> 'workCenterCode', o.el ->> 'lineId'))).work_center_id END,
                   CASE WHEN upper(o.el ->> 'type') = 'PIN_POSITION'
                        THEN coalesce(o.el ->> 'position', o.el ->> 'pinnedPosition')::int END,
                   CASE WHEN upper(o.el ->> 'type') = 'FORCE_HOLD'
                        THEN coalesce(o.el ->> 'reason', o.el ->> 'holdReason', 'planner override') END,
                   coalesce((o.el ->> 'active')::boolean, true), o.el
            FROM jsonb_array_elements(coalesce(v_event.payload -> 'overrides', '[]')) WITH ORDINALITY o (el, ord)
            JOIN silver.process_order po ON po.po_number = (silver.norm_po(o.el ->> 'po')).po_number;

            INSERT INTO gold.line_downtime (plan_event_id, element_seq, work_center_id, starts_at, ends_at, reason, downtime_json)
            SELECT p_plan_event_id, d.ord,
                   (gold.resolve_line(coalesce(d.el ->> 'lineId', d.el ->> 'workCenterCode'))).work_center_id,
                   (d.el ->> 'startsAt')::timestamptz, (d.el ->> 'endsAt')::timestamptz, d.el ->> 'reason', d.el
            FROM jsonb_array_elements(coalesce(v_event.payload -> 'downtime', '[]')) WITH ORDINALITY d (el, ord);

            SELECT string_agg(format('proposals[%s] po %s route %s', x.ord - 1, x.el ->> 'parentPo', x.el ->> 'route'), ', ')
            INTO v_bad
            FROM jsonb_array_elements(coalesce(v_event.payload -> 'proposals', '[]')) WITH ORDINALITY x (el, ord)
            WHERE NOT EXISTS (SELECT 1 FROM silver.process_order po
                              WHERE po.po_number = (silver.norm_po(x.el ->> 'parentPo')).po_number)
               OR NOT EXISTS (SELECT 1 FROM silver.work_center w
                              WHERE w.work_center_code = upper(x.el ->> 'route')
                                 OR (w.line_type = upper(x.el ->> 'route') AND w.seed_size = 'LSV' AND w.is_in_scope));
            IF v_bad IS NOT NULL THEN
                RAISE EXCEPTION 'unknown PO or route in %', v_bad USING ERRCODE = 'no_data_found';
            END IF;
            INSERT INTO gold.repair_proposal
                (plan_event_id, element_seq, parent_process_order_id, quality_test_id, fail_reason_code,
                 route_work_center_id, status, proposal_json)
            SELECT p_plan_event_id, x.ord, po.process_order_id, qt.quality_test_id,
                   coalesce(upper(x.el ->> 'failReason'), qt.fail_reason_code),
                   (SELECT w.work_center_id FROM silver.work_center w
                    WHERE w.work_center_code = upper(x.el ->> 'route')
                       OR (w.line_type = upper(x.el ->> 'route') AND w.seed_size = 'LSV' AND w.is_in_scope)
                    ORDER BY (w.work_center_code = upper(x.el ->> 'route')) DESC, w.work_center_code LIMIT 1),
                   coalesce(upper(x.el ->> 'status'), 'PROPOSED'), x.el
            FROM jsonb_array_elements(coalesce(v_event.payload -> 'proposals', '[]')) WITH ORDINALITY x (el, ord)
            JOIN silver.process_order po ON po.po_number = (silver.norm_po(x.el ->> 'parentPo')).po_number
            LEFT JOIN gold.v_po_quality_status qs ON qs.process_order_id = po.process_order_id
            LEFT JOIN silver.quality_test qt
                   ON qt.quality_test_id = coalesce((x.el ->> 'qualityTestId')::bigint, qs.latest_fail_test_id);
        END IF;
    END IF;

    -- planner v2 (Q2): the planner path cites the PLANNER policy, the heuristic the HEURISTIC one
    v_policy := gold.active_policy(v_wc.work_center_id, CASE WHEN v_planner THEN 'PLANNER' ELSE 'HEURISTIC' END);
    IF v_policy.policy_id IS NULL THEN
        RAISE EXCEPTION 'No ACTIVE % gold.policy for % (seeds/gold_policy.sql)',
            CASE WHEN v_planner THEN 'PLANNER' ELSE 'HEURISTIC' END, v_wc.work_center_code USING ERRCODE = 'no_data_found';
    END IF;
    IF NOT v_planner THEN
        v_order_by := gold.policy_order_by(v_policy);
    END IF;

    SELECT * INTO v_parent FROM gold.schedule_plan
    WHERE work_center_id = v_wc.work_center_id ORDER BY plan_version DESC LIMIT 1;

    UPDATE gold.schedule_plan SET status = 'SUPERSEDED'
    WHERE work_center_id = v_wc.work_center_id AND status <> 'SUPERSEDED';

    INSERT INTO gold.schedule_plan
        (work_center_id, plan_version, parent_plan_id, status, plan_event_id, policy_id, horizon_start, created_by)
    VALUES (v_wc.work_center_id, coalesce(v_parent.plan_version, 0) + 1, v_parent.schedule_plan_id, 'PROPOSED',
            p_plan_event_id, v_policy.policy_id, v_clock,
            CASE WHEN v_planner THEN 'planner-v2' ELSE gold.cfg('heuristic_version') END)
    RETURNING schedule_plan_id INTO v_plan_id;

    -- planner v2: store the planner's entries as sent (guards only), then stop
    IF v_planner THEN
        FOR e IN SELECT x.el, x.ord FROM jsonb_array_elements(v_event.payload -> 'entries') WITH ORDINALITY x (el, ord) LOOP
            BEGIN
                SELECT * INTO v_li FROM silver.line_schedule_item
                WHERE line_schedule_item_id = (e.el ->> 'lineScheduleItemId')::bigint;
                IF NOT FOUND THEN
                    RAISE EXCEPTION 'unknown lineScheduleItemId %', e.el ->> 'lineScheduleItemId' USING ERRCODE = 'no_data_found';
                END IF;
                v_po_id := coalesce((e.el ->> 'processOrderId')::bigint, v_li.process_order_id);
                IF v_li.process_order_id IS DISTINCT FROM v_po_id THEN   -- guard 1 (Q7a)
                    RAISE EXCEPTION 'schedule row % belongs to process order %, not %', v_li.line_schedule_item_id,
                        v_li.process_order_id, v_po_id USING ERRCODE = 'invalid_parameter_value';
                END IF;
                IF v_li.work_center_id <> v_wc.work_center_id AND NOT EXISTS (   -- guard 2 (Q7a)
                       SELECT 1 FROM gold.v_active_override o
                       WHERE o.process_order_id = v_po_id AND o.override_type = 'LINE_SWAP'
                         AND o.to_work_center_id = v_wc.work_center_id) THEN
                    RAISE EXCEPTION 'schedule row % is on another line and the PO has no active LINE_SWAP to %',
                        v_li.line_schedule_item_id, v_wc.work_center_code USING ERRCODE = 'invalid_parameter_value';
                END IF;
                v_status  := upper(coalesce(e.el ->> 'entryStatus', 'PLANNED'));
                v_e_start := (e.el ->> 'plannedStartAt')::timestamptz;
                v_e_end   := (e.el ->> 'plannedEndAt')::timestamptz;
                IF (v_status = 'PLANNED' AND (v_e_start IS NULL OR v_e_end IS NULL OR v_e_end < v_e_start))   -- guard 3
                   OR (v_status = 'HOLD' AND (v_e_start IS NOT NULL OR v_e_end IS NOT NULL)) THEN
                    RAISE EXCEPTION 'PLANNED needs plannedStartAt <= plannedEndAt; HOLD has no times'
                        USING ERRCODE = 'invalid_parameter_value';
                END IF;
                IF e.el ? 'previousPosition' THEN
                    v_prev_pos := (e.el ->> 'previousPosition')::int;
                ELSE
                    SELECT se.position INTO v_prev_pos FROM gold.schedule_entry se
                    WHERE se.schedule_plan_id = v_parent.schedule_plan_id AND se.process_order_id = v_po_id;
                END IF;

                INSERT INTO gold.schedule_entry
                    (schedule_plan_id, position, process_order_id, line_schedule_item_id, entry_status, planned_start_at,
                     planned_end_at, est_run_h, est_changeover_h, due_date, slack_days, is_at_risk, previous_position,
                     due_date_basis)
                VALUES (v_plan_id, (e.el ->> 'position')::int, v_po_id, v_li.line_schedule_item_id, v_status, v_e_start,
                        v_e_end, (e.el ->> 'estRunH')::numeric, (e.el ->> 'estChangeoverH')::numeric,
                        (e.el ->> 'dueDate')::date, (e.el ->> 'slackDays')::numeric,
                        coalesce((e.el ->> 'isAtRisk')::boolean, false), v_prev_pos,
                        upper(coalesce(e.el ->> 'dueDateBasis', 'SAP_FINISH')))
                RETURNING schedule_entry_id INTO v_entry_id;

                FOR r IN SELECT y.rs, y.ord FROM jsonb_array_elements(coalesce(e.el -> 'reasons', '[]')) WITH ORDINALITY y (rs, ord) LOOP
                    PERFORM gold.add_reason(v_entry_id, coalesce((r.rs ->> 'seq')::int, r.ord::int), r.rs ->> 'code',
                        coalesce(r.rs -> 'params', '{}'),
                        (SELECT array_agg(f::bigint) FROM jsonb_array_elements_text(coalesce(r.rs -> 'factIds', '[]')) f));
                END LOOP;
            EXCEPTION WHEN OTHERS THEN
                RAISE EXCEPTION 'planner entries[%] (lineScheduleItemId %): %', e.ord - 1, e.el ->> 'lineScheduleItemId', SQLERRM
                    USING ERRCODE = SQLSTATE;
            END;
        END LOOP;
        RETURN v_plan_id;
    END IF;

    DROP TABLE IF EXISTS _cand;
    CREATE TEMP TABLE _cand ON COMMIT DROP AS
    SELECT q.*, NULL::int AS new_pos, gold.est_kg_per_h(q.work_center_id, q.species_code) AS kg_per_h
    FROM gold.v_open_queue q
    WHERE q.work_center_id = v_wc.work_center_id
      AND (q.swapped_to_work_center_id IS NULL OR q.swapped_to_work_center_id = v_wc.work_center_id);   -- swapped away

    -- Runnable batches, greedy
    LOOP
        -- Policy-driven pick (policy v1 reproduces the heuristic-v1 ORDER BY exactly). EXECUTE does not set FOUND.
        -- planner v2: a PIN_POSITION override takes its position once no running batch is left to place; pinned
        -- batches are not picked before their position unless nothing else is runnable.
        v_pinned := false;
        v_found := 0;
        IF NOT EXISTS (SELECT 1 FROM _cand WHERE new_pos IS NULL AND NOT is_hold AND status_code = 'ONLINE') THEN
            SELECT * INTO c FROM _cand
            WHERE new_pos IS NULL AND NOT is_hold AND override_pinned_position = v_pos + 1
            ORDER BY po_number LIMIT 1;
            GET DIAGNOSTICS v_found = ROW_COUNT;
            v_pinned := v_found > 0;
        END IF;
        IF v_found = 0 THEN
            EXECUTE 'SELECT * FROM _cand WHERE new_pos IS NULL AND NOT is_hold'
                    || ' AND (override_pinned_position IS NULL OR override_pinned_position <= $5) ORDER BY '
                    || v_order_by || ' LIMIT 1'
                INTO c USING v_clock, v_tz, v_last_species, v_last_variety, v_pos + 1;
            GET DIAGNOSTICS v_found = ROW_COUNT;
        END IF;
        IF v_found = 0 THEN
            EXECUTE 'SELECT * FROM _cand WHERE new_pos IS NULL AND NOT is_hold ORDER BY ' || v_order_by || ' LIMIT 1'
                INTO c USING v_clock, v_tz, v_last_species, v_last_variety;
            GET DIAGNOSTICS v_found = ROW_COUNT;
        END IF;
        EXIT WHEN v_found = 0;

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
             planned_end_at, est_run_h, est_changeover_h, due_date, slack_days, is_at_risk, previous_position,
             due_date_basis)
        VALUES (v_plan_id, v_pos, c.process_order_id, c.line_schedule_item_id, 'PLANNED', v_start, v_end,
                v_run_h, v_co_h, c.due_date, v_slack, coalesce(v_slack < 0, false), v_prev_pos, c.due_date_basis)
        RETURNING schedule_entry_id INTO v_entry_id;

        -- Reasons, most important first (seq 1 = reasonShort)
        v_seq := 0;
        IF v_pinned THEN
            v_seq := v_seq + 1;
            PERFORM gold.add_reason(v_entry_id, v_seq, 'OVERRIDE_PIN',
                jsonb_build_object('plan_override_id', c.pin_override_id, 'pinned_position', c.override_pinned_position));
        END IF;
        IF c.status_code = 'ONLINE' THEN
            v_seq := v_seq + 1;
            PERFORM gold.add_reason(v_entry_id, v_seq, 'ALREADY_RUNNING',
                jsonb_build_object('work_center_code', v_wc.work_center_code, 'status_code', c.status_code));
            IF c.is_not_ready THEN
                v_seq := v_seq + 1;
                PERFORM gold.add_reason(v_entry_id, v_seq, 'NOT_READY_WARNING', gold.fact_params(c.not_ready_fact_id),
                                        ARRAY[c.not_ready_fact_id]);
            END IF;
        END IF;
        IF c.is_rush_note THEN
            v_seq := v_seq + 1;
            PERFORM gold.add_reason(v_entry_id, v_seq, 'NOTE_RUSH', gold.fact_params(c.rush_fact_id), ARRAY[c.rush_fact_id]);
        ELSIF c.is_rush THEN
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
        IF c.throughput_basis = 'WORK_CENTER' THEN
            v_seq := v_seq + 1;
            PERFORM gold.add_reason(v_entry_id, v_seq, 'THROUGHPUT_FALLBACK',
                jsonb_build_object('species_code', c.species_code, 'work_center_code', v_wc.work_center_code));
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
            (schedule_plan_id, position, process_order_id, line_schedule_item_id, entry_status, due_date, previous_position,
             due_date_basis)
        VALUES (v_plan_id, v_pos, c.process_order_id, c.line_schedule_item_id, 'HOLD', c.due_date, v_prev_pos,
                c.due_date_basis)
        RETURNING schedule_entry_id INTO v_entry_id;

        CASE c.hold_reason
            WHEN 'QA_FAIL' THEN
                PERFORM gold.add_reason(v_entry_id, 1, 'QA_HOLD',
                    jsonb_build_object('quality_test_id', c.latest_fail_test_id, 'fail_reason', c.latest_fail_reason,
                                       'source', 'pass_fail_log'));
            WHEN 'NOT_READY' THEN
                PERFORM gold.add_reason(v_entry_id, 1, 'NOT_READY_HOLD', gold.fact_params(c.not_ready_fact_id),
                                        ARRAY[c.not_ready_fact_id]);
            WHEN 'NOTE_HOLD' THEN
                PERFORM gold.add_reason(v_entry_id, 1, 'NOTE_HOLD', gold.fact_params(c.hold_fact_id), ARRAY[c.hold_fact_id]);
            WHEN 'OVERRIDE_HOLD' THEN
                PERFORM gold.add_reason(v_entry_id, 1, 'OVERRIDE_HOLD',
                    jsonb_build_object('plan_override_id', c.hold_override_id, 'hold_reason', c.override_hold_reason));
            ELSE
                PERFORM gold.add_reason(v_entry_id, 1, 'STATUS_HOLD', jsonb_build_object('status_code', c.status_code));
        END CASE;
    END LOOP;

    RETURN v_plan_id;
END
$$;
COMMENT ON FUNCTION gold.replan(text, bigint) IS 'Replan for one line; returns schedule_plan_id. One plan per event (repeat = same plan). planner_run payload.entries => stored as sent (planner-v2, PLANNER policy, guards); else heuristic v1 ordered by the HEURISTIC policy, respecting active overrides';
