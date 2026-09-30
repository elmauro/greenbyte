-- Staging: unify the raw tabs that share a grain into one shape (temp tables, dropped at commit).
-- Column mapping: observations.md §7. Values stay text here; typing happens in the silver inserts.

-- Source file hashes of the latest successful raw load (lineage on every silver row).
CREATE VIEW silver.v_source_file AS
SELECT lf.csv_name, lf.csv_sha256, lf.load_id, lf.provenance
FROM raw.load_file lf
WHERE lf.load_id = (SELECT max(load_id) FROM raw.load_batch WHERE status = 'SUCCESS');
COMMENT ON VIEW silver.v_source_file IS 'csv_name -> sha256 + load_id of the latest successful raw load';

-- 7 line schedules -> one shape (§7.2, §7.3)
CREATE TEMP TABLE _stg_schedule ON COMMIT DROP AS
SELECT 'line_1_schedule.csv' AS source_csv, _source_row_number AS source_row_number, 'LSVLN1' AS work_center_code,
       NULL::text AS equipment_raw, run_order, po_status, scheduled_finish_date, priority, po_number, crop_year,
       species, material_description, lot_number, NULL::text AS size_raw, input_weight_kg AS input_raw, 'KG' AS uom_raw,
       excelis_gmo, comments, output_weight_kg, psl_cleanout, NULL::text AS original_finish_date
FROM raw.line_1_schedule
UNION ALL
SELECT 'line_2_schedule.csv', _source_row_number, 'LSVLN2', NULL, run_order, po_status, scheduled_finish_date, priority,
       po_number, crop_year, species, material_description, lot_number, NULL, input_weight_kg, 'KG',
       excelis_gmo, comments, output_weight_kg, psl_cleanout, NULL
FROM raw.line_2_schedule
UNION ALL
SELECT 'gravity_schedule.csv', _source_row_number, 'LSVGRVTY', NULL, run_order, po_status, scheduled_finish_date, priority,
       po_number, crop_year, swco_swbs, material_description, lot_number, size, input_weight_kg, 'KG',
       excelis_gmo, comments, NULL, NULL, NULL
FROM raw.gravity_schedule
UNION ALL
SELECT 'colorsort_schedule.csv', _source_row_number, 'LSVCLSRT', equipment_id, NULL, po_status, scheduled_finish_date, priority,
       po_number, crop_year, swco_swbs, material_description, lot_number, size, input_weight_kg, 'KG',
       excelis_gmo, comments, NULL, NULL, NULL
FROM raw.colorsort_schedule
UNION ALL
SELECT 'line_3_schedule.csv', _source_row_number, 'SSVLN3', NULL, run_order, po_status, scheduled_finish_date, priority,
       po_number, NULL, species, material_description, lot_number, NULL, input_quantity, uom,
       NULL, comments, NULL, NULL, sap_finish_date
FROM raw.line_3_schedule
UNION ALL
SELECT 'line_5_schedule.csv', _source_row_number, 'SSVLN5', NULL, run_order, po_status, scheduled_finish_date, priority,
       po_number, NULL, species, material_description, lot_number, NULL, input_quantity, uom,
       NULL, comments, NULL, NULL, original_scheduled_finish_date
FROM raw.line_5_schedule
UNION ALL
SELECT 'line_6_schedule.csv', _source_row_number, 'SSVLN6', NULL, run_order, po_status, scheduled_finish_date, priority,
       po_number, NULL, species, material_description, lot_number, NULL, input_quantity, uom,
       NULL, comments, NULL, NULL, original_sap_finish_date
FROM raw.line_6_schedule;

-- LSV + SSV conditioning logs -> one shape (§7.4). full_dup = the whole data row repeats in its file (DQ-05).
CREATE TEMP TABLE _stg_log ON COMMIT DROP AS
SELECT 'lsv_conditioning_logs.csv' AS source_csv, r._source_row_number AS source_row_number,
       r.po_number, r.equipment_id, r.operator, r.date, r.crop_year, r.species, r.variety_name, r.lot_number,
       r.input_kg, r.prep_time_hours, r.run_time_hours, r.cleandown_time_hours, r.output_kgs, r.loss_kg,
       r.size_fraction, NULL::text AS defect_comments,
       count(*) OVER (PARTITION BY (to_jsonb(r) - '_source_row_number' - '_load_id')) > 1 AS full_dup
FROM raw.lsv_conditioning_logs r
UNION ALL
SELECT 'ssv_conditioning_logs.csv', r._source_row_number,
       r.po_number, r.equipment_id, r.operator, r.date, NULL, r.species, r.variety_name, r.lot_number,
       r.input_kg, r.prep_time_hours, r.run_time_hours, r.cleandown_time_hours, r.output_kgs, r.loss_kg,
       NULL, r.defect_comments,
       count(*) OVER (PARTITION BY (to_jsonb(r) - '_source_row_number' - '_load_id')) > 1
FROM raw.ssv_conditioning_logs r;

CREATE TEMP TABLE _stg_qa ON COMMIT DROP AS
SELECT r.*, count(*) OVER (PARTITION BY (to_jsonb(r) - '_source_row_number' - '_load_id')) > 1 AS full_dup
FROM raw.lsv_pass_fail_log r;

-- Every PO reference in any source, with its role (feeds process_order creation order and process_order_source).
CREATE TEMP TABLE _stg_po_ref ON COMMIT DROP AS
SELECT x.source_csv, x.source_row_number, x.source_role, x.load_rank, (silver.norm_po(x.po_raw)).*
FROM (
    SELECT 'excel_sap_data.csv' AS source_csv, _source_row_number AS source_row_number, 'SAP' AS source_role, 1 AS load_rank, prod_order AS po_raw FROM raw.excel_sap_data
    UNION ALL SELECT 'main.csv', _source_row_number, 'SAP_COPY', 1, prod_order FROM raw.main
    UNION ALL SELECT 'components.csv', _source_row_number, 'ROUTING', 2, process_order FROM raw.components
    UNION ALL SELECT source_csv, source_row_number, 'SCHEDULE', 3, po_number FROM _stg_schedule
    UNION ALL SELECT source_csv, source_row_number, 'LOG', 4, po_number FROM _stg_log
    UNION ALL SELECT 'lsv_pass_fail_log.csv', _source_row_number, 'QA', 4, po_number FROM raw.lsv_pass_fail_log
) x;
