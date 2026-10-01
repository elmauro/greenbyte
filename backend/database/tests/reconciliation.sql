-- Reconciliation checks (observations.md §9.4 + DQ catalog §8, corrected counts in uc1-data-model §3).
-- Run by etl/build_model.py inside the build transaction (any mismatch rolls the build back) or with --checks-only.
-- Rows created from raw.ingest_event are excluded so the checks hold after demo events.

CREATE TEMP TABLE _check (check_name text PRIMARY KEY, expected text, actual text) ON COMMIT DROP;

INSERT INTO _check VALUES
-- row counts
('process_order from SAP', '202', (SELECT count(*)::text FROM silver.process_order WHERE is_in_sap)),
('process_order routed (components)', '214', (SELECT count(*)::text FROM silver.process_order_work_center)),
('line_schedule_item rows (7 schedules)', '4067', (SELECT count(*)::text FROM silver.line_schedule_item)),
('conditioning_run rows (LSV 1899 + SSV 2230)', '4129', (SELECT count(*)::text FROM silver.conditioning_run)),
('quality_test rows from the pass/fail log', '3142',
    (SELECT count(*)::text FROM silver.quality_test WHERE source_csv = 'lsv_pass_fail_log.csv')),
('work centers (31 + LSVHANDPICK)', '32', (SELECT count(*)::text FROM silver.work_center)),
('open LSVLN1 queue', '12', (SELECT count(*)::text FROM gold.v_open_queue WHERE work_center_code = 'LSVLN1')),
('open LSVLN1 queue: NEW / RELEASED / ONLINE', '7/4/1',
    (SELECT count(*) FILTER (WHERE status_code = 'NEW') || '/' || count(*) FILTER (WHERE status_code = 'RELEASED')
            || '/' || count(*) FILTER (WHERE status_code = 'ONLINE')
     FROM gold.v_open_queue WHERE work_center_code = 'LSVLN1')),
('all open LSVLN1 POs are in SAP', '12',
    (SELECT count(*)::text FROM gold.v_open_queue q JOIN silver.process_order po USING (process_order_id)
     WHERE q.work_center_code = 'LSVLN1' AND po.is_in_sap)),
-- Worksheet slices vs Excel SAP data by WorkCenter (15 / 40 / 22 / 16 / 42 / 24 / 43)
('SAP slice LSV Line 1', (SELECT count(*)::text FROM raw.lsv_line_1),
    (SELECT count(*)::text FROM silver.process_order po JOIN silver.work_center wc USING (work_center_id)
     WHERE po.is_in_sap AND wc.work_center_code = 'LSVLN1')),
('SAP slice LSV Line 2', (SELECT count(*)::text FROM raw.lsv_line_2),
    (SELECT count(*)::text FROM silver.process_order po JOIN silver.work_center wc USING (work_center_id)
     WHERE po.is_in_sap AND wc.work_center_code = 'LSVLN2')),
('SAP slice LSV Gravity', (SELECT count(*)::text FROM raw.lsv_gravity),
    (SELECT count(*)::text FROM silver.process_order po JOIN silver.work_center wc USING (work_center_id)
     WHERE po.is_in_sap AND wc.work_center_code = 'LSVGRVTY')),
('SAP slice SSV Line 3 (+ repair)', (SELECT count(*)::text FROM raw.ssv_line_3),
    (SELECT count(*)::text FROM silver.process_order po JOIN silver.work_center wc USING (work_center_id)
     WHERE po.is_in_sap AND wc.work_center_code IN ('SSVLN3', 'SSVRPR3'))),
('SAP slice SSV Line 5 (+ repair)', (SELECT count(*)::text FROM raw.ssv_line_5),
    (SELECT count(*)::text FROM silver.process_order po JOIN silver.work_center wc USING (work_center_id)
     WHERE po.is_in_sap AND wc.work_center_code IN ('SSVLN5', 'SSVRPR5'))),
('SAP slice SSV Line 6 (+ repair)', (SELECT count(*)::text FROM raw.ssv_line_6),
    (SELECT count(*)::text FROM silver.process_order po JOIN silver.work_center wc USING (work_center_id)
     WHERE po.is_in_sap AND wc.work_center_code IN ('SSVLN6', 'SSVRPR6'))),
('SAP slice Seed Health', (SELECT count(*)::text FROM raw.seed_health),
    (SELECT count(*)::text FROM silver.process_order po JOIN silver.work_center wc USING (work_center_id)
     WHERE po.is_in_sap AND wc.work_center_code = 'PASSHLTH')),
-- lineage: every CSV-sourced fact row maps 1:1 to its raw row and carries the file hash
('lineage: silver fact rows = raw rows per CSV', '0',
    (SELECT count(*)::text FROM (
        SELECT source_csv, count(*) AS n FROM (
            SELECT source_csv FROM silver.line_schedule_item
            UNION ALL SELECT source_csv FROM silver.conditioning_run
            UNION ALL SELECT source_csv FROM silver.quality_test WHERE source_csv <> 'raw.ingest_event') s
        GROUP BY source_csv) s
     JOIN silver.v_source_file sf ON sf.csv_name = s.source_csv
     JOIN raw.load_file lf ON lf.csv_name = s.source_csv AND lf.load_id = sf.load_id
     WHERE s.n <> lf.rows_loaded)),
('lineage: fact rows without file hash', '0',
    (SELECT count(*)::text FROM (
        SELECT source_file_sha256 FROM silver.line_schedule_item
        UNION ALL SELECT source_file_sha256 FROM silver.conditioning_run
        UNION ALL SELECT source_file_sha256 FROM silver.quality_test WHERE source_csv <> 'raw.ingest_event'
        UNION ALL SELECT source_file_sha256 FROM silver.process_order) s
     WHERE source_file_sha256 IS NULL)),
('lineage: POs without a source row', '0',
    (SELECT count(*)::text FROM silver.process_order po
     WHERE NOT EXISTS (SELECT 1 FROM silver.process_order_source s WHERE s.process_order_id = po.process_order_id))),
-- typing: no source value silently lost
('schedule rows without finish date = blank source cells', (
        SELECT ((SELECT count(*) FROM raw.line_1_schedule WHERE scheduled_finish_date IS NULL)
              + (SELECT count(*) FROM raw.line_2_schedule WHERE scheduled_finish_date IS NULL)
              + (SELECT count(*) FROM raw.gravity_schedule WHERE scheduled_finish_date IS NULL)
              + (SELECT count(*) FROM raw.colorsort_schedule WHERE scheduled_finish_date IS NULL)
              + (SELECT count(*) FROM raw.line_3_schedule WHERE scheduled_finish_date IS NULL)
              + (SELECT count(*) FROM raw.line_5_schedule WHERE scheduled_finish_date IS NULL)
              + (SELECT count(*) FROM raw.line_6_schedule WHERE scheduled_finish_date IS NULL))::text),
    (SELECT count(*)::text FROM silver.line_schedule_item WHERE scheduled_finish_date IS NULL)),
('conditioning runs without run_date', '0', (SELECT count(*)::text FROM silver.conditioning_run WHERE run_date IS NULL)),
('conditioning runs without work center', '0', (SELECT count(*)::text FROM silver.conditioning_run WHERE work_center_id IS NULL)),
('quality tests without work center', '0',
    (SELECT count(*)::text FROM silver.quality_test WHERE work_center_id IS NULL AND source_csv <> 'raw.ingest_event')),
('materials not parsed (DQ-12)', '13', (SELECT count(*)::text FROM silver.material WHERE NOT is_parsed)),
-- capacity (uc1-data-model §4.2)
('LSVLN1 median kg/h, output basis (source KG per hour)', '1114',
    (SELECT round(median_output_kg_per_h)::text FROM gold.v_throughput WHERE work_center_code = 'LSVLN1' AND grain = 'WORK_CENTER')),
('LSVLN1 median kg/h, input basis (duration rate)', '1377',
    (SELECT round(median_kg_per_h)::text FROM gold.v_throughput WHERE work_center_code = 'LSVLN1' AND grain = 'WORK_CENTER')),
('LSVLN1 changeover rules', 'SAME_SPECIES,SAME_VARIETY,SPECIES_CHANGE',
    (SELECT string_agg(r.transition_code, ',' ORDER BY r.transition_code) FROM gold.changeover_rule r
     JOIN silver.work_center wc USING (work_center_id) WHERE wc.work_center_code = 'LSVLN1')),
-- synthetic demand
('synthetic customer orders', '16', (SELECT count(*)::text FROM silver.customer_order WHERE is_synthetic)),
-- plans
('line-1 has a plan', 'true', (SELECT (count(*) > 0)::text FROM gold.schedule_plan sp
                                JOIN silver.work_center wc USING (work_center_id) WHERE wc.demo_line_id = 'line-1')),
('line-1 v1 baseline: 12 entries, ONLINE PO first', '12|1002267630',
    (SELECT count(*) || '|' || min(po_number) FILTER (WHERE position = 1) FROM gold.v_plan_queue
     WHERE line_id = 'line-1' AND plan_version = 1));

-- DQ flag counts per table (CSV rows only). Exact where observations §8 is exact; the rest are the v3 counts.
INSERT INTO _check
SELECT 'DQ ' || e.table_name || ' ' || e.dq_code, e.n::text,
       coalesce((SELECT sum(d.n_rows)::text FROM gold.v_dq_summary d
                 WHERE d.table_name = e.table_name AND d.dq_code = e.dq_code
                   AND d.source_csv IS DISTINCT FROM 'raw.ingest_event'), '0')
FROM (VALUES
    ('silver.conditioning_run', 'DQ-02', 6), ('silver.conditioning_run', 'DQ-03', 15),
    ('silver.conditioning_run', 'DQ-04', 4), ('silver.conditioning_run', 'DQ-05', 13),
    ('silver.conditioning_run', 'DQ-07', 94), ('silver.conditioning_run', 'DQ-08', 29),
    ('silver.conditioning_run', 'DQ-11', 6), ('silver.conditioning_run', 'DQ-13', 1),
    ('silver.conditioning_run', 'DQ-23', 551),
    ('silver.line_schedule_item', 'DQ-03', 1), ('silver.line_schedule_item', 'DQ-04', 12),
    ('silver.line_schedule_item', 'DQ-06', 6), ('silver.line_schedule_item', 'DQ-07', 3),
    ('silver.line_schedule_item', 'DQ-08', 41), ('silver.line_schedule_item', 'DQ-10', 64),
    ('silver.line_schedule_item', 'DQ-11', 4), ('silver.line_schedule_item', 'DQ-16', 15),
    ('silver.line_schedule_item', 'DQ-17', 871),
    ('silver.quality_test', 'DQ-05', 2), ('silver.quality_test', 'DQ-10', 658),
    ('silver.quality_test', 'DQ-11', 2), ('silver.quality_test', 'DQ-18', 74), ('silver.quality_test', 'DQ-23', 2),
    ('silver.process_order', 'DQ-07', 31), ('silver.process_order', 'DQ-14', 20), ('silver.process_order', 'DQ-15', 103),
    ('silver.process_order', 'DQ-16', 15), ('silver.process_order', 'DQ-23', 543),
    ('silver.material', 'DQ-12', 13)
) AS e (table_name, dq_code, n);

INSERT INTO _check VALUES
('DQ-16 on LSVLN1 (observations: 3 of 15)', '3',
    (SELECT count(*)::text FROM silver.line_schedule_item li JOIN silver.work_center wc USING (work_center_id)
     WHERE wc.work_center_code = 'LSVLN1' AND 'DQ-16' = ANY (li.dq_flags))),
('no unexpected DQ codes', '0',
    (SELECT count(*)::text FROM gold.v_dq_summary d
     WHERE d.source_csv IS DISTINCT FROM 'raw.ingest_event'
       AND NOT EXISTS (SELECT 1 FROM _check c WHERE c.check_name = 'DQ ' || d.table_name || ' ' || d.dq_code)));

DO $$
DECLARE
    v_fail text;
BEGIN
    SELECT string_agg(check_name || ' (expected ' || coalesce(expected, 'NULL') || ', got ' || coalesce(actual, 'NULL') || ')', '; ')
    INTO v_fail
    FROM _check WHERE expected IS DISTINCT FROM actual;
    IF v_fail IS NOT NULL THEN
        RAISE EXCEPTION 'Reconciliation failed: %', v_fail;
    END IF;
END
$$;
