-- Gold API surface for the Data API: plan views, contract-shaped JSON, ingest -> replan, accept, reset,
-- Agent context and batch detail. JSON keys follow frontend/src/demo/plant/plantDemoTypes.ts.

-- Fill a reason template's {placeholders} from its params (fallback text; the Agent writes the prose).
CREATE FUNCTION gold.render_reason(p_template text, p_params jsonb) RETURNS text
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
    v text := p_template;
    kv record;
BEGIN
    FOR kv IN SELECT key, value FROM jsonb_each_text(coalesce(p_params, '{}')) LOOP
        v := replace(v, '{' || kv.key || '}', coalesce(kv.value, ''));
    END LOOP;
    RETURN regexp_replace(v, '\{[a-z_]+\}', '—', 'g');
END
$$;

CREATE VIEW gold.v_latest_plan AS
SELECT DISTINCT ON (sp.work_center_id) sp.*
FROM gold.schedule_plan sp
ORDER BY sp.work_center_id, sp.plan_version DESC;

-- v4 (D-04): acceptance history from plan_decision. schedule_plan.status only says whether the plan is the line's
-- current one (a replan supersedes an accepted plan); this view keeps "was it accepted, when, by whom".
CREATE VIEW gold.v_plan_status AS
SELECT sp.schedule_plan_id, sp.work_center_id, sp.plan_version, sp.status, sp.policy_id, sp.plan_event_id,
       sp.schedule_plan_id = lp.schedule_plan_id AS is_latest,
       d.decided_at IS NOT NULL AS is_accepted,
       d.decided_at AS accepted_at, d.decided_by AS accepted_by,
       (sp.schedule_plan_id = lp.schedule_plan_id AND d.decided_at IS NOT NULL) AS is_current_accepted
FROM gold.schedule_plan sp
JOIN gold.v_latest_plan lp USING (work_center_id)
LEFT JOIN LATERAL (
    SELECT pd.decided_at, pd.decided_by FROM gold.plan_decision pd
    WHERE pd.schedule_plan_id = sp.schedule_plan_id AND pd.decision = 'ACCEPT'
    ORDER BY pd.decided_at DESC LIMIT 1) d ON true;
COMMENT ON VIEW gold.v_plan_status IS 'Per plan: latest?, accepted (from plan_decision), when and by whom. Status stays the lifecycle of the latest plan';

-- planner v2 (Q4c, Q6): impact of a plan vs its parent, derived from the entries (R-DERIVED). "Newly late" compares like
-- with like: a PO whose due_date_basis changed (e.g. heuristic NEED_BY -> planner SAP_FINISH) is listed apart.
-- planner_impact = what the planner said (payload.impact of a planner_run), shown next to the derived numbers.
CREATE VIEW gold.v_plan_impact AS
WITH pair AS (
    SELECT sp.schedule_plan_id, se.process_order_id, po.po_number, se.position, se.entry_status, se.is_at_risk,
           se.due_date_basis, se.est_changeover_h,
           pe.position AS parent_position, pe.is_at_risk AS parent_at_risk, pe.due_date_basis AS parent_basis
    FROM gold.schedule_plan sp
    JOIN gold.schedule_entry se USING (schedule_plan_id)
    JOIN silver.process_order po ON po.process_order_id = se.process_order_id
    LEFT JOIN gold.schedule_entry pe ON pe.schedule_plan_id = sp.parent_plan_id AND pe.process_order_id = se.process_order_id
)
SELECT sp.schedule_plan_id, sp.work_center_id, sp.plan_version, sp.created_by, sp.parent_plan_id,
       count(p.process_order_id) FILTER (WHERE p.entry_status = 'PLANNED') AS n_planned,
       count(p.process_order_id) FILTER (WHERE p.entry_status = 'HOLD') AS n_hold,
       count(p.process_order_id) FILTER (WHERE p.is_at_risk) AS n_at_risk,
       coalesce(jsonb_agg(p.po_number ORDER BY p.position) FILTER (
           WHERE p.is_at_risk AND NOT coalesce(p.parent_at_risk, false)
             AND p.due_date_basis IS NOT DISTINCT FROM p.parent_basis), '[]') AS newly_late,
       coalesce(jsonb_agg(p.po_number ORDER BY p.position) FILTER (
           WHERE NOT p.is_at_risk AND p.parent_at_risk
             AND p.due_date_basis IS NOT DISTINCT FROM p.parent_basis), '[]') AS no_longer_late,
       coalesce(jsonb_agg(p.po_number ORDER BY p.position) FILTER (
           WHERE p.is_at_risk AND p.parent_position IS NOT NULL
             AND p.due_date_basis IS DISTINCT FROM p.parent_basis), '[]') AS late_on_changed_basis,
       count(p.process_order_id) FILTER (WHERE p.parent_position IS NOT NULL AND p.parent_position <> p.position) AS n_moved,
       coalesce(sum(p.est_changeover_h), 0) AS changeover_h,
       (SELECT coalesce(sum(x.est_changeover_h), 0) FROM gold.schedule_entry x WHERE x.schedule_plan_id = sp.parent_plan_id)
           AS parent_changeover_h,
       ev.payload -> 'impact' AS planner_impact
FROM gold.schedule_plan sp
LEFT JOIN pair p USING (schedule_plan_id)
LEFT JOIN gold.plan_event ev ON ev.plan_event_id = sp.plan_event_id AND ev.event_type = 'planner_run'
GROUP BY sp.schedule_plan_id, sp.work_center_id, sp.plan_version, sp.created_by, sp.parent_plan_id, ev.payload;
COMMENT ON VIEW gold.v_plan_impact IS
  'Per plan vs its parent: planned / hold / at-risk counts, newly late and no longer late (same due_date_basis only), late on a changed basis, moved POs, changeover hours vs parent, and the planner''s own impact claim';

-- One row per plan entry, with the BFF QueueRow shape in queue_row.
CREATE VIEW gold.v_plan_queue AS
SELECT sp.schedule_plan_id, sp.work_center_id, wc.work_center_code, coalesce(wc.demo_line_id, wc.work_center_code) AS line_id,
       sp.plan_version, sp.status AS plan_status,
       se.schedule_entry_id, se.position, se.previous_position, se.entry_status,
       po.process_order_id, po.po_number, li.species_code, m.variety_code, l.lot_number,
       li.input_kg, li.scheduled_finish_date, se.due_date, se.slack_days, se.is_at_risk,
       se.planned_start_at, se.planned_end_at, se.est_run_h, se.est_changeover_h,
       r.reason_short, coalesce(r.reasons, '[]') AS reasons,
       jsonb_strip_nulls(jsonb_build_object(
           'po', po.po_number,
           'species', li.species_code,
           'kg', li.input_kg,
           'finish', CASE WHEN se.planned_end_at IS NOT NULL
                          THEN to_char(se.planned_end_at AT TIME ZONE gold.cfg('plant_time_zone'), 'YYYY-MM-DD HH24:MI')
                          ELSE to_char(coalesce(se.due_date, li.scheduled_finish_date), 'YYYY-MM-DD') END,
           'status', se.entry_status,
           'atRisk', se.is_at_risk,
           'reasonShort', r.reason_short,
           'previousPosition', se.previous_position)) AS queue_row
FROM gold.schedule_entry se
JOIN gold.schedule_plan sp USING (schedule_plan_id)
JOIN silver.work_center wc ON wc.work_center_id = sp.work_center_id
JOIN silver.process_order po ON po.process_order_id = se.process_order_id
LEFT JOIN silver.line_schedule_item li ON li.line_schedule_item_id = se.line_schedule_item_id
LEFT JOIN silver.material m ON m.material_id = coalesce(li.material_id, po.material_id)
LEFT JOIN silver.lot l ON l.lot_id = coalesce(li.lot_id, po.lot_id)
LEFT JOIN LATERAL (
    SELECT (array_agg(gold.render_reason(rc.template, er.params) ORDER BY er.seq))[1] AS reason_short,
           jsonb_agg(jsonb_build_object('code', rc.reason_code, 'params', er.params,
                                        'text', gold.render_reason(rc.template, er.params)) ORDER BY er.seq) AS reasons
    FROM gold.entry_reason er JOIN gold.reason_code rc USING (reason_code_id)
    WHERE er.schedule_entry_id = se.schedule_entry_id) r ON true;
COMMENT ON VIEW gold.v_plan_queue IS 'Plan entries with reasons; queue_row = BFF QueueRow JSON';

-- Diff of every plan vs its parent: moves (QueueMove), held, added, removed, reason codes.
CREATE VIEW gold.v_plan_diff AS
SELECT sp.schedule_plan_id, sp.work_center_id, sp.plan_version, sp.parent_plan_id,
       pe.event_type, pe.source,
       coalesce(mv.moves, '[]') AS moves,
       coalesce(hd.held, '[]') AS held,
       coalesce(ad.added, '[]') AS added,
       coalesce(rm.removed, '[]') AS removed,
       to_jsonb(array_remove(ARRAY[
           CASE WHEN pe.event_type IS NOT NULL THEN pe.event_type || '_' || pe.source END,
           CASE WHEN hd.held IS NOT NULL THEN 'isolate_hold' END,
           CASE WHEN mv.moves IS NOT NULL THEN 'resequence_downstream' END], NULL)
           || coalesce(rc.codes, '{}')) AS reasons
FROM gold.schedule_plan sp
LEFT JOIN gold.plan_event pe ON pe.plan_event_id = sp.plan_event_id
LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object('po', q.po_number, 'fromPosition', q.previous_position, 'toPosition', q.position)
                     ORDER BY q.position) AS moves
    FROM gold.v_plan_queue q
    WHERE q.schedule_plan_id = sp.schedule_plan_id AND q.previous_position IS NOT NULL
      AND q.previous_position <> q.position) mv ON true
LEFT JOIN LATERAL (
    SELECT jsonb_agg(q.po_number ORDER BY q.position) AS held
    FROM gold.v_plan_queue q
    LEFT JOIN gold.schedule_entry prev ON prev.schedule_plan_id = sp.parent_plan_id AND prev.process_order_id = q.process_order_id
    WHERE q.schedule_plan_id = sp.schedule_plan_id AND q.entry_status = 'HOLD'
      AND sp.parent_plan_id IS NOT NULL AND prev.entry_status IS DISTINCT FROM 'HOLD') hd ON true
LEFT JOIN LATERAL (
    SELECT jsonb_agg(q.po_number ORDER BY q.position) AS added
    FROM gold.v_plan_queue q
    WHERE q.schedule_plan_id = sp.schedule_plan_id AND sp.parent_plan_id IS NOT NULL AND q.previous_position IS NULL) ad ON true
LEFT JOIN LATERAL (
    SELECT jsonb_agg(po.po_number ORDER BY prev.position) AS removed
    FROM gold.schedule_entry prev
    JOIN silver.process_order po ON po.process_order_id = prev.process_order_id
    WHERE prev.schedule_plan_id = sp.parent_plan_id
      AND NOT EXISTS (SELECT 1 FROM gold.schedule_entry se
                      WHERE se.schedule_plan_id = sp.schedule_plan_id AND se.process_order_id = prev.process_order_id)) rm ON true
LEFT JOIN LATERAL (
    SELECT array_agg(DISTINCT lower(rc.reason_code)) AS codes
    FROM gold.schedule_entry se
    JOIN gold.entry_reason er USING (schedule_entry_id)
    JOIN gold.reason_code rc USING (reason_code_id)
    WHERE se.schedule_plan_id = sp.schedule_plan_id
      AND rc.category IN ('HARD', 'EVENT', 'URGENCY')
      AND (se.previous_position IS DISTINCT FROM se.position OR se.entry_status = 'HOLD')) rc ON true;
COMMENT ON VIEW gold.v_plan_diff IS 'Plan vs parent: moves[] {po, fromPosition, toPosition}, held, added, removed, reasons[] (machine codes)';

-- Open customer orders against the latest plan of their line.
CREATE VIEW gold.v_order_risk AS
SELECT co.order_number, co.customer_name, co.priority_tier, co.is_synthetic, co.qty, co.uom_code, co.need_by_date,
       po.po_number, q.line_id, q.plan_version, q.position, q.entry_status,
       (q.planned_end_at AT TIME ZONE gold.cfg('plant_time_zone'))::date AS planned_end_date,
       co.need_by_date - (q.planned_end_at AT TIME ZONE gold.cfg('plant_time_zone'))::date AS slack_days,
       coalesce(q.entry_status = 'HOLD'
                OR (q.planned_end_at AT TIME ZONE gold.cfg('plant_time_zone'))::date > co.need_by_date, false) AS is_at_risk
FROM silver.customer_order co
JOIN silver.order_allocation oa USING (customer_order_id)
JOIN silver.process_order po USING (process_order_id)
LEFT JOIN LATERAL (
    SELECT q.* FROM gold.v_plan_queue q
    JOIN gold.v_latest_plan lp USING (schedule_plan_id)
    WHERE q.process_order_id = po.process_order_id
    ORDER BY q.plan_version DESC LIMIT 1) q ON true;
COMMENT ON VIEW gold.v_order_risk IS 'Per (synthetic) customer order: covering PO, planned finish in the latest plan, slack, at risk';

-- PlantQueueResponse for a line (latest plan).
CREATE FUNCTION gold.queue_response(p_line text) RETURNS jsonb
LANGUAGE sql STABLE AS $$
    WITH wc AS (SELECT * FROM gold.resolve_line(p_line)),
    lp AS (SELECT lp.* FROM gold.v_latest_plan lp JOIN wc USING (work_center_id))
    SELECT jsonb_build_object(
        'lineId', coalesce(wc.demo_line_id, wc.work_center_code),
        'queue', coalesce((SELECT jsonb_agg(q.queue_row ORDER BY q.position) FROM gold.v_plan_queue q
                           WHERE q.schedule_plan_id = lp.schedule_plan_id), '[]'),
        'planVersion', lp.plan_version,
        'lastEvent', CASE WHEN lp.status <> 'ACCEPTED' AND pe.event_type IN ('rush', 'qa_fail') THEN pe.event_type END,
        'acceptedPlanVersion', (SELECT max(sp.plan_version) FROM gold.schedule_plan sp
                                JOIN gold.plan_decision d USING (schedule_plan_id)
                                WHERE sp.work_center_id = wc.work_center_id AND d.decision = 'ACCEPT'))
    FROM wc
    LEFT JOIN lp ON true
    LEFT JOIN gold.plan_event pe ON pe.plan_event_id = lp.plan_event_id
$$;

-- PlantEventResponse facts for a plan (explanation is added by the Agent API via the BFF).
CREATE FUNCTION gold.event_response(p_schedule_plan_id bigint) RETURNS jsonb
LANGUAGE sql STABLE AS $$
    SELECT jsonb_build_object(
        'lineId', coalesce(wc.demo_line_id, wc.work_center_code),
        'eventType', d.event_type,
        'source', d.source,
        'planVersion', d.plan_version,
        'queue', coalesce((SELECT jsonb_agg(q.queue_row ORDER BY q.position) FROM gold.v_plan_queue q
                           WHERE q.schedule_plan_id = d.schedule_plan_id), '[]'),
        'diff', jsonb_build_object('moves', d.moves, 'reasons', d.reasons, 'held', d.held,
                                   'added', d.added, 'removed', d.removed))
    FROM gold.v_plan_diff d
    JOIN silver.work_center wc USING (work_center_id)
    WHERE d.schedule_plan_id = p_schedule_plan_id
$$;

-- Apply one raw.ingest_event: validate against the line's open queue, update silver, record the event, replan.
CREATE FUNCTION gold.process_ingest_event(p_ingest_event_id bigint) RETURNS bigint
LANGUAGE plpgsql AS $$
DECLARE
    e       raw.ingest_event;
    v_wc    silver.work_center;
    v_po_id bigint;
    v_type  text;
    v_event bigint;
BEGIN
    SELECT * INTO e FROM raw.ingest_event WHERE ingest_event_id = p_ingest_event_id;
    v_wc := gold.resolve_line(e.line_id);

    SELECT li.process_order_id INTO v_po_id
    FROM silver.line_schedule_item li
    JOIN silver.process_order po USING (process_order_id)
    WHERE po.po_number = (silver.norm_po(e.payload ->> 'po')).po_number
      AND li.work_center_id = v_wc.work_center_id AND li.status_code <> 'COMPLETE' AND NOT li.is_duplicate;
    IF v_po_id IS NULL THEN
        RAISE EXCEPTION 'PO % is not in the open queue of % (%)', e.payload ->> 'po', e.line_id, v_wc.work_center_code
            USING ERRCODE = 'no_data_found';
    END IF;

    PERFORM silver.apply_ingest_event(p_ingest_event_id);

    v_type := CASE
        WHEN e.event_source = 'pass_fail_log' THEN
            CASE silver.result_code(e.payload ->> 'passFail') WHEN 'FAIL' THEN 'qa_fail' ELSE 'qa_pass' END
        WHEN (SELECT c.is_rush FROM silver.process_order_change c WHERE c.ingest_event_id = p_ingest_event_id) THEN 'rush'
        ELSE 'queue_refresh'
    END;

    INSERT INTO gold.plan_event (work_center_id, event_type, source, process_order_id, ingest_event_id, payload, created_at, created_by)
    VALUES (v_wc.work_center_id, v_type, e.event_source, v_po_id, e.ingest_event_id, e.payload, e.received_at, e.received_by)
    RETURNING plan_event_id INTO v_event;

    RETURN gold.replan(v_wc.work_center_code, v_event);
END
$$;

-- Generic ingest (the Data API posts the request body as-is). Idempotent on p_idempotency_key.
CREATE FUNCTION gold.ingest(p_event_source text, p_line_id text, p_payload jsonb,
                            p_idempotency_key text DEFAULT NULL, p_received_by text DEFAULT current_user)
RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
    v_id   bigint;
    v_plan bigint;
BEGIN
    IF p_idempotency_key IS NOT NULL THEN
        SELECT sp.schedule_plan_id INTO v_plan
        FROM raw.ingest_event ie
        JOIN gold.plan_event pe USING (ingest_event_id)
        JOIN gold.schedule_plan sp USING (plan_event_id)
        WHERE ie.idempotency_key = p_idempotency_key AND ie.voided_at IS NULL;
        IF v_plan IS NOT NULL THEN
            RETURN gold.event_response(v_plan);
        END IF;
    END IF;

    INSERT INTO raw.ingest_event (event_source, line_id, payload, idempotency_key, received_by)
    VALUES (p_event_source, p_line_id, p_payload, p_idempotency_key, p_received_by)
    RETURNING ingest_event_id INTO v_id;

    v_plan := gold.process_ingest_event(v_id);
    RETURN gold.event_response(v_plan);
END
$$;

-- POST /demo/plant/ingest/sap-priority-change
CREATE FUNCTION gold.ingest_sap_priority_change(p_line_id text, p_po text, p_priority int DEFAULT NULL,
                                                p_scheduled_finish text DEFAULT NULL,
                                                p_idempotency_key text DEFAULT NULL,
                                                p_received_by text DEFAULT current_user)
RETURNS jsonb
LANGUAGE sql AS $$
    SELECT gold.ingest('sap_priority_change', p_line_id,
        jsonb_strip_nulls(jsonb_build_object('lineId', p_line_id, 'po', p_po, 'priority', p_priority,
                                             'scheduledFinish', p_scheduled_finish)),
        p_idempotency_key, p_received_by)
$$;

-- POST /demo/plant/ingest/pass-fail-log
CREATE FUNCTION gold.ingest_pass_fail(p_line_id text, p_po text, p_pass_fail text, p_failed_for text DEFAULT NULL,
                                      p_equipment_id text DEFAULT NULL, p_idempotency_key text DEFAULT NULL,
                                      p_received_by text DEFAULT current_user)
RETURNS jsonb
LANGUAGE sql AS $$
    SELECT gold.ingest('pass_fail_log', p_line_id,
        jsonb_strip_nulls(jsonb_build_object('lineId', p_line_id, 'po', p_po, 'passFail', p_pass_fail,
                                             'failedFor', p_failed_for, 'equipmentId', p_equipment_id)),
        p_idempotency_key, p_received_by)
$$;

-- POST /demo/plant/schedule/accept -> PlantAcceptResponse. Audit only: nothing is written to SAP/ERP.
CREATE FUNCTION gold.accept_plan(p_line text, p_plan_version int DEFAULT NULL,
                                 p_decided_by text DEFAULT current_user, p_comment text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
    v_wc   silver.work_center;
    v_plan gold.schedule_plan;
    v_at   timestamptz;
BEGIN
    v_wc := gold.resolve_line(p_line);
    SELECT * INTO v_plan FROM gold.v_latest_plan WHERE work_center_id = v_wc.work_center_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No plan for %', p_line USING ERRCODE = 'no_data_found';
    END IF;
    IF p_plan_version IS NOT NULL AND p_plan_version <> v_plan.plan_version THEN
        RAISE EXCEPTION 'Plan version % is stale; latest is %', p_plan_version, v_plan.plan_version
            USING ERRCODE = 'serialization_failure';
    END IF;

    INSERT INTO gold.plan_decision (schedule_plan_id, decision, decided_by, comment)
    VALUES (v_plan.schedule_plan_id, 'ACCEPT', p_decided_by, p_comment)
    RETURNING decided_at INTO v_at;
    UPDATE gold.schedule_plan SET status = 'ACCEPTED' WHERE schedule_plan_id = v_plan.schedule_plan_id;

    RETURN jsonb_build_object('acceptedAt', to_char(v_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
                              'lineId', coalesce(v_wc.demo_line_id, v_wc.work_center_code),
                              'planVersion', v_plan.plan_version);
END
$$;

-- POST /demo/plant/reset: void the line's ingest events, drop its plans, rebuild baseline v1.
CREATE FUNCTION gold.reset_demo(p_line text) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
    v_wc silver.work_center;
BEGIN
    v_wc := gold.resolve_line(p_line);
    PERFORM pg_advisory_xact_lock(hashtext('gold.replan'), v_wc.work_center_id::int);

    CREATE TEMP TABLE _voided ON COMMIT DROP AS
    SELECT ie.ingest_event_id FROM raw.ingest_event ie
    WHERE ie.voided_at IS NULL AND (gold.resolve_line(ie.line_id)).work_center_id = v_wc.work_center_id;

    UPDATE raw.ingest_event SET voided_at = clock_timestamp(), void_reason = 'reset_demo'
    WHERE ingest_event_id IN (SELECT ingest_event_id FROM _voided);

    DELETE FROM gold.schedule_plan WHERE work_center_id = v_wc.work_center_id;
    DELETE FROM gold.plan_event WHERE work_center_id = v_wc.work_center_id;
    DELETE FROM silver.process_order_change WHERE ingest_event_id IN (SELECT ingest_event_id FROM _voided);
    DELETE FROM silver.quality_test WHERE ingest_event_id IN (SELECT ingest_event_id FROM _voided);
    DELETE FROM silver.process_order_source
    WHERE source_csv = 'raw.ingest_event' AND source_row_number IN (SELECT ingest_event_id FROM _voided);
    DROP TABLE _voided;

    -- v4: void the note reviews made for this line's open POs (text-wide reviews of notes on the line too)
    UPDATE raw.note_review r SET voided_at = clock_timestamp(), void_reason = 'reset_demo'
    WHERE r.voided_at IS NULL
      AND r.note_hash IN (SELECT sn.note_hash FROM gold.source_note sn
                          JOIN gold.v_open_queue q ON q.line_schedule_item_id = sn.line_schedule_item_id
                          WHERE q.work_center_id = v_wc.work_center_id)
      AND (r.po_number IS NULL
           OR r.po_number IN (SELECT q.po_number FROM gold.v_open_queue q WHERE q.work_center_id = v_wc.work_center_id));
    PERFORM gold.refresh_semantic_facts();

    PERFORM gold.replan(v_wc.work_center_code);
    RETURN gold.queue_response(p_line);
END
$$;

-- Replay every non-voided ingest event in arrival order (build step after the baseline). Events that no longer
-- validate against the rebuilt data are skipped with a warning.
CREATE FUNCTION gold.replay_ingest_events() RETURNS int
LANGUAGE plpgsql AS $$
DECLARE
    r record;
    n int := 0;
BEGIN
    FOR r IN SELECT ingest_event_id FROM raw.ingest_event WHERE voided_at IS NULL ORDER BY ingest_event_id LOOP
        BEGIN
            PERFORM gold.process_ingest_event(r.ingest_event_id);
            n := n + 1;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'ingest_event % skipped: %', r.ingest_event_id, SQLERRM;
        END;
    END LOOP;
    RETURN n;
END
$$;

-- Agent API context for one plan (blueprint §7.4): facts only, with the ids the explanation may cite.
CREATE FUNCTION gold.agent_context(p_schedule_plan_id bigint, p_locale text DEFAULT 'en') RETURNS jsonb
LANGUAGE sql STABLE AS $$
    WITH p AS (
        SELECT sp.*, wc.work_center_code, coalesce(wc.demo_line_id, wc.work_center_code) AS line_id
        FROM gold.schedule_plan sp JOIN silver.work_center wc USING (work_center_id)
        WHERE sp.schedule_plan_id = p_schedule_plan_id
    ), q AS (
        SELECT * FROM gold.v_plan_queue WHERE schedule_plan_id = p_schedule_plan_id
    ), cited AS (
        SELECT
            (SELECT jsonb_agg(DISTINCT po_number) FROM q) AS po_numbers,
            (SELECT jsonb_agg(DISTINCT lot_number) FROM q WHERE lot_number IS NOT NULL) AS lot_numbers,
            (SELECT jsonb_agg(DISTINCT (r ->> 'params')::jsonb ->> 'quality_test_id')
             FROM q, jsonb_array_elements(q.reasons) r WHERE r -> 'params' ? 'quality_test_id') AS quality_test_ids,
            (SELECT jsonb_agg(DISTINCT o) FROM q, jsonb_array_elements(q.reasons) r,
                    jsonb_array_elements_text(r -> 'params' -> 'order_numbers') o) AS order_numbers
    ), facts AS (
        SELECT jsonb_agg(DISTINCT jsonb_build_object(
                   'factId', sf.semantic_fact_id, 'po', po.po_number, 'type', sf.fact_type,
                   'label', coalesce(sf.fact_value ->> 'reason', sf.fact_type), 'note', sn.note_text,
                   'source', sn.source_csv || ':' || sn.source_row_number || ':' || sn.source_column,
                   'status', sf.status, 'reader', sf.model_id, 'confidence', sf.confidence)) AS facts,
               jsonb_agg(DISTINCT sf.semantic_fact_id) AS fact_ids
        FROM gold.schedule_entry se
        JOIN gold.entry_reason er USING (schedule_entry_id)
        JOIN gold.entry_reason_fact erf USING (entry_reason_id)
        JOIN gold.semantic_fact sf USING (semantic_fact_id)
        JOIN gold.source_note sn USING (source_note_id)
        LEFT JOIN silver.process_order po ON po.process_order_id = sf.process_order_id
        WHERE se.schedule_plan_id = p_schedule_plan_id
    )
    SELECT jsonb_build_object(
        'lineId', p.line_id,
        'workCenter', p.work_center_code,
        'planVersion', p.plan_version,
        'locale', p_locale,
        'event', (SELECT jsonb_strip_nulls(jsonb_build_object(
                      'type', pe.event_type, 'source', pe.source, 'po', po.po_number,
                      'failedFor', pe.payload ->> 'failedFor', 'priority', pe.payload -> 'priority',
                      'scheduledFinish', pe.payload ->> 'scheduledFinish', 'ingestEventId', pe.ingest_event_id,
                      'receivedAt', pe.created_at))
                  FROM gold.plan_event pe LEFT JOIN silver.process_order po USING (process_order_id)
                  WHERE pe.plan_event_id = p.plan_event_id),
        'queue', (SELECT jsonb_agg(q.queue_row || jsonb_build_object(
                      'position', q.position, 'variety', q.variety_code, 'lot', q.lot_number,
                      'dueDate', q.due_date, 'slackDays', q.slack_days, 'reasons', q.reasons) ORDER BY q.position) FROM q),
        'diff', (SELECT jsonb_build_object('moves', d.moves, 'reasons', d.reasons, 'held', d.held,
                                           'added', d.added, 'removed', d.removed)
                 FROM gold.v_plan_diff d WHERE d.schedule_plan_id = p_schedule_plan_id),
        'facts', coalesce(facts.facts, '[]'),
        'constraints', jsonb_build_object(
            'heuristic', p.created_by,
            'policy', (SELECT jsonb_build_object('policyId', pol.policy_id, 'version', pol.policy_version,
                                                 'rankingMode', pol.ranking_mode, 'criteria', pol.criteria,
                                                 'factMinConfidence', pol.fact_min_confidence)
                       FROM gold.policy pol WHERE pol.policy_id = p.policy_id),
            'horizonStart', p.horizon_start,
            'changeover', (SELECT jsonb_agg(jsonb_build_object('transition', r.transition_code, 'hours', r.hours,
                                                               'source', r.rule_source, 'n', r.derived_n)
                                            ORDER BY r.hours)
                           FROM gold.changeover_rule r WHERE r.work_center_id = p.work_center_id),
            'throughputKgPerH', (SELECT t.median_kg_per_h FROM gold.v_throughput t
                                 WHERE t.work_center_id = p.work_center_id AND t.grain = 'WORK_CENTER')),
        'citable', jsonb_build_object('poNumbers', coalesce(cited.po_numbers, '[]'),
                                      'lotNumbers', coalesce(cited.lot_numbers, '[]'),
                                      'qualityTestIds', coalesce(cited.quality_test_ids, '[]'),
                                      'orderNumbers', coalesce(cited.order_numbers, '[]'),
                                      'factIds', coalesce(facts.fact_ids, '[]')),
        'notes', jsonb_build_array(
            'Cite only ids listed in citable; never invent POs, dates or fail codes.',
            'Customer orders are synthetic (not in the Pasco extracts).',
            'Accepting a plan does not write to SAP/ERP.',
            'Facts are readings of free-text notes; quote the note, cite its factId, and say when it is an assumption (rules-v1).'))
    FROM p, cited, facts
$$;

-- GET /batches/{po}: one PO with material, lot, schedules, QA, runs, demand and its place in the latest plans.
CREATE FUNCTION gold.batch_detail(p_po text) RETURNS jsonb
LANGUAGE sql STABLE AS $$
    SELECT jsonb_strip_nulls(jsonb_build_object(
        'po', po.po_number,
        'poType', po.po_type,
        'inSap', po.is_in_sap,
        'sapStatus', po.sap_status,
        'sapFinishDate', po.sap_finish_date,
        'sapPriority', po.priority_rank,
        'sapNotes', po.sap_notes,
        'material', m.material_description,
        'species', sp.species_code,
        'variety', m.variety_code,
        'lot', l.lot_number,
        'cropYear', l.crop_year,
        'dqFlags', to_jsonb(po.dq_flags),
        'schedules', (SELECT jsonb_agg(jsonb_build_object('workCenter', wc.work_center_code, 'status', li.status_code,
                                                          'priority', li.priority_rank, 'scheduledFinish', li.scheduled_finish_date,
                                                          'inputKg', li.input_kg, 'trait', li.trait_family_code,
                                                          'source', li.source_csv || ':' || li.source_row_number)
                                       ORDER BY li.source_csv, li.source_row_number)
                      FROM silver.line_schedule_item li JOIN silver.work_center wc USING (work_center_id)
                      WHERE li.process_order_id = po.process_order_id),
        'quality', (SELECT to_jsonb(qs) - 'process_order_id' FROM gold.v_po_quality_status qs
                    WHERE qs.process_order_id = po.process_order_id),
        'qualityTests', (SELECT jsonb_agg(jsonb_build_object('qualityTestId', qt.quality_test_id, 'date', qt.test_date,
                                                             'result', qt.result_code, 'failReason', qt.fail_reason_code,
                                                             'outputBatch', qt.output_batch_number, 'kg', qt.batch_kg,
                                                             'source', qt.source_csv || ':' || qt.source_row_number)
                                          ORDER BY qt.test_date DESC, qt.quality_test_id DESC)
                         FROM silver.quality_test qt WHERE qt.process_order_id = po.process_order_id),
        'conditioningRuns', (SELECT jsonb_build_object('count', count(*), 'inputKg', sum(cr.input_kg),
                                                       'outputKg', sum(cr.output_kg), 'runH', sum(cr.run_h),
                                                       'lastRunDate', max(cr.run_date))
                             FROM silver.conditioning_run cr WHERE cr.process_order_id = po.process_order_id),
        'customerOrders', (SELECT jsonb_agg(jsonb_build_object('orderNumber', o.order_number, 'needBy', o.need_by_date,
                                                               'tier', o.priority_tier, 'slackDays', o.slack_days,
                                                               'atRisk', o.is_at_risk, 'synthetic', o.is_synthetic))
                           FROM gold.v_order_risk o WHERE o.po_number = po.po_number),
        'plans', (SELECT jsonb_agg(jsonb_build_object('lineId', q.line_id, 'planVersion', q.plan_version,
                                                      'position', q.position, 'status', q.entry_status,
                                                      'reasons', q.reasons))
                  FROM gold.v_plan_queue q JOIN gold.v_latest_plan lp USING (schedule_plan_id)
                  WHERE q.process_order_id = po.process_order_id)))
    FROM silver.process_order po
    LEFT JOIN silver.material m ON m.material_id = po.material_id
    LEFT JOIN silver.species sp ON sp.species_id = po.species_id
    LEFT JOIN silver.lot l ON l.lot_id = po.lot_id
    WHERE po.po_number = (silver.norm_po(p_po)).po_number
$$;

-- v4 (D-03): store a reading of one note text (Bedrock via the Agent API -> Data API, or a person) and refresh the
-- facts. Idempotent on (note_hash, reader, model_id, prompt_version). The Agent API never writes to the database.
CREATE FUNCTION gold.record_note_reading(p_note_text text, p_reader text, p_model_id text, p_prompt_version text,
                                         p_facts jsonb, p_read_by text DEFAULT current_user)
RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
    v_hash char(64) := gold.note_hash(p_note_text);
    v_id   bigint;
    v_bad  text;
BEGIN
    IF p_reader NOT IN ('BEDROCK', 'HUMAN', 'RULE') THEN
        RAISE EXCEPTION 'reader must be BEDROCK, HUMAN or RULE' USING ERRCODE = 'invalid_parameter_value';
    END IF;
    IF jsonb_typeof(p_facts) IS DISTINCT FROM 'array' THEN
        RAISE EXCEPTION 'facts must be a JSON array' USING ERRCODE = 'invalid_parameter_value';
    END IF;
    SELECT string_agg(coalesce(f ->> 'fact_type', 'null'), ', ') INTO v_bad
    FROM jsonb_array_elements(p_facts) f
    WHERE coalesce(f ->> 'fact_type', '') NOT IN ('NOT_READY', 'HOLD', 'RELEASE', 'RUSH', 'DEADLINE', 'INFO')
       OR (f ? 'confidence' AND NOT ((f ->> 'confidence')::numeric BETWEEN 0 AND 1));
    IF v_bad IS NOT NULL THEN
        RAISE EXCEPTION 'invalid facts: %', v_bad USING ERRCODE = 'invalid_parameter_value';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM gold.source_note WHERE note_hash = v_hash) THEN
        RAISE EXCEPTION 'no source note has this text' USING ERRCODE = 'no_data_found';
    END IF;

    INSERT INTO raw.note_reading (note_hash, note_text, reader, model_id, prompt_version, facts, read_by)
    VALUES (v_hash, btrim(p_note_text), p_reader, p_model_id, p_prompt_version, p_facts, p_read_by)
    ON CONFLICT (note_hash, reader, model_id, prompt_version) DO NOTHING
    RETURNING note_reading_id INTO v_id;
    PERFORM gold.refresh_semantic_facts();

    RETURN jsonb_build_object('noteHash', v_hash, 'noteReadingId', v_id, 'created', v_id IS NOT NULL,
                              'occurrences', (SELECT count(*) FROM gold.source_note WHERE note_hash = v_hash));
END
$$;

-- v4: a person confirms or rejects one fact. Stored in raw.note_review (durable), facts refreshed; when the fact sits on
-- an open row of a line that has plans, a note_review plan_event is written and the line is replanned.
-- p_scope 'PO' = this PO only; 'TEXT' = every occurrence of the same note text.
CREATE FUNCTION gold.review_fact(p_semantic_fact_id bigint, p_decision text, p_reviewed_by text DEFAULT current_user,
                                 p_comment text DEFAULT NULL, p_scope text DEFAULT 'PO')
RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
    v_f     record;
    v_event bigint;
    v_plan  bigint;
BEGIN
    IF p_decision NOT IN ('CONFIRMED', 'REJECTED') OR p_scope NOT IN ('PO', 'TEXT') THEN
        RAISE EXCEPTION 'decision CONFIRMED|REJECTED, scope PO|TEXT' USING ERRCODE = 'invalid_parameter_value';
    END IF;
    SELECT sf.*, sn.note_hash, sn.note_text, sn.line_schedule_item_id, po.po_number INTO v_f
    FROM gold.semantic_fact sf
    JOIN gold.source_note sn USING (source_note_id)
    LEFT JOIN silver.process_order po ON po.process_order_id = sf.process_order_id
    WHERE sf.semantic_fact_id = p_semantic_fact_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'semantic_fact % not found', p_semantic_fact_id USING ERRCODE = 'no_data_found';
    END IF;
    IF p_scope = 'PO' AND v_f.po_number IS NULL THEN
        RAISE EXCEPTION 'fact % has no PO: use scope TEXT', p_semantic_fact_id USING ERRCODE = 'invalid_parameter_value';
    END IF;

    INSERT INTO raw.note_review (note_hash, po_number, fact_type, decision, comment, reviewed_by)
    VALUES (v_f.note_hash, CASE WHEN p_scope = 'PO' THEN v_f.po_number END, v_f.fact_type, p_decision, p_comment, p_reviewed_by);
    PERFORM gold.refresh_semantic_facts();

    IF EXISTS (SELECT 1 FROM gold.v_open_queue q WHERE q.line_schedule_item_id = v_f.line_schedule_item_id)
       AND EXISTS (SELECT 1 FROM gold.schedule_plan sp WHERE sp.work_center_id = v_f.work_center_id) THEN
        INSERT INTO gold.plan_event (work_center_id, event_type, source, process_order_id, payload, created_by)
        VALUES (v_f.work_center_id, 'note_review', 'ui_manual', v_f.process_order_id,
                jsonb_build_object('semanticFactId', p_semantic_fact_id, 'factType', v_f.fact_type, 'decision', p_decision,
                                   'scope', p_scope, 'note', v_f.note_text, 'po', v_f.po_number),
                p_reviewed_by)
        RETURNING plan_event_id INTO v_event;
        v_plan := gold.replan((SELECT work_center_code FROM silver.work_center WHERE work_center_id = v_f.work_center_id), v_event);
        RETURN gold.event_response(v_plan);
    END IF;
    RETURN jsonb_build_object('semanticFactId', p_semantic_fact_id,
                              'status', (SELECT status FROM gold.semantic_fact WHERE semantic_fact_id = p_semantic_fact_id),
                              'replanned', false);
END
$$;
