-- Gold model v4 checks (etl/gold-model/WORKING-PLAN.md §4). Run by etl/build_model.py after the full build and after
-- --upgrade-gold-v4 (same transaction: any failure rolls back), or with --checks-only. Raises on any mismatch.

CREATE TEMP TABLE _check_v4 (check_name text PRIMARY KEY, expected text, actual text) ON COMMIT DROP;

INSERT INTO _check_v4 VALUES
('source_note business key unique', '0',
    (SELECT count(*)::text FROM (SELECT 1 FROM gold.source_note
                                 GROUP BY source_csv, source_row_number, source_column HAVING count(*) > 1) d)),
('schedule operational note cells (560 + 336 + 3)', '899',
    (SELECT count(*)::text FROM gold.source_note
     WHERE source_column IN ('run_order_note', 'priority_note', 'status_note') AND source_csv <> 'raw.ingest_event')),
('every operational note text has a rules-v1 reading', '0',
    (SELECT count(DISTINCT sn.note_hash)::text FROM gold.source_note sn
     WHERE sn.source_column IN ('run_order_note', 'priority_note', 'status_note')
       AND NOT EXISTS (SELECT 1 FROM raw.note_reading nr
                       WHERE nr.note_hash = sn.note_hash AND nr.reader = 'RULE' AND nr.model_id = 'rules-v1'))),
('semantic_fact has no orphan note or reading', '0',
    (SELECT count(*)::text FROM gold.semantic_fact sf
     WHERE NOT EXISTS (SELECT 1 FROM gold.source_note sn WHERE sn.source_note_id = sf.source_note_id)
        OR NOT EXISTS (SELECT 1 FROM raw.note_reading nr WHERE nr.note_reading_id = sf.note_reading_id))),
('v_trusted_fact grain (note x fact type)', '0',
    (SELECT count(*)::text FROM (SELECT 1 FROM gold.v_trusted_fact GROUP BY source_note_id, fact_type HAVING count(*) > 1) d)),
('ONLINE batches are never HOLD by a note', '0',
    (SELECT count(*)::text FROM gold.v_open_queue WHERE status_code = 'ONLINE' AND hold_reason IN ('NOT_READY', 'NOTE_HOLD'))),
('note-backed reasons cite a fact', '0',
    (SELECT count(*)::text FROM gold.entry_reason er JOIN gold.reason_code rc USING (reason_code_id)
     WHERE rc.reason_code IN ('NOT_READY_HOLD', 'NOT_READY_WARNING', 'NOTE_HOLD', 'NOTE_RUSH', 'NOTE_DEADLINE')
       AND NOT EXISTS (SELECT 1 FROM gold.entry_reason_fact f WHERE f.entry_reason_id = er.entry_reason_id))),
('every reason carries its param_keys', '0',
    (SELECT count(*)::text FROM gold.entry_reason er JOIN gold.reason_code rc USING (reason_code_id)
     WHERE NOT (er.params ?& rc.param_keys))),
('one ACTIVE policy resolves for every demo line', '0',
    (SELECT count(*)::text FROM silver.work_center wc
     WHERE wc.demo_line_id IS NOT NULL AND (gold.active_policy(wc.work_center_id)).policy_id IS NULL)),
('every plan cites its policy', '0',
    (SELECT count(*)::text FROM gold.schedule_plan WHERE policy_id IS NULL)),
-- Fumigation anchors on the open Line 1 queue (extract load 1): 4 FUMIGATED / 2 Not fumi / 1 Needs fumi!! / 5 no note
('LSVLN1 open rows not ready (Needs fumi!! + 2 x Not fumi)', '3',
    (SELECT count(*)::text FROM gold.v_open_queue WHERE work_center_code = 'LSVLN1' AND is_not_ready)),
('LSVLN1 held as NOT_READY (the ONLINE Not fumi batch keeps running)', '2',
    (SELECT count(*)::text FROM gold.v_open_queue WHERE work_center_code = 'LSVLN1' AND hold_reason = 'NOT_READY')),
('LSVLN1 running batch 1002267630 stays position 1 in the baseline', '1',
    (SELECT q.position::text FROM gold.v_plan_queue q
     WHERE q.line_id = 'line-1' AND q.plan_version = 1 AND q.po_number = '1002267630'));

DO $$
DECLARE
    v_fail text;
BEGIN
    SELECT string_agg(check_name || ' (expected ' || coalesce(expected, 'NULL') || ', got ' || coalesce(actual, 'NULL') || ')', '; ')
    INTO v_fail
    FROM _check_v4 WHERE expected IS DISTINCT FROM actual;
    IF v_fail IS NOT NULL THEN
        RAISE EXCEPTION 'Gold v4 checks failed: %', v_fail;
    END IF;
END
$$;
