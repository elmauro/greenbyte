-- Gold serving views derived from silver (uc1-data-model §5.6). Metrics are always computed, never stored (R-DERIVED).

-- Capacity: kg/h by work center (grain WORK_CENTER) and by work center × species (grain SPECIES).
CREATE VIEW gold.v_throughput AS
SELECT wc.work_center_id,
       wc.work_center_code,
       CASE WHEN grouping(cr.species_code) = 1 THEN 'WORK_CENTER' ELSE 'SPECIES' END AS grain,
       cr.species_code,
       count(*) AS n_runs,
       round(percentile_cont(0.5) WITHIN GROUP (ORDER BY cr.input_kg / cr.run_h)::numeric, 1) AS median_kg_per_h,
       round(percentile_cont(0.75) WITHIN GROUP (ORDER BY cr.input_kg / cr.run_h)::numeric, 1) AS p75_kg_per_h,
       round(percentile_cont(0.5) WITHIN GROUP (ORDER BY cr.output_kg / cr.run_h)::numeric, 1) AS median_output_kg_per_h,
       round(percentile_cont(0.5) WITHIN GROUP (ORDER BY cr.input_kg
             / (coalesce(cr.prep_h, 0) + cr.run_h + coalesce(cr.cleandown_h, 0)))::numeric, 1) AS median_kg_per_total_h,
       round(percentile_cont(0.5) WITHIN GROUP (ORDER BY cr.loss_kg / cr.input_kg)::numeric, 4) AS median_scrap_fraction,
       round(percentile_cont(0.5) WITHIN GROUP (ORDER BY cr.prep_h)::numeric, 2) AS median_prep_h,
       round(percentile_cont(0.5) WITHIN GROUP (ORDER BY cr.cleandown_h)::numeric, 2) AS median_cleandown_h
FROM silver.conditioning_run cr
JOIN silver.work_center wc USING (work_center_id)
WHERE cr.run_h > 0 AND cr.input_kg > 0
GROUP BY GROUPING SETS ((wc.work_center_id, wc.work_center_code), (wc.work_center_id, wc.work_center_code, cr.species_code));
COMMENT ON VIEW gold.v_throughput IS
  'Median/p75 input kg per run hour (the source "RAW KG per hour"; run duration = input kg / this), output-basis median (the source "KG per hour"), scrap, prep, cleandown';

-- Transition of every logged run vs the previous run on the same work center (data model §4.3).
CREATE VIEW gold.v_run_transition AS
SELECT x.*,
       CASE
           WHEN x.prev_species_code IS NULL THEN NULL
           WHEN x.variety_code = x.prev_variety_code AND x.species_code = x.prev_species_code THEN 'SAME_VARIETY'
           WHEN x.species_code = x.prev_species_code THEN 'SAME_SPECIES'
           ELSE 'SPECIES_CHANGE'
       END AS transition_code
FROM (
    SELECT cr.conditioning_run_id, cr.work_center_id, cr.process_order_id, cr.run_date, cr.species_code, cr.variety_code,
           cr.prep_h, cr.cleandown_h,
           lag(cr.species_code) OVER w AS prev_species_code,
           lag(cr.variety_code) OVER w AS prev_variety_code
    FROM silver.conditioning_run cr
    WHERE cr.work_center_id IS NOT NULL
    WINDOW w AS (PARTITION BY cr.work_center_id ORDER BY cr.run_date, cr.source_csv, cr.source_row_number)
) x;

CREATE VIEW gold.v_changeover_observed AS
SELECT t.work_center_id, wc.work_center_code, t.transition_code,
       count(*) AS n,
       round(percentile_cont(0.5) WITHIN GROUP (ORDER BY t.prep_h)::numeric, 2) AS median_prep_h,
       round(percentile_cont(0.5) WITHIN GROUP (ORDER BY t.cleandown_h)::numeric, 2) AS median_cleandown_h,
       round(percentile_cont(0.5) WITHIN GROUP (ORDER BY coalesce(t.prep_h, 0) + coalesce(t.cleandown_h, 0))::numeric, 2)
           AS median_changeover_h
FROM gold.v_run_transition t
JOIN silver.work_center wc USING (work_center_id)
WHERE t.transition_code IS NOT NULL
GROUP BY t.work_center_id, wc.work_center_code, t.transition_code;
COMMENT ON VIEW gold.v_changeover_observed IS 'Prep / cleandown by transition vs the previous run; seeds gold.changeover_rule (DERIVED)';

-- QA status per PO. Assumption (Q-3 open): any FAIL on any output batch holds the whole PO.
CREATE VIEW gold.v_po_quality_status AS
SELECT qt.process_order_id,
       count(*) AS n_tests,
       count(*) FILTER (WHERE qt.result_code = 'PASS') AS n_pass,
       count(*) FILTER (WHERE qt.result_code = 'FAIL') AS n_fail,
       count(*) FILTER (WHERE qt.result_code = 'PENDING') AS n_pending,
       max(qt.test_date) AS latest_test_date,
       CASE
           WHEN count(*) FILTER (WHERE qt.result_code = 'FAIL') > 0 THEN 'FAIL'
           WHEN count(*) FILTER (WHERE qt.result_code = 'PENDING') > 0 THEN 'PENDING'
           ELSE 'PASS'
       END AS quality_status,
       (array_agg(qt.quality_test_id ORDER BY qt.test_date DESC, qt.quality_test_id DESC)
            FILTER (WHERE qt.result_code = 'FAIL'))[1] AS latest_fail_test_id,
       (array_agg(qt.fail_reason_code ORDER BY qt.test_date DESC, qt.quality_test_id DESC)
            FILTER (WHERE qt.result_code = 'FAIL'))[1] AS latest_fail_reason,
       bool_or(qt.ingest_event_id IS NOT NULL) AS has_ingested_result
FROM silver.quality_test qt
WHERE qt.process_order_id IS NOT NULL
GROUP BY qt.process_order_id;
COMMENT ON VIEW gold.v_po_quality_status IS 'PASS | FAIL | PENDING per PO (NOT_TESTED when absent). Any FAIL holds the PO (assumption, Q-3)';

-- Open queue per work center with effective values after ingest overlays (latest change wins per field).
CREATE VIEW gold.v_open_queue AS
SELECT li.line_schedule_item_id,
       wc.work_center_id, wc.work_center_code, wc.demo_line_id,
       po.process_order_id, po.po_number, po.po_type,
       li.species_code, m.variety_code, m.material_description, li.trait_family_code, li.size_fraction_code,
       l.lot_number,
       li.status_code, li.status_note, li.run_order, li.run_order_note,
       li.input_kg, li.input_qty, li.uom_code,
       li.priority_rank AS schedule_priority_rank, li.priority_note,
       coalesce(chp.priority_rank, li.priority_rank, po.priority_rank) AS priority_rank,
       CASE WHEN chp.priority_rank IS NOT NULL THEN 'INGEST'
            WHEN li.priority_rank IS NOT NULL THEN 'SCHEDULE'
            WHEN po.priority_rank IS NOT NULL THEN 'SAP' END AS priority_source,
       chp.ingest_event_id AS priority_ingest_event_id,
       coalesce(chf.scheduled_finish_date, li.scheduled_finish_date) AS scheduled_finish_date,
       po.sap_finish_date,
       li.is_rush OR coalesce(chx.is_rush, false) AS is_rush,
       coalesce(qs.quality_status, 'NOT_TESTED') AS quality_status,
       qs.latest_fail_test_id, qs.latest_fail_reason,
       dem.need_by_date, dem.order_numbers, dem.priority_tier,
       least(dem.need_by_date, coalesce(chf.scheduled_finish_date, li.scheduled_finish_date)) AS due_date,
       (li.status_code IN ('ON_HOLD', 'LAB') OR coalesce(qs.quality_status = 'FAIL', false)) AS is_hold
FROM silver.line_schedule_item li
JOIN silver.work_center wc USING (work_center_id)
JOIN silver.process_order po USING (process_order_id)
LEFT JOIN silver.material m ON m.material_id = coalesce(li.material_id, po.material_id)
LEFT JOIN silver.lot l ON l.lot_id = coalesce(li.lot_id, po.lot_id)
LEFT JOIN LATERAL (
    SELECT c.priority_rank, c.ingest_event_id FROM silver.process_order_change c
    WHERE c.process_order_id = po.process_order_id AND c.priority_rank IS NOT NULL
    ORDER BY c.ingest_event_id DESC LIMIT 1) chp ON true
LEFT JOIN LATERAL (
    SELECT c.scheduled_finish_date FROM silver.process_order_change c
    WHERE c.process_order_id = po.process_order_id AND c.scheduled_finish_date IS NOT NULL
    ORDER BY c.ingest_event_id DESC LIMIT 1) chf ON true
LEFT JOIN LATERAL (
    SELECT bool_or(c.is_rush) AS is_rush FROM silver.process_order_change c
    WHERE c.process_order_id = po.process_order_id) chx ON true
LEFT JOIN gold.v_po_quality_status qs ON qs.process_order_id = po.process_order_id
LEFT JOIN LATERAL (
    SELECT min(co.need_by_date) AS need_by_date,
           array_agg(co.order_number ORDER BY co.need_by_date, co.order_number) AS order_numbers,
           (array_agg(co.priority_tier ORDER BY CASE co.priority_tier WHEN 'RUSH' THEN 1 WHEN 'KEY' THEN 2 ELSE 3 END))[1]
               AS priority_tier
    FROM silver.order_allocation oa
    JOIN silver.customer_order co USING (customer_order_id)
    WHERE oa.process_order_id = po.process_order_id) dem ON true
WHERE li.status_code <> 'COMPLETE' AND NOT li.is_duplicate;
COMMENT ON VIEW gold.v_open_queue IS
  'Open (non-COMPLETE) schedule rows per work center with effective priority/finish after ingest, QA status, demand and due date = least(need_by, finish)';

-- Data-quality flag counts per table and source file (reconciled against observations §8).
CREATE VIEW gold.v_dq_summary AS
SELECT 'silver.process_order' AS table_name, t.source_csv, f AS dq_code, count(*) AS n_rows
FROM silver.process_order t, unnest(t.dq_flags) f GROUP BY 1, 2, 3
UNION ALL
SELECT 'silver.material', NULL, f, count(*) FROM silver.material t, unnest(t.dq_flags) f GROUP BY 1, 2, 3
UNION ALL
SELECT 'silver.line_schedule_item', t.source_csv, f, count(*) FROM silver.line_schedule_item t, unnest(t.dq_flags) f GROUP BY 1, 2, 3
UNION ALL
SELECT 'silver.conditioning_run', t.source_csv, f, count(*) FROM silver.conditioning_run t, unnest(t.dq_flags) f GROUP BY 1, 2, 3
UNION ALL
SELECT 'silver.quality_test', t.source_csv, f, count(*) FROM silver.quality_test t, unnest(t.dq_flags) f GROUP BY 1, 2, 3;
