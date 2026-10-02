-- Silver facts: line_schedule_item, conditioning_run, quality_test (observations §7.2–§7.5, §9.3 steps 6–7).

-- line_schedule_item: 7 schedules. Later repeats of (PO, work center) in one tab are kept with is_duplicate (DQ-06).
INSERT INTO silver.line_schedule_item
    (process_order_id, po_number_raw, po_number_status, is_off_system, is_manual_shipment, is_duplicate,
     work_center_id, equipment_raw, lot_id, material_id, species_code, status_code, status_note,
     run_order, run_order_note, priority_rank, priority_note, is_rush, scheduled_finish_date, original_finish_date,
     input_kg, input_qty, uom_code, output_kg, trait_family_code, size_fraction_code, size_fraction_raw,
     psl_cleanout_value, comments, source_csv, source_row_number, source_file_sha256, load_id, dq_flags)
SELECT po.process_order_id, btrim(s.po_number), p.po_number_status,
       p.po_number_status = 'PLACEHOLDER', p.po_number_status = 'NOT_A_PO',
       s.dup_rn > 1,
       wc.work_center_id, btrim(s.equipment_raw),
       coalesce(l1.lot_id, l2.lot_id), m.material_id, silver.norm_code(s.species),
       silver.status_code(s.po_status), silver.status_note(s.po_status),
       silver.to_rank(s.run_order), silver.rank_note(s.run_order),
       silver.to_rank(s.priority), silver.rank_note(s.priority), coalesce(s.priority ~* 'rush', false),
       silver.to_commit_date(s.scheduled_finish_date), silver.to_commit_date(s.original_finish_date),
       CASE WHEN silver.norm_code(s.uom_raw) = 'KG' THEN silver.to_num(s.input_raw) END,
       silver.to_num(s.input_raw), silver.norm_code(s.uom_raw), silver.to_num(s.output_weight_kg),
       silver.trait_code(s.excelis_gmo), silver.size_code(s.size_raw), btrim(s.size_raw),
       silver.to_num(s.psl_cleanout), s.comments,
       s.source_csv, s.source_row_number, sf.csv_sha256, sf.load_id,
       silver.po_dq(p.po_number_status)
       || CASE WHEN s.dup_n > 1 THEN ARRAY['DQ-06'] ELSE '{}' END
       || CASE WHEN silver.is_bad_num(s.psl_cleanout) THEN ARRAY['DQ-10'] ELSE '{}' END
       || CASE WHEN s.size_raw IS NOT NULL AND silver.size_code(s.size_raw) IS NULL THEN ARRAY['DQ-11'] ELSE '{}' END
       || CASE WHEN silver.rank_note(s.priority) IS NOT NULL OR silver.rank_note(s.run_order) IS NOT NULL
               THEN ARRAY['DQ-17'] ELSE '{}' END
FROM (
    SELECT s.*, (silver.norm_po(s.po_number)).po_number AS po_key,
           row_number() OVER w AS dup_rn, count(*) OVER w AS dup_n
    FROM _stg_schedule s
    WINDOW w AS (PARTITION BY s.source_csv, coalesce((silver.norm_po(s.po_number)).po_number, 'row:' || s.source_row_number)
                 ORDER BY s.source_row_number
                 ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
) s
CROSS JOIN LATERAL silver.norm_po(s.po_number) p
JOIN silver.work_center wc ON wc.work_center_code = s.work_center_code
LEFT JOIN silver.process_order po ON po.po_number = p.po_number
LEFT JOIN silver.lot l1 ON l1.lot_number = silver.norm_lot(s.lot_number)
LEFT JOIN silver.lot l2 ON l2.lot_number = p.lot_number
LEFT JOIN silver.material m ON m.material_description = silver.material_key(s.material_description)
LEFT JOIN silver.v_source_file sf ON sf.csv_name = s.source_csv
ORDER BY s.source_csv, s.source_row_number;

-- DQ-16: SAP says NEW but the SAP work center's schedule says COMPLETE (the schedule wins for the queue)
WITH conflict AS (
    SELECT li.line_schedule_item_id, po.process_order_id
    FROM silver.line_schedule_item li
    JOIN silver.process_order po USING (process_order_id)
    WHERE po.is_in_sap AND po.sap_status = 'NEW' AND li.status_code = 'COMPLETE' AND li.work_center_id = po.work_center_id
), upd_li AS (
    UPDATE silver.line_schedule_item li SET dq_flags = li.dq_flags || ARRAY['DQ-16']
    FROM conflict c WHERE li.line_schedule_item_id = c.line_schedule_item_id
)
UPDATE silver.process_order po SET dq_flags = po.dq_flags || ARRAY['DQ-16']
WHERE po.process_order_id IN (SELECT process_order_id FROM conflict);

-- conditioning_run: LSV + SSV logs (loaded in full, duplicates flagged DQ-05)
INSERT INTO silver.conditioning_run
    (process_order_id, po_number_raw, po_number_status, work_center_id, equipment_raw, lot_id, run_date, operator_name,
     species_code, variety_code, size_fraction_code, size_fraction_raw, input_kg, output_kg, loss_kg,
     prep_h, run_h, cleandown_h, defect_comments, source_csv, source_row_number, source_file_sha256, load_id, dq_flags)
SELECT po.process_order_id, btrim(g.po_number), p.po_number_status,
       silver.resolve_work_center(g.source_csv, g.equipment_id), btrim(g.equipment_id),
       coalesce(l1.lot_id, l2.lot_id), silver.to_date(g.date), nullif(btrim(g.operator), ''),
       silver.norm_code(g.species), silver.norm_code(g.variety_name),
       silver.size_code(g.size_fraction), btrim(g.size_fraction),
       silver.to_num(g.input_kg), silver.to_num(g.output_kgs), silver.to_num(g.loss_kg),
       silver.to_num(g.prep_time_hours), silver.to_num(g.run_time_hours), silver.to_num(g.cleandown_time_hours),
       g.defect_comments,
       g.source_csv, g.source_row_number, sf.csv_sha256, sf.load_id,
       silver.po_dq(p.po_number_status)
       || CASE WHEN silver.is_bad_num(g.prep_time_hours) OR silver.is_bad_num(g.run_time_hours)
                 OR silver.is_bad_num(g.cleandown_time_hours) THEN ARRAY['DQ-02'] ELSE '{}' END
       || CASE WHEN g.full_dup THEN ARRAY['DQ-05'] ELSE '{}' END
       || CASE WHEN g.size_fraction IS NOT NULL AND silver.size_code(g.size_fraction) IS NULL THEN ARRAY['DQ-11'] ELSE '{}' END
       || CASE WHEN silver.to_num(g.loss_kg) < 0 THEN ARRAY['DQ-13'] ELSE '{}' END
       || CASE WHEN 'DQ-23' = ANY (po.dq_flags) THEN ARRAY['DQ-23'] ELSE '{}' END
FROM _stg_log g
CROSS JOIN LATERAL silver.norm_po(g.po_number) p
LEFT JOIN silver.process_order po ON po.po_number = p.po_number
LEFT JOIN silver.lot l1 ON l1.lot_number = silver.norm_lot(g.lot_number)
LEFT JOIN silver.lot l2 ON l2.lot_number = p.lot_number
LEFT JOIN silver.v_source_file sf ON sf.csv_name = g.source_csv
ORDER BY g.source_csv, g.source_row_number;

-- quality_test: LSV Pass_Fail Log. Blank result -> PENDING (DQ-18); NA/None germ/vigor -> NULL (DQ-10)
INSERT INTO silver.quality_test
    (process_order_id, po_number_raw, po_number_status, lot_id, work_center_id, equipment_raw, output_batch_number,
     test_date, species_code, variety_code, size_fraction_code, size_fraction_raw, batch_kg, result_code,
     fail_reason_code, raw_germ_fraction, ready_germ_fraction, raw_vigor_fraction, ready_vigor_fraction, comments,
     source_csv, source_row_number, source_file_sha256, load_id, dq_flags)
SELECT po.process_order_id, btrim(q.po_number), p.po_number_status, coalesce(l1.lot_id, l2.lot_id),
       silver.resolve_work_center('lsv_pass_fail_log.csv', q.equiment_id), btrim(q.equiment_id),
       silver.to_num(q.output_batch)::bigint, silver.to_date(q.date),
       silver.norm_code(q.specie), silver.norm_code(q.variety),
       silver.size_code(q.size_fraction), btrim(q.size_fraction), silver.to_num(q.kgs),
       silver.result_code(q.pass_fail), silver.fail_code(q.failed_for),
       silver.to_num(q.raw_germ), silver.to_num(q.ready_germ), silver.to_num(q.raw_vigor), silver.to_num(q.ready_vigor),
       q.comments,
       'lsv_pass_fail_log.csv', q._source_row_number, sf.csv_sha256, sf.load_id,
       silver.po_dq(p.po_number_status)
       || CASE WHEN q.full_dup THEN ARRAY['DQ-05'] ELSE '{}' END
       || CASE WHEN silver.is_bad_num(q.raw_germ) OR silver.is_bad_num(q.ready_germ)
                 OR silver.is_bad_num(q.raw_vigor) OR silver.is_bad_num(q.ready_vigor) THEN ARRAY['DQ-10'] ELSE '{}' END
       || CASE WHEN q.size_fraction IS NOT NULL AND silver.size_code(q.size_fraction) IS NULL THEN ARRAY['DQ-11'] ELSE '{}' END
       || CASE WHEN silver.result_code(q.pass_fail) = 'PENDING'
                 OR (silver.result_code(q.pass_fail) = 'FAIL' AND nullif(btrim(q.failed_for), '') IS NULL)
                 OR (silver.result_code(q.pass_fail) = 'PASS' AND nullif(btrim(q.failed_for), '') IS NOT NULL)
               THEN ARRAY['DQ-18'] ELSE '{}' END
       || CASE WHEN 'DQ-23' = ANY (po.dq_flags) THEN ARRAY['DQ-23'] ELSE '{}' END
FROM _stg_qa q
CROSS JOIN LATERAL silver.norm_po(q.po_number) p
LEFT JOIN silver.process_order po ON po.po_number = p.po_number
LEFT JOIN silver.lot l1 ON l1.lot_number = silver.norm_lot(q.lot_number)
LEFT JOIN silver.lot l2 ON l2.lot_number = p.lot_number
LEFT JOIN silver.v_source_file sf ON sf.csv_name = 'lsv_pass_fail_log.csv'
ORDER BY q._source_row_number;
