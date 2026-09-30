-- UC1 storyline end to end (docs/hackathon/uc1-blueprint-narrative.md): calm queue -> rush lands -> QA fail lands ->
-- scheduler accepts -> reset. Run by `etl/build_model.py --scenario` inside a transaction that is ROLLED BACK,
-- so it leaves no ingest events or plans behind.
--
-- Demo anchors (real open Line 1 POs in the extract):
--   rush    PO 1002295402  SWCO EA SUNGLOW, NEW, priority 9, last in the baseline -> SAP-style priority 2
--   qa_fail PO 1002307552  SWCO GH4927-C,   NEW, priority 5                       -> Fail / Dent on Line 1

DO $$
DECLARE
    v_q    jsonb;
    v_ev   jsonb;
    v_ctx  jsonb;
    v_acc  jsonb;
    v_pos  int;
    v_plan bigint;
BEGIN
    PERFORM gold.reset_demo('line-1');

    -- Act 1: calm morning
    v_q := gold.queue_response('line-1');
    ASSERT (v_q ->> 'planVersion')::int = 1, 'baseline is plan v1';
    ASSERT v_q -> 'lastEvent' = 'null'::jsonb, 'calm: no lastEvent';
    ASSERT jsonb_array_length(v_q -> 'queue') = 12, 'baseline has the 12 open LSVLN1 POs';
    ASSERT v_q -> 'queue' -> 0 ->> 'po' = '1002267630', 'ONLINE PO stays first';
    SELECT position INTO v_pos FROM gold.v_plan_queue WHERE line_id = 'line-1' AND plan_version = 1 AND po_number = '1002295402';
    ASSERT v_pos > 2, 'rush anchor starts low in the baseline';

    -- Act 2A: rush lands (SAP-style priority change)
    v_ev := gold.ingest_sap_priority_change('line-1', '1002295402', 2, '2026-10-03', 'scenario-rush-1');
    ASSERT v_ev ->> 'eventType' = 'rush', 'priority raise is a rush';
    ASSERT (v_ev ->> 'planVersion')::int = 2, 'rush creates v2';
    ASSERT v_ev -> 'queue' -> 1 ->> 'po' = '1002295402', 'rush PO moves to position 2 (after the running batch)';
    ASSERT v_ev -> 'diff' -> 'moves' @> '[{"po": "1002295402", "toPosition": 2}]', 'diff lists the rush move';
    ASSERT v_ev -> 'diff' -> 'reasons' ? 'rush_sap_priority_change', 'diff reason names the source';
    ASSERT gold.ingest_sap_priority_change('line-1', '1002295402', 2, '2026-10-03', 'scenario-rush-1') ->> 'planVersion' = '2',
        'same idempotency key does not replan again';

    -- Act 2B: QA fail lands (new LSV Pass_Fail Log row) on a batch already on the schedule
    v_ev := gold.ingest_pass_fail('line-1', '1002307552', 'Fail', 'Dent', 'Line 1');
    ASSERT v_ev ->> 'eventType' = 'qa_fail', 'Fail row is a qa_fail';
    ASSERT (v_ev ->> 'planVersion')::int = 3, 'QA fail creates v3';
    ASSERT v_ev -> 'diff' -> 'held' ? '1002307552', 'failed PO is held';
    ASSERT (SELECT r ->> 'status' FROM jsonb_array_elements(v_ev -> 'queue') r WHERE r ->> 'po' = '1002307552') = 'HOLD',
        'failed PO status HOLD in the queue';
    ASSERT (SELECT count(*) FROM gold.v_plan_queue q
            WHERE q.line_id = 'line-1' AND q.plan_version = 3 AND q.po_number = '1002307552'
              AND q.reasons @> '[{"code": "QA_HOLD"}]') = 1, 'QA_HOLD reason cites the test';
    ASSERT (SELECT count(*) FROM jsonb_array_elements(v_ev -> 'queue') r WHERE r ->> 'status' = 'PLANNED') = 11,
        'the rest of the line keeps moving';

    -- Act 3: facts-only package for the Agent
    SELECT schedule_plan_id INTO v_plan FROM gold.v_plan_queue WHERE line_id = 'line-1' AND plan_version = 3 LIMIT 1;
    v_ctx := gold.agent_context(v_plan);
    ASSERT v_ctx -> 'event' ->> 'po' = '1002307552', 'context names the event PO';
    ASSERT jsonb_array_length(v_ctx -> 'citable' -> 'qualityTestIds') = 1, 'context cites the failed test id';
    ASSERT NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(v_ctx -> 'citable' -> 'poNumbers') p
        WHERE NOT EXISTS (SELECT 1 FROM silver.process_order po WHERE po.po_number = p)), 'every citable PO exists';

    -- Act 4: the scheduler accepts (audit only)
    v_acc := gold.accept_plan('line-1', 3, 'scenario');
    ASSERT (v_acc ->> 'planVersion')::int = 3, 'accept returns the plan version';
    v_q := gold.queue_response('line-1');
    ASSERT (v_q ->> 'acceptedPlanVersion')::int = 3 AND v_q -> 'lastEvent' = 'null'::jsonb, 'accepted: pending event cleared';

    -- Stale accept is refused
    BEGIN
        PERFORM gold.accept_plan('line-1', 2, 'scenario');
        RAISE EXCEPTION 'stale accept should fail';
    EXCEPTION WHEN serialization_failure THEN NULL;
    END;

    -- An ingest for a PO that is not on the line is refused (no invented POs)
    BEGIN
        PERFORM gold.ingest_pass_fail('line-1', '1001884747', 'Fail', 'Dent', 'Line 1');
        RAISE EXCEPTION 'ingest for a completed PO should fail';
    EXCEPTION WHEN no_data_found THEN NULL;
    END;

    -- Act 5: reset for the next run
    v_q := gold.reset_demo('line-1');
    ASSERT (v_q ->> 'planVersion')::int = 1 AND v_q -> 'lastEvent' = 'null'::jsonb, 'reset returns to the calm baseline';
    ASSERT NOT EXISTS (SELECT 1 FROM silver.quality_test WHERE source_csv = 'raw.ingest_event'), 'reset removes ingested QA rows';

    RAISE NOTICE 'demo scenario passed';
END
$$;
