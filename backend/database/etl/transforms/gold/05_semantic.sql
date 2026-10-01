-- Gold semantic engine (gold model v4, etl/gold-model/gold-data-model.md §3.2, S2T §5).
--   silver free text -> gold.source_note (occurrence) -> raw.note_reading (one reading per distinct text, durable)
--   -> gold.semantic_fact (fact x occurrence, status from raw.note_review / policy floor) -> gold.v_trusted_fact.
-- The ranking reads only trusted facts (AUTO / CONFIRMED) of the current reading of each note. The note stays as evidence.
-- Reader for the demo: rules-v1 (deterministic, D-03). Bedrock readings arrive later through gold.record_note_reading.

-- Normalized-text hash: every occurrence of the same note shares one reading.
CREATE FUNCTION gold.note_hash(p_text text) RETURNS char(64)
LANGUAGE sql IMMUTABLE STRICT AS $$
    SELECT encode(sha256(convert_to(upper(btrim(regexp_replace(p_text, '\s+', ' ', 'g'))), 'UTF8')), 'hex')
$$;

-- source_note: one row per non-empty free-text cell. Insert-only (ON CONFLICT DO NOTHING) so ids stay stable
-- when it is refreshed at runtime.
CREATE FUNCTION gold.refresh_source_notes() RETURNS int
LANGUAGE plpgsql AS $$
DECLARE
    n int;
BEGIN
    INSERT INTO gold.source_note
        (source_csv, source_row_number, source_column, note_text, note_hash, process_order_id, line_schedule_item_id,
         quality_test_id, conditioning_run_id, work_center_id)
    SELECT x.source_csv, x.source_row_number, x.source_column, x.note_text, gold.note_hash(x.note_text),
           x.process_order_id, x.line_schedule_item_id, x.quality_test_id, x.conditioning_run_id, x.work_center_id
    FROM (
        SELECT li.source_csv, li.source_row_number, c.source_column, btrim(c.note_text) AS note_text,
               li.process_order_id, li.line_schedule_item_id, NULL::bigint AS quality_test_id,
               NULL::bigint AS conditioning_run_id, li.work_center_id
        FROM silver.line_schedule_item li
        CROSS JOIN LATERAL (VALUES ('run_order_note', li.run_order_note), ('priority_note', li.priority_note),
                                   ('status_note', li.status_note), ('comments', li.comments)) c (source_column, note_text)
        UNION ALL
        SELECT po.source_csv, po.source_row_number, 'sap_notes', btrim(po.sap_notes),
               po.process_order_id, NULL, NULL, NULL, po.work_center_id
        FROM silver.process_order po
        WHERE po.source_csv = 'excel_sap_data.csv'
        UNION ALL
        SELECT qt.source_csv, qt.source_row_number, 'comments', btrim(qt.comments),
               qt.process_order_id, NULL, qt.quality_test_id, NULL, qt.work_center_id
        FROM silver.quality_test qt
        UNION ALL
        SELECT cr.source_csv, cr.source_row_number, 'defect_comments', btrim(cr.defect_comments),
               cr.process_order_id, NULL, NULL, cr.conditioning_run_id, cr.work_center_id
        FROM silver.conditioning_run cr
    ) x
    WHERE nullif(x.note_text, '') IS NOT NULL
    ORDER BY x.source_csv, x.source_row_number, x.source_column
    ON CONFLICT (source_csv, source_row_number, source_column) DO NOTHING;
    GET DIAGNOSTICS n = ROW_COUNT;
    RETURN n;
END
$$;

-- rules-v1: every rule is checked (a note can carry several facts, e.g. "RUSH - needs fumigated").
-- Patterns are evidence-based (S2T §5.2) and all need plant confirmation (SQ-01, SQ-05, SQ-07).
-- confidence < policy.fact_min_confidence (0.70) => NEEDS_CONFIRMATION, not used by the ranking.
CREATE FUNCTION gold.rules_v1_facts(p_text text) RETURNS jsonb
LANGUAGE sql IMMUTABLE AS $$
    WITH n AS (SELECT upper(btrim(regexp_replace(coalesce(p_text, ''), '\s+', ' ', 'g'))) AS t)
    SELECT coalesce(jsonb_agg(jsonb_build_object('fact_type', r.fact_type, 'fact_value', r.fact_value,
                                                 'applies_to', 'UNKNOWN', 'confidence', r.confidence,
                                                 'rule', r.rule_code) ORDER BY r.ord), '[]'::jsonb)
    FROM n, (VALUES
        (1, 'FUMI_NOT_DONE',  'NOT_READY', '{"reason": "FUMIGATION"}'::jsonb, 0.90),
        (2, 'FUMI_PENDING',   'NOT_READY', '{"reason": "FUMIGATION", "conditional": true}'::jsonb, 0.60),
        (3, 'FUMI_DONE',      'RELEASE',   '{"reason": "FUMIGATION"}'::jsonb, 0.90),
        (4, 'RAW_GERM_WAIT',  'NOT_READY', '{"reason": "RAW_GERM_PENDING"}'::jsonb, 0.80),
        (5, 'HOLD_TEXT',      'HOLD',      '{}'::jsonb, 0.80),
        (6, 'RUSH_TEXT',      'RUSH',      '{}'::jsonb, 0.85),
        (7, 'ROUTING_HINT',   'INFO',      '{}'::jsonb, 0.60)
    ) AS r (ord, rule_code, fact_type, fact_value, confidence)
    WHERE CASE r.rule_code
        WHEN 'FUMI_NOT_DONE' THEN n.t ~ '\mNOT FUMI' OR n.t ~ '\mNEEDS FUMI'
        WHEN 'FUMI_PENDING'  THEN n.t ~ '\mONCE FUMIGATED\M'
        WHEN 'FUMI_DONE'     THEN n.t ~ '^FUMIGATED\M'
        WHEN 'RAW_GERM_WAIT' THEN n.t ~ '\mWAIT FOR RAW GERM\M'
        WHEN 'HOLD_TEXT'     THEN n.t ~ '\mON HOLD\M' OR n.t ~ '^HOLD\M'
        WHEN 'RUSH_TEXT'     THEN n.t ~ '\mRUSH\M'
        WHEN 'ROUTING_HINT'  THEN n.t ~ '^\*[0-9]+$' OR n.t ~ '\mVMEK\M' OR n.t ~ '\mHAND ?PICK' OR n.t ~ '^LINE [0-9]+ GRAVITY'
                               OR n.t ~ '^PRIORITY\M' OR n.t ~ '\mQUALITY SAMPLES\M' OR n.t ~ '^SIZING\M' OR n.t ~ '^CONDITION'
    END
$$;
COMMENT ON FUNCTION gold.rules_v1_facts(text) IS 'Deterministic note reader rules-v1: typed facts for one note text (all matching rules)';

-- Read every distinct operational schedule note not yet read by rules-v1 (raw is durable: a rebuild reads only new texts).
CREATE FUNCTION gold.read_notes_rules() RETURNS int
LANGUAGE plpgsql AS $$
DECLARE
    n int;
BEGIN
    INSERT INTO raw.note_reading (note_hash, note_text, reader, model_id, prompt_version, facts)
    SELECT DISTINCT ON (sn.note_hash) sn.note_hash, sn.note_text, 'RULE', 'rules-v1', 'v1', gold.rules_v1_facts(sn.note_text)
    FROM gold.source_note sn
    WHERE sn.source_column IN ('run_order_note', 'priority_note', 'status_note')
    ORDER BY sn.note_hash, sn.source_note_id
    ON CONFLICT (note_hash, reader, model_id, prompt_version) DO NOTHING;
    GET DIAGNOSTICS n = ROW_COUNT;
    RETURN n;
END
$$;

-- semantic_fact: every source_note x every reading of its text x every fact. Upsert: the status is recomputed
-- (latest review wins, else the policy confidence floor), rows are never deleted.
CREATE FUNCTION gold.refresh_semantic_facts() RETURNS int
LANGUAGE plpgsql AS $$
DECLARE
    n int;
BEGIN
    INSERT INTO gold.semantic_fact
        (source_note_id, note_reading_id, fact_seq, process_order_id, work_center_id, fact_type, fact_value, applies_to,
         confidence, reader, model_id, prompt_version, status, reviewed_by, reviewed_at)
    SELECT sn.source_note_id, nr.note_reading_id, f.ord::smallint, sn.process_order_id, sn.work_center_id,
           f.fact ->> 'fact_type',
           coalesce(f.fact -> 'fact_value', '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object('rule', f.fact ->> 'rule')),
           coalesce(f.fact ->> 'applies_to', 'UNKNOWN'),
           (f.fact ->> 'confidence')::numeric,
           nr.reader, nr.model_id, nr.prompt_version,
           coalesce(rv.decision,
                    CASE WHEN nr.reader = 'HUMAN'
                           OR (f.fact ->> 'confidence')::numeric >= (gold.active_policy(sn.work_center_id)).fact_min_confidence
                         THEN 'AUTO' ELSE 'NEEDS_CONFIRMATION' END),
           rv.reviewed_by, rv.reviewed_at
    FROM gold.source_note sn
    JOIN raw.note_reading nr ON nr.note_hash = sn.note_hash
    CROSS JOIN LATERAL jsonb_array_elements(nr.facts) WITH ORDINALITY AS f (fact, ord)
    LEFT JOIN silver.process_order po ON po.process_order_id = sn.process_order_id
    LEFT JOIN LATERAL (
        SELECT r.decision, r.reviewed_by, r.reviewed_at
        FROM raw.note_review r
        WHERE r.voided_at IS NULL AND r.note_hash = sn.note_hash AND r.fact_type = f.fact ->> 'fact_type'
          AND (r.po_number = po.po_number OR r.po_number IS NULL)
        ORDER BY (r.po_number IS NULL), r.reviewed_at DESC, r.note_review_id DESC
        LIMIT 1) rv ON true
    ON CONFLICT (source_note_id, note_reading_id, fact_seq) DO UPDATE
        SET status = EXCLUDED.status, reviewed_by = EXCLUDED.reviewed_by, reviewed_at = EXCLUDED.reviewed_at;
    GET DIAGNOSTICS n = ROW_COUNT;
    RETURN n;
END
$$;

-- The reading that counts for each distinct text: HUMAN > BEDROCK > RULE, then the latest.
CREATE VIEW gold.v_note_reading_current AS
SELECT DISTINCT ON (nr.note_hash) nr.*
FROM raw.note_reading nr
ORDER BY nr.note_hash, CASE nr.reader WHEN 'HUMAN' THEN 1 WHEN 'BEDROCK' THEN 2 ELSE 3 END, nr.read_at DESC,
         nr.note_reading_id DESC;
COMMENT ON VIEW gold.v_note_reading_current IS 'Current reading per distinct note text (HUMAN > BEDROCK > RULE, latest first)';

-- Trusted facts: current reading only, AUTO or CONFIRMED. Grain: one note occurrence x fact type.
CREATE VIEW gold.v_trusted_fact AS
SELECT DISTINCT ON (sf.source_note_id, sf.fact_type)
       sf.semantic_fact_id, sf.source_note_id, sf.process_order_id, sn.line_schedule_item_id, sf.work_center_id,
       sn.source_csv, sn.source_row_number, sn.source_column, sn.note_text, sn.note_hash,
       sf.fact_type, sf.fact_value, coalesce(sf.fact_value ->> 'reason', sf.fact_type) AS fact_label,
       sf.applies_to, sf.confidence, sf.status, sf.reader, sf.model_id, sf.prompt_version, sf.note_reading_id
FROM gold.semantic_fact sf
JOIN gold.source_note sn USING (source_note_id)
JOIN gold.v_note_reading_current cur ON cur.note_reading_id = sf.note_reading_id
WHERE sf.status IN ('AUTO', 'CONFIRMED')
  AND sf.applies_to IN ('PO', 'LOT', 'UNKNOWN')
ORDER BY sf.source_note_id, sf.fact_type, sf.fact_seq;
COMMENT ON VIEW gold.v_trusted_fact IS
  'Facts the ranking may use: current reading of the note, status AUTO/CONFIRMED. One row per note occurrence x fact type';

SELECT gold.refresh_source_notes();
SELECT gold.read_notes_rules();
SELECT gold.refresh_semantic_facts();
