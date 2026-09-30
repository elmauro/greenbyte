-- Silver lot + process_order (observations §9.3 steps 4–6).

-- lot: every Lot Number column + lot numbers found in PO columns (R-PO NOT_A_PO)
CREATE TEMP TABLE _stg_lot ON COMMIT DROP AS
SELECT silver.norm_lot(lot_number) AS lot_number, silver.norm_code(species) AS species_code, crop_year,
       source_csv, source_row_number, 1 AS rk
FROM _stg_schedule
UNION ALL
SELECT (silver.norm_po(po_number)).lot_number, silver.norm_code(species), crop_year, source_csv, source_row_number, 2
FROM _stg_schedule
UNION ALL
SELECT silver.norm_lot(lot_number), silver.norm_code(species), crop_year, source_csv, source_row_number, 3
FROM _stg_log
UNION ALL
SELECT (silver.norm_po(po_number)).lot_number, silver.norm_code(species), crop_year, source_csv, source_row_number, 4
FROM _stg_log
UNION ALL
SELECT silver.norm_lot(lot_number), silver.norm_code(specie), crop_year, 'lsv_pass_fail_log.csv', _source_row_number, 5
FROM raw.lsv_pass_fail_log;

INSERT INTO silver.lot (lot_number, species_id, crop_year, crop_year_suffix, source_csv, source_row_number)
SELECT f.lot_number, sp.species_id, a.crop_year, a.crop_year_suffix, f.source_csv, f.source_row_number
FROM (
    SELECT DISTINCT ON (lot_number) lot_number, source_csv, source_row_number
    FROM _stg_lot WHERE lot_number IS NOT NULL
    ORDER BY lot_number, rk, source_csv, source_row_number
) f
JOIN (
    SELECT lot_number,
           mode() WITHIN GROUP (ORDER BY species_code) AS species_code,
           mode() WITHIN GROUP (ORDER BY silver.crop_year(crop_year)) AS crop_year,
           mode() WITHIN GROUP (ORDER BY silver.crop_year_suffix(crop_year)) AS crop_year_suffix
    FROM _stg_lot WHERE lot_number IS NOT NULL GROUP BY lot_number
) a USING (lot_number)
LEFT JOIN silver.species sp ON sp.species_code = a.species_code
ORDER BY f.lot_number;

-- process_order 1/4: SAP open-order extract (authoritative attributes). main.csv is byte-identical: lineage only.
INSERT INTO silver.process_order
    (po_number, po_type, material_id, species_id, work_center_id, is_in_sap, sap_status, planned_output_qty, uom_code,
     sap_finish_date, priority_rank, sap_notes, is_notes_truncated, source_csv, source_row_number, source_file_sha256,
     load_id, dq_flags)
SELECT p.po_number, silver.po_type(p.po_number), m.material_id, coalesce(m.species_id, sp.species_id), wc.work_center_id,
       true, silver.norm_code(s.po_status), silver.to_num(s.output_qty), silver.norm_code(s.uom),
       silver.to_date(s.scheduled_finish_date_sap), silver.to_rank(s.priority), btrim(s.notes),
       coalesce(length(btrim(s.notes)) = 40, false),
       'excel_sap_data.csv', s._source_row_number, sf.csv_sha256, sf.load_id,
       silver.po_dq(p.po_number_status)
       || CASE WHEN length(btrim(s.notes)) = 40 THEN ARRAY['DQ-14'] ELSE '{}' END
       || CASE WHEN silver.to_date(s.scheduled_finish_date_sap) < silver.extract_as_of() THEN ARRAY['DQ-15'] ELSE '{}' END
FROM raw.excel_sap_data s
CROSS JOIN LATERAL silver.norm_po(s.prod_order) p
LEFT JOIN silver.material m ON m.material_description = silver.material_key(s.material_description)
LEFT JOIN silver.species sp ON sp.species_code = silver.norm_code(s.crop)
LEFT JOIN silver.work_center wc ON wc.work_center_code = silver.norm_code(s.workcenter)
LEFT JOIN silver.v_source_file sf ON sf.csv_name = 'excel_sap_data.csv'
WHERE p.po_number IS NOT NULL
ORDER BY s._source_row_number;

-- process_order 2/4: routing-only POs (components.csv)
INSERT INTO silver.process_order
    (po_number, po_type, work_center_id, is_in_sap, source_csv, source_row_number, source_file_sha256, load_id, dq_flags)
SELECT DISTINCT ON (p.po_number)
       p.po_number, silver.po_type(p.po_number), wc.work_center_id, false,
       'components.csv', c._source_row_number, sf.csv_sha256, sf.load_id, silver.po_dq(p.po_number_status)
FROM raw.components c
CROSS JOIN LATERAL silver.norm_po(c.process_order) p
LEFT JOIN silver.work_center wc ON wc.work_center_code = silver.norm_code(c.resource)
LEFT JOIN silver.v_source_file sf ON sf.csv_name = 'components.csv'
WHERE p.po_number IS NOT NULL
ORDER BY p.po_number, c._source_row_number
ON CONFLICT (po_number) DO NOTHING;

-- process_order 3/4: POs first seen on a line schedule
INSERT INTO silver.process_order
    (po_number, po_type, material_id, species_id, is_in_sap, source_csv, source_row_number, source_file_sha256, load_id, dq_flags)
SELECT DISTINCT ON (p.po_number)
       p.po_number, silver.po_type(p.po_number), m.material_id, coalesce(m.species_id, sp.species_id), false,
       s.source_csv, s.source_row_number, sf.csv_sha256, sf.load_id, silver.po_dq(p.po_number_status)
FROM _stg_schedule s
CROSS JOIN LATERAL silver.norm_po(s.po_number) p
LEFT JOIN silver.material m ON m.material_description = silver.material_key(s.material_description)
LEFT JOIN silver.species sp ON sp.species_code = silver.norm_code(s.species)
LEFT JOIN silver.v_source_file sf ON sf.csv_name = s.source_csv
WHERE p.po_number IS NOT NULL
ORDER BY p.po_number, s.source_csv, s.source_row_number
ON CONFLICT (po_number) DO NOTHING;

-- process_order 4/4: POs seen only in the conditioning logs / pass-fail log (DQ-23)
INSERT INTO silver.process_order
    (po_number, po_type, species_id, is_in_sap, source_csv, source_row_number, source_file_sha256, load_id, dq_flags)
SELECT DISTINCT ON (x.po_number)
       x.po_number, silver.po_type(x.po_number), sp.species_id, false,
       x.source_csv, x.source_row_number, sf.csv_sha256, sf.load_id, silver.po_dq(x.po_number_status) || ARRAY['DQ-23']
FROM (
    SELECT (silver.norm_po(po_number)).*, silver.norm_code(species) AS species_code, source_csv, source_row_number
    FROM _stg_log
    UNION ALL
    SELECT (silver.norm_po(po_number)).*, silver.norm_code(specie), 'lsv_pass_fail_log.csv', _source_row_number
    FROM raw.lsv_pass_fail_log
) x
LEFT JOIN silver.species sp ON sp.species_code = x.species_code
LEFT JOIN silver.v_source_file sf ON sf.csv_name = x.source_csv
WHERE x.po_number IS NOT NULL
ORDER BY x.po_number, x.source_csv, x.source_row_number
ON CONFLICT (po_number) DO NOTHING;

-- Lot of the PO: most frequent lot on its schedule rows, else on its log rows.
WITH po_lot AS (
    SELECT (silver.norm_po(po_number)).po_number AS po_number, silver.norm_lot(lot_number) AS lot_number, 1 AS rk
    FROM _stg_schedule
    UNION ALL
    SELECT (silver.norm_po(po_number)).po_number, silver.norm_lot(lot_number), 2 FROM _stg_log
), best AS (
    SELECT DISTINCT ON (po_number) po_number, lot_number
    FROM (SELECT po_number, lot_number, rk, count(*) AS n FROM po_lot
          WHERE po_number IS NOT NULL AND lot_number IS NOT NULL GROUP BY 1, 2, 3) c
    ORDER BY po_number, rk, n DESC, lot_number
)
UPDATE silver.process_order po
SET lot_id = l.lot_id
FROM best b JOIN silver.lot l USING (lot_number)
WHERE po.po_number = b.po_number;

-- Lineage: every source row that references a PO
INSERT INTO silver.process_order_source (process_order_id, source_role, source_csv, source_row_number)
SELECT po.process_order_id, r.source_role, r.source_csv, r.source_row_number
FROM _stg_po_ref r
JOIN silver.process_order po USING (po_number)
ORDER BY r.source_csv, r.source_row_number;

-- Routing PO -> work center (components.csv)
INSERT INTO silver.process_order_work_center
    (process_order_id, work_center_id, source_csv, source_row_number, source_file_sha256, load_id)
SELECT po.process_order_id, wc.work_center_id, 'components.csv', c._source_row_number, sf.csv_sha256, sf.load_id
FROM raw.components c
JOIN silver.process_order po ON po.po_number = (silver.norm_po(c.process_order)).po_number
JOIN silver.work_center wc ON wc.work_center_code = silver.norm_code(c.resource)
LEFT JOIN silver.v_source_file sf ON sf.csv_name = 'components.csv'
ORDER BY c._source_row_number
ON CONFLICT (process_order_id, work_center_id) DO NOTHING;

-- DQ-20: SAP WorkCenter is a VLOOKUP to an external workbook; flag when it disagrees with the routing
UPDATE silver.process_order po
SET dq_flags = po.dq_flags || ARRAY['DQ-20']
WHERE po.is_in_sap
  AND EXISTS (SELECT 1 FROM silver.process_order_work_center pwc
              WHERE pwc.process_order_id = po.process_order_id)
  AND NOT EXISTS (SELECT 1 FROM silver.process_order_work_center pwc
                  WHERE pwc.process_order_id = po.process_order_id AND pwc.work_center_id = po.work_center_id);
