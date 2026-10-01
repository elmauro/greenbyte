-- Gold v4 model validation: grains, relations, cardinalities, constraints and model rules across raw / silver / gold
-- (etl/gold-model/gold-data-model.md, source-to-target-mapping.md). READ-ONLY: a single SELECT, safe on the shared
-- database at any time:
--   psql -X -v ON_ERROR_STOP=1 -f backend/database/tests/gold_v4_validation.sql
--   python backend/database/etl/build_model.py --validate      (prints the report; exit 1 if any ERROR check fails)
--
-- One row per check: violations found (actual) vs expected (0 unless stated), up to 5 offending keys in sample.
-- status: PASS | FAIL (severity ERROR) | WARN (severity WARN: known gap, gap = G-nn in gold-data-model §6) | INFO.
-- Categories:
--   GRAIN        the declared grain / business key is unique
--   RELATION     logical relations the database does not enforce (lineage round-trip, same line, same PO, …)
--   CARDINALITY  how many rows a parent must or may have (1..n, exactly one, contiguous)
--   CONSTRAINT   value rules beyond the CHECKs (times, slack, statuses)
--   RULE         model rules (ONLINE first, holds, reasons ↔ facts, policy, fact status)
--   CATALOG      key standard: PK on every table, FK on every *_id column, FK columns indexed
-- *_legacy tables (gold v3 kept by the in-place upgrade) are excluded.

WITH
tz AS (SELECT gold.cfg('plant_time_zone') AS tz),
latest AS (SELECT lp.schedule_plan_id, lp.work_center_id FROM gold.v_latest_plan lp),
c (layer, obj, category, check_name, severity, gap, expected, actual, sample) AS (

-- ============================================================================ GRAIN
SELECT 'raw', 'note_reading', 'GRAIN', '(note_hash, reader, model_id, prompt_version) unique', 'ERROR', NULL, 0::bigint,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT note_hash || '/' || model_id AS k FROM raw.note_reading
      GROUP BY note_hash, reader, model_id, prompt_version, model_id HAVING count(*) > 1) x
UNION ALL
SELECT 'raw', 'note_reading', 'GRAIN', 'note_hash = gold.note_hash(note_text)', 'ERROR', NULL, 0,
       count(*), array_to_string((array_agg(note_reading_id::text ORDER BY note_reading_id))[1:5], ', ')
FROM (SELECT note_reading_id FROM raw.note_reading WHERE note_hash <> gold.note_hash(note_text)) x
UNION ALL
SELECT 'raw', 'ingest_event', 'GRAIN', 'idempotency_key unique (non-null)', 'ERROR', NULL, 0,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT idempotency_key AS k FROM raw.ingest_event WHERE idempotency_key IS NOT NULL
      GROUP BY 1 HAVING count(*) > 1) x

UNION ALL
SELECT 'silver', 'work_center', 'GRAIN', 'work_center_code unique', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT work_center_code k FROM silver.work_center GROUP BY 1 HAVING count(*) > 1) x
UNION ALL
SELECT 'silver', 'work_center', 'GRAIN', 'demo_line_id unique (non-null)', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT demo_line_id k FROM silver.work_center WHERE demo_line_id IS NOT NULL GROUP BY 1 HAVING count(*) > 1) x
UNION ALL
SELECT 'silver', 'equipment_alias', 'GRAIN', '(source_csv, alias) unique', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT source_csv || ':' || alias k FROM silver.equipment_alias GROUP BY source_csv, alias HAVING count(*) > 1) x
UNION ALL
SELECT 'silver', 'species', 'GRAIN', 'species_code unique', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT species_code k FROM silver.species GROUP BY 1 HAVING count(*) > 1) x
UNION ALL
SELECT 'silver', 'material', 'GRAIN', 'material_description (normalized) unique', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT material_description k FROM silver.material GROUP BY 1 HAVING count(*) > 1) x
UNION ALL
SELECT 'silver', 'material', 'GRAIN', 'material_description is already normalized (key = silver.material_key(key))', 'ERROR', NULL, 0,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT material_description k FROM silver.material
      WHERE material_description IS DISTINCT FROM silver.material_key(material_description)) x
UNION ALL
SELECT 'silver', 'lot', 'GRAIN', 'lot_number unique', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT lot_number k FROM silver.lot GROUP BY 1 HAVING count(*) > 1) x
UNION ALL
SELECT 'silver', 'process_order', 'GRAIN', 'po_number unique', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT po_number k FROM silver.process_order GROUP BY 1 HAVING count(*) > 1) x
UNION ALL
SELECT 'silver', 'process_order', 'GRAIN', 'po_number matches the R-PO patterns', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT po_number k FROM silver.process_order WHERE NOT silver.is_po_pattern(po_number)) x
UNION ALL
SELECT 'silver', 'process_order_source', 'GRAIN', '(source_csv, source_row_number) unique', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT source_csv || ':' || source_row_number k FROM silver.process_order_source
      GROUP BY source_csv, source_row_number HAVING count(*) > 1) x
UNION ALL
SELECT 'silver', 'process_order_work_center', 'GRAIN', '(process_order_id, work_center_id) unique', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT process_order_id || '/' || work_center_id k FROM silver.process_order_work_center
      GROUP BY process_order_id, work_center_id HAVING count(*) > 1) x
UNION ALL
SELECT 'silver', 'line_schedule_item', 'GRAIN', '(source_csv, source_row_number) unique', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT source_csv || ':' || source_row_number k FROM silver.line_schedule_item
      GROUP BY source_csv, source_row_number HAVING count(*) > 1) x
UNION ALL
SELECT 'silver', 'line_schedule_item', 'GRAIN', 'business key (process_order_id, work_center_id) unique where not is_duplicate', 'ERROR', NULL, 0,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT process_order_id || '/' || work_center_id k FROM silver.line_schedule_item
      WHERE process_order_id IS NOT NULL AND NOT is_duplicate
      GROUP BY process_order_id, work_center_id HAVING count(*) > 1) x
UNION ALL
SELECT 'silver', 'line_schedule_item', 'GRAIN', 'is_duplicate rows have an earlier non-duplicate twin (DQ-06)', 'ERROR', NULL, 0,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT d.source_csv || ':' || d.source_row_number k FROM silver.line_schedule_item d
      WHERE d.is_duplicate AND NOT EXISTS (
          SELECT 1 FROM silver.line_schedule_item o
          WHERE o.source_csv = d.source_csv AND o.process_order_id = d.process_order_id AND NOT o.is_duplicate
            AND o.source_row_number < d.source_row_number)) x
UNION ALL
SELECT 'silver', 'conditioning_run', 'GRAIN', '(source_csv, source_row_number) unique', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT source_csv || ':' || source_row_number k FROM silver.conditioning_run
      GROUP BY source_csv, source_row_number HAVING count(*) > 1) x
UNION ALL
SELECT 'silver', 'quality_test', 'GRAIN', '(source_csv, source_row_number) unique', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT source_csv || ':' || source_row_number k FROM silver.quality_test
      GROUP BY source_csv, source_row_number HAVING count(*) > 1) x
UNION ALL
SELECT 'silver', 'quality_test', 'GRAIN', 'output_batch_number is not a key: repeated values (SQ-18)', 'WARN', 'G-16', 0,
       (SELECT count(*) FROM (SELECT 1 FROM silver.quality_test WHERE output_batch_number IS NOT NULL
                              GROUP BY output_batch_number HAVING count(*) > 1) d),
       (SELECT array_to_string((array_agg(k ORDER BY k))[1:5], ', ') FROM (SELECT output_batch_number::text k FROM silver.quality_test
                                          WHERE output_batch_number IS NOT NULL
                                          GROUP BY output_batch_number HAVING count(*) > 1 ORDER BY 1 LIMIT 5) s)
UNION ALL
SELECT 'silver', 'process_order_change', 'GRAIN', 'ingest_event_id unique', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT ingest_event_id::text k FROM silver.process_order_change GROUP BY 1 HAVING count(*) > 1) x
UNION ALL
SELECT 'silver', 'customer_order', 'GRAIN', 'order_number unique', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT order_number k FROM silver.customer_order GROUP BY 1 HAVING count(*) > 1) x
UNION ALL
SELECT 'silver', 'order_allocation', 'GRAIN', '(customer_order_id, process_order_id) unique', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT customer_order_id || '/' || process_order_id k FROM silver.order_allocation
      GROUP BY customer_order_id, process_order_id HAVING count(*) > 1) x

UNION ALL
SELECT 'gold', 'config', 'GRAIN', 'config_key unique', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT config_key k FROM gold.config GROUP BY 1 HAVING count(*) > 1) x
UNION ALL
SELECT 'gold', 'reason_code', 'GRAIN', 'reason_code unique', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT reason_code k FROM gold.reason_code GROUP BY 1 HAVING count(*) > 1) x
UNION ALL
SELECT 'gold', 'changeover_rule', 'GRAIN', '(work_center_id, transition_code) unique', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT work_center_id || '/' || transition_code k FROM gold.changeover_rule
      GROUP BY work_center_id, transition_code HAVING count(*) > 1) x
UNION ALL
SELECT 'gold', 'policy', 'GRAIN', '(work_center_id, policy_version) unique, NULL = default', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT coalesce(work_center_id::text, 'default') || '/v' || policy_version k FROM gold.policy
      GROUP BY work_center_id, policy_version HAVING count(*) > 1) x
UNION ALL
SELECT 'gold', 'source_note', 'GRAIN', '(source_csv, source_row_number, source_column) unique', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT source_csv || ':' || source_row_number || ':' || source_column k FROM gold.source_note
      GROUP BY source_csv, source_row_number, source_column HAVING count(*) > 1) x
UNION ALL
SELECT 'gold', 'source_note', 'GRAIN', 'note_hash = gold.note_hash(note_text)', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT source_note_id::text k FROM gold.source_note WHERE note_hash <> gold.note_hash(note_text)) x
UNION ALL
SELECT 'gold', 'semantic_fact', 'GRAIN', '(source_note_id, note_reading_id, fact_seq) unique', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT source_note_id || '/' || note_reading_id || '/' || fact_seq k FROM gold.semantic_fact
      GROUP BY source_note_id, note_reading_id, fact_seq HAVING count(*) > 1) x
UNION ALL
SELECT 'gold', 'v_note_reading_current', 'GRAIN', 'one current reading per note_hash', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT note_hash k FROM gold.v_note_reading_current GROUP BY 1 HAVING count(*) > 1) x
UNION ALL
SELECT 'gold', 'v_trusted_fact', 'GRAIN', '(source_note_id, fact_type) unique', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT source_note_id || '/' || fact_type k FROM gold.v_trusted_fact
      GROUP BY source_note_id, fact_type HAVING count(*) > 1) x
UNION ALL
SELECT 'gold', 'plan_event', 'GRAIN', 'one plan_event per ingest_event_id', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT ingest_event_id::text k FROM gold.plan_event WHERE ingest_event_id IS NOT NULL GROUP BY 1 HAVING count(*) > 1) x
UNION ALL
SELECT 'gold', 'schedule_plan', 'GRAIN', '(work_center_id, plan_version) unique', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT work_center_id || '/v' || plan_version k FROM gold.schedule_plan
      GROUP BY work_center_id, plan_version HAVING count(*) > 1) x
UNION ALL
SELECT 'gold', 'schedule_entry', 'GRAIN', '(schedule_plan_id, position) unique', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT schedule_plan_id || '/' || position k FROM gold.schedule_entry
      GROUP BY schedule_plan_id, position HAVING count(*) > 1) x
UNION ALL
SELECT 'gold', 'schedule_entry', 'GRAIN', '(schedule_plan_id, process_order_id) unique: one PO once per plan', 'ERROR', NULL, 0,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT schedule_plan_id || '/' || process_order_id k FROM gold.schedule_entry
      GROUP BY schedule_plan_id, process_order_id HAVING count(*) > 1) x
UNION ALL
SELECT 'gold', 'entry_reason', 'GRAIN', '(schedule_entry_id, seq) unique', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT schedule_entry_id || '/' || seq k FROM gold.entry_reason
      GROUP BY schedule_entry_id, seq HAVING count(*) > 1) x
UNION ALL
SELECT 'gold', 'v_open_queue', 'GRAIN', 'line_schedule_item_id unique (view key)', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT line_schedule_item_id::text k FROM gold.v_open_queue GROUP BY 1 HAVING count(*) > 1) x
UNION ALL
SELECT 'gold', 'v_open_queue', 'GRAIN', '(process_order_id, work_center_id) unique: one open row per PO and line', 'ERROR', NULL, 0,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT po_number || '@' || work_center_code k FROM gold.v_open_queue
      GROUP BY po_number, work_center_code HAVING count(*) > 1) x
UNION ALL
SELECT 'gold', 'v_open_queue', 'GRAIN', 'a PO is open on at most one line (plan grain = PO per line)', 'WARN', 'G-12', 0,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT po_number k FROM gold.v_open_queue GROUP BY 1 HAVING count(DISTINCT work_center_id) > 1) x
UNION ALL
SELECT 'gold', 'v_po_quality_status', 'GRAIN', 'process_order_id unique', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT process_order_id::text k FROM gold.v_po_quality_status GROUP BY 1 HAVING count(*) > 1) x
UNION ALL
SELECT 'gold', 'v_throughput', 'GRAIN', '(work_center_id, grain, species_code) unique', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT work_center_code || '/' || grain || '/' || coalesce(species_code, '-') k FROM gold.v_throughput
      GROUP BY work_center_code, grain, species_code HAVING count(*) > 1) x
UNION ALL
SELECT 'gold', 'v_changeover_observed', 'GRAIN', '(work_center_id, transition_code) unique', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT work_center_code || '/' || transition_code k FROM gold.v_changeover_observed
      GROUP BY work_center_code, transition_code HAVING count(*) > 1) x
UNION ALL
SELECT 'gold', 'v_latest_plan', 'GRAIN', 'one latest plan per work center', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT work_center_id::text k FROM gold.v_latest_plan GROUP BY 1 HAVING count(*) > 1) x
UNION ALL
SELECT 'gold', 'v_plan_status', 'GRAIN', 'schedule_plan_id unique', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT schedule_plan_id::text k FROM gold.v_plan_status GROUP BY 1 HAVING count(*) > 1) x

-- ============================================================================ RELATION
UNION ALL
SELECT 'silver', 'process_order', 'RELATION', 'material species = PO species', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT po.po_number k FROM silver.process_order po JOIN silver.material m USING (material_id)
      WHERE m.species_id IS NOT NULL AND po.species_id IS NOT NULL AND m.species_id <> po.species_id) x
UNION ALL
SELECT 'silver', 'process_order', 'RELATION', 'SAP lineage row exists in raw.excel_sap_data (BFF inserts)', 'WARN', 'G-09', 0,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT po.po_number k FROM silver.process_order po
      WHERE po.source_csv = 'excel_sap_data.csv'
        AND NOT EXISTS (SELECT 1 FROM raw.excel_sap_data s WHERE s._source_row_number = po.source_row_number)) x
UNION ALL
SELECT 'silver', 'line_schedule_item', 'RELATION', 'lineage row exists in its raw schedule table (BFF inserts)', 'WARN', 'G-09', 0,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT li.source_csv || ':' || li.source_row_number k FROM silver.line_schedule_item li
      WHERE NOT EXISTS (
          SELECT 1 FROM (SELECT 'line_1_schedule.csv' f, _source_row_number r FROM raw.line_1_schedule
                         UNION ALL SELECT 'line_2_schedule.csv', _source_row_number FROM raw.line_2_schedule
                         UNION ALL SELECT 'gravity_schedule.csv', _source_row_number FROM raw.gravity_schedule
                         UNION ALL SELECT 'colorsort_schedule.csv', _source_row_number FROM raw.colorsort_schedule
                         UNION ALL SELECT 'line_3_schedule.csv', _source_row_number FROM raw.line_3_schedule
                         UNION ALL SELECT 'line_5_schedule.csv', _source_row_number FROM raw.line_5_schedule
                         UNION ALL SELECT 'line_6_schedule.csv', _source_row_number FROM raw.line_6_schedule) s
          WHERE s.f = li.source_csv AND s.r = li.source_row_number)) x
UNION ALL
SELECT 'silver', 'line_schedule_item', 'RELATION', 'schedule material = PO material', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT li.source_csv || ':' || li.source_row_number k FROM silver.line_schedule_item li
      JOIN silver.process_order po USING (process_order_id)
      WHERE li.material_id IS NOT NULL AND po.material_id IS NOT NULL AND li.material_id <> po.material_id) x
UNION ALL
SELECT 'silver', 'line_schedule_item', 'RELATION', 'schedule species = material species', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT li.source_csv || ':' || li.source_row_number k FROM silver.line_schedule_item li
      JOIN silver.material m USING (material_id) JOIN silver.species s ON s.species_id = m.species_id
      WHERE li.species_code IS DISTINCT FROM s.species_code) x
UNION ALL
SELECT 'silver', 'line_schedule_item', 'RELATION', 'schedule lot = PO lot', 'WARN', 'G-15', 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT li.source_csv || ':' || li.source_row_number k FROM silver.line_schedule_item li
      JOIN silver.process_order po USING (process_order_id)
      WHERE li.lot_id IS NOT NULL AND po.lot_id IS NOT NULL AND li.lot_id <> po.lot_id) x
UNION ALL
SELECT 'silver', 'line_schedule_item', 'RELATION', 'open row work center = SAP work center of the PO', 'WARN', 'G-13', 0,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT po.po_number || '@' || wc.work_center_code k FROM silver.line_schedule_item li
      JOIN silver.process_order po USING (process_order_id) JOIN silver.work_center wc ON wc.work_center_id = li.work_center_id
      WHERE po.is_in_sap AND li.status_code <> 'COMPLETE' AND NOT li.is_duplicate AND li.work_center_id <> po.work_center_id) x
UNION ALL
SELECT 'silver', 'line_schedule_item', 'RELATION', 'process_order_id NULL only for non-valid PO numbers', 'ERROR', NULL, 0,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT source_csv || ':' || source_row_number k FROM silver.line_schedule_item
      WHERE process_order_id IS NULL AND po_number_status IN ('VALID', 'NORMALIZED')) x
UNION ALL
SELECT 'silver', 'order_allocation', 'RELATION', 'customer order material = PO material', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT co.order_number k FROM silver.order_allocation oa JOIN silver.customer_order co USING (customer_order_id)
      JOIN silver.process_order po USING (process_order_id) WHERE po.material_id IS DISTINCT FROM co.material_id) x
UNION ALL
SELECT 'silver', 'process_order_change', 'RELATION', 'ingest event exists, is sap_priority_change and not voided', 'ERROR', NULL, 0,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT c.ingest_event_id::text k FROM silver.process_order_change c JOIN raw.ingest_event e USING (ingest_event_id)
      WHERE e.event_source <> 'sap_priority_change' OR e.voided_at IS NOT NULL) x
UNION ALL
SELECT 'silver', 'quality_test', 'RELATION', 'ingested QA rows ↔ non-voided pass_fail_log events', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT qt.ingest_event_id::text k FROM silver.quality_test qt JOIN raw.ingest_event e USING (ingest_event_id)
      WHERE e.event_source <> 'pass_fail_log' OR e.voided_at IS NOT NULL
         OR qt.source_csv <> 'raw.ingest_event' OR qt.source_row_number <> e.ingest_event_id) x

UNION ALL
SELECT 'gold', 'source_note', 'RELATION', 'lineage round-trip: note_text = the silver cell it came from', 'ERROR', NULL, 0,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT sn.source_note_id::text k FROM gold.source_note sn
      LEFT JOIN silver.line_schedule_item li ON li.line_schedule_item_id = sn.line_schedule_item_id
      LEFT JOIN silver.quality_test qt ON qt.quality_test_id = sn.quality_test_id
      LEFT JOIN silver.conditioning_run cr ON cr.conditioning_run_id = sn.conditioning_run_id
      LEFT JOIN silver.process_order po ON po.process_order_id = sn.process_order_id AND sn.source_column = 'sap_notes'
      WHERE sn.note_text IS DISTINCT FROM btrim(CASE
            WHEN li.line_schedule_item_id IS NOT NULL THEN CASE sn.source_column
                 WHEN 'run_order_note' THEN li.run_order_note WHEN 'priority_note' THEN li.priority_note
                 WHEN 'status_note' THEN li.status_note WHEN 'comments' THEN li.comments END
            WHEN qt.quality_test_id IS NOT NULL THEN qt.comments
            WHEN cr.conditioning_run_id IS NOT NULL THEN cr.defect_comments
            ELSE po.sap_notes END)
         OR (li.line_schedule_item_id IS NOT NULL AND (li.source_csv, li.source_row_number) <> (sn.source_csv, sn.source_row_number))
         OR (qt.quality_test_id IS NOT NULL AND (qt.source_csv, qt.source_row_number) <> (sn.source_csv, sn.source_row_number))
         OR (cr.conditioning_run_id IS NOT NULL AND (cr.source_csv, cr.source_row_number) <> (sn.source_csv, sn.source_row_number))) x
UNION ALL
SELECT 'gold', 'source_note', 'RELATION', 'process_order_id / work_center_id = those of the source row', 'ERROR', NULL, 0,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT sn.source_note_id::text k FROM gold.source_note sn
      LEFT JOIN silver.line_schedule_item li ON li.line_schedule_item_id = sn.line_schedule_item_id
      LEFT JOIN silver.quality_test qt ON qt.quality_test_id = sn.quality_test_id
      LEFT JOIN silver.conditioning_run cr ON cr.conditioning_run_id = sn.conditioning_run_id
      WHERE (li.line_schedule_item_id IS NOT NULL AND (sn.process_order_id IS DISTINCT FROM li.process_order_id
                                                       OR sn.work_center_id IS DISTINCT FROM li.work_center_id))
         OR (qt.quality_test_id IS NOT NULL AND (sn.process_order_id IS DISTINCT FROM qt.process_order_id
                                                OR sn.work_center_id IS DISTINCT FROM qt.work_center_id))
         OR (cr.conditioning_run_id IS NOT NULL AND (sn.process_order_id IS DISTINCT FROM cr.process_order_id
                                                    OR sn.work_center_id IS DISTINCT FROM cr.work_center_id))) x
UNION ALL
SELECT 'gold', 'source_note', 'RELATION', 'coverage: every non-empty silver note cell has a source_note', 'ERROR', NULL, 0,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT li.source_csv || ':' || li.source_row_number || ':' || c.col k
      FROM silver.line_schedule_item li
      CROSS JOIN LATERAL (VALUES ('run_order_note', li.run_order_note), ('priority_note', li.priority_note),
                                 ('status_note', li.status_note), ('comments', li.comments)) c (col, txt)
      WHERE nullif(btrim(c.txt), '') IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM gold.source_note sn WHERE sn.source_csv = li.source_csv
                          AND sn.source_row_number = li.source_row_number AND sn.source_column = c.col)) x
UNION ALL
SELECT 'gold', 'semantic_fact', 'RELATION', 'reading text = note text (same note_hash)', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT sf.semantic_fact_id::text k FROM gold.semantic_fact sf JOIN gold.source_note sn USING (source_note_id)
      JOIN raw.note_reading nr USING (note_reading_id) WHERE nr.note_hash <> sn.note_hash) x
UNION ALL
SELECT 'gold', 'semantic_fact', 'RELATION', 'process_order_id / work_center_id copied from source_note', 'ERROR', NULL, 0,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT sf.semantic_fact_id::text k FROM gold.semantic_fact sf JOIN gold.source_note sn USING (source_note_id)
      WHERE sf.process_order_id IS DISTINCT FROM sn.process_order_id OR sf.work_center_id IS DISTINCT FROM sn.work_center_id) x
UNION ALL
SELECT 'gold', 'semantic_fact', 'RELATION', 'fact = element fact_seq of the reading (type, confidence)', 'ERROR', NULL, 0,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT sf.semantic_fact_id::text k FROM gold.semantic_fact sf JOIN raw.note_reading nr USING (note_reading_id)
      WHERE sf.fact_type IS DISTINCT FROM nr.facts -> (sf.fact_seq - 1) ->> 'fact_type'
         OR sf.confidence IS DISTINCT FROM (nr.facts -> (sf.fact_seq - 1) ->> 'confidence')::numeric) x
UNION ALL
SELECT 'gold', 'semantic_fact', 'CARDINALITY', 'every (source_note × reading) has one fact per facts[] element', 'ERROR', NULL, 0,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT sn.source_note_id || '/' || nr.note_reading_id k
      FROM gold.source_note sn JOIN raw.note_reading nr ON nr.note_hash = sn.note_hash
      WHERE jsonb_array_length(nr.facts)
            <> (SELECT count(*) FROM gold.semantic_fact sf
                WHERE sf.source_note_id = sn.source_note_id AND sf.note_reading_id = nr.note_reading_id)) x
UNION ALL
SELECT 'raw', 'note_reading', 'RELATION', 'rules-v1 read every distinct operational schedule note', 'ERROR', NULL, 0,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT DISTINCT sn.note_text k FROM gold.source_note sn
      WHERE sn.source_column IN ('run_order_note', 'priority_note', 'status_note')
        AND NOT EXISTS (SELECT 1 FROM raw.note_reading nr
                        WHERE nr.note_hash = sn.note_hash AND nr.reader = 'RULE' AND nr.model_id = 'rules-v1')) x
UNION ALL
SELECT 'raw', 'note_reading', 'RELATION', 'every reading belongs to a note that exists', 'WARN', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT nr.note_text k FROM raw.note_reading nr
      WHERE NOT EXISTS (SELECT 1 FROM gold.source_note sn WHERE sn.note_hash = nr.note_hash)) x
UNION ALL
SELECT 'raw', 'note_review', 'RELATION', 'every active review targets a note that exists', 'WARN', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT r.note_review_id::text k FROM raw.note_review r
      WHERE r.voided_at IS NULL AND NOT EXISTS (SELECT 1 FROM gold.source_note sn WHERE sn.note_hash = r.note_hash)) x
UNION ALL
SELECT 'raw', 'note_review', 'RELATION', 'every active PO-scoped review targets a known PO', 'WARN', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT r.po_number k FROM raw.note_review r
      WHERE r.voided_at IS NULL AND r.po_number IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM silver.process_order po WHERE po.po_number = r.po_number)) x
UNION ALL
SELECT 'gold', 'v_trusted_fact', 'RELATION', 'only facts of the current reading of the note', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT tf.semantic_fact_id::text k FROM gold.v_trusted_fact tf
      JOIN gold.v_note_reading_current cur ON cur.note_hash = tf.note_hash
      WHERE cur.note_reading_id <> tf.note_reading_id) x

UNION ALL
SELECT 'gold', 'plan_event', 'RELATION', 'ingest event exists, not voided, same line', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT pe.plan_event_id::text k FROM gold.plan_event pe JOIN raw.ingest_event e USING (ingest_event_id)
      WHERE e.voided_at IS NOT NULL OR (gold.resolve_line(e.line_id)).work_center_id <> pe.work_center_id) x
UNION ALL
SELECT 'gold', 'plan_event', 'RELATION', 'event PO has a schedule row on the event line', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT pe.plan_event_id::text k FROM gold.plan_event pe
      WHERE pe.process_order_id IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM silver.line_schedule_item li
          WHERE li.process_order_id = pe.process_order_id AND li.work_center_id = pe.work_center_id)) x
UNION ALL
SELECT 'gold', 'plan_event', 'CARDINALITY', 'every non-voided ingest event was replayed into exactly one plan_event', 'ERROR', NULL, 0,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT e.ingest_event_id::text k FROM raw.ingest_event e
      WHERE e.voided_at IS NULL
        AND (SELECT count(*) FROM gold.plan_event pe WHERE pe.ingest_event_id = e.ingest_event_id) <> 1) x
UNION ALL
SELECT 'gold', 'plan_event', 'CARDINALITY', 'every plan_event triggered exactly one plan', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT pe.plan_event_id::text k FROM gold.plan_event pe
      WHERE (SELECT count(*) FROM gold.schedule_plan sp WHERE sp.plan_event_id = pe.plan_event_id) <> 1) x
UNION ALL
SELECT 'gold', 'schedule_plan', 'RELATION', 'parent plan: same line and version - 1; v1 has no parent', 'ERROR', NULL, 0,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT sp.work_center_id || '/v' || sp.plan_version k FROM gold.schedule_plan sp
      LEFT JOIN gold.schedule_plan pp ON pp.schedule_plan_id = sp.parent_plan_id
      WHERE (sp.plan_version = 1 AND sp.parent_plan_id IS NOT NULL)
         OR (sp.plan_version > 1 AND (pp.schedule_plan_id IS NULL OR pp.work_center_id <> sp.work_center_id
                                      OR pp.plan_version <> sp.plan_version - 1))) x
UNION ALL
SELECT 'gold', 'schedule_plan', 'RELATION', 'event and plan are on the same line', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT sp.schedule_plan_id::text k FROM gold.schedule_plan sp JOIN gold.plan_event pe USING (plan_event_id)
      WHERE pe.work_center_id <> sp.work_center_id) x
UNION ALL
SELECT 'gold', 'schedule_plan', 'RELATION', 'policy applies to the line (line row or default)', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT sp.schedule_plan_id::text k FROM gold.schedule_plan sp JOIN gold.policy p USING (policy_id)
      WHERE p.work_center_id IS NOT NULL AND p.work_center_id <> sp.work_center_id) x
UNION ALL
SELECT 'gold', 'schedule_entry', 'RELATION', 'schedule row: same PO and same line as the plan', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT se.schedule_entry_id::text k FROM gold.schedule_entry se
      JOIN gold.schedule_plan sp USING (schedule_plan_id)
      JOIN silver.line_schedule_item li ON li.line_schedule_item_id = se.line_schedule_item_id
      WHERE li.process_order_id <> se.process_order_id OR li.work_center_id <> sp.work_center_id) x
UNION ALL
SELECT 'gold', 'schedule_entry', 'RELATION', 'latest plan = exactly the open queue of the line (no missing, no extra)', 'ERROR', NULL, 0,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT coalesce(q.po_number, po.po_number) || CASE WHEN q.line_schedule_item_id IS NULL THEN ' (extra)' ELSE ' (missing)' END k
      FROM (SELECT q.* FROM gold.v_open_queue q JOIN latest l USING (work_center_id)) q
      FULL JOIN (SELECT se.* FROM gold.schedule_entry se JOIN latest l USING (schedule_plan_id)) se
             ON se.line_schedule_item_id = q.line_schedule_item_id
      LEFT JOIN silver.process_order po ON po.process_order_id = se.process_order_id
      WHERE q.line_schedule_item_id IS NULL OR se.schedule_entry_id IS NULL) x
UNION ALL
SELECT 'gold', 'schedule_entry', 'RELATION', 'previous_position = position of the PO in the parent plan', 'ERROR', NULL, 0,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT se.schedule_entry_id::text k FROM gold.schedule_entry se
      JOIN gold.schedule_plan sp USING (schedule_plan_id)
      LEFT JOIN gold.schedule_entry pe ON pe.schedule_plan_id = sp.parent_plan_id AND pe.process_order_id = se.process_order_id
      WHERE se.previous_position IS DISTINCT FROM pe.position) x
UNION ALL
SELECT 'gold', 'entry_reason_fact', 'RELATION', 'fact is about the entry PO', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT erf.entry_reason_id || '/' || erf.semantic_fact_id k FROM gold.entry_reason_fact erf
      JOIN gold.entry_reason er USING (entry_reason_id) JOIN gold.schedule_entry se USING (schedule_entry_id)
      JOIN gold.semantic_fact sf USING (semantic_fact_id)
      WHERE sf.process_order_id IS DISTINCT FROM se.process_order_id) x
UNION ALL
SELECT 'gold', 'entry_reason_fact', 'RELATION', 'fact type matches the reason (NOT_READY_* ↔ NOT_READY, NOTE_HOLD ↔ HOLD, …)', 'ERROR', NULL, 0,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT rc.reason_code || '/' || sf.fact_type k FROM gold.entry_reason_fact erf
      JOIN gold.entry_reason er USING (entry_reason_id) JOIN gold.reason_code rc USING (reason_code_id)
      JOIN gold.semantic_fact sf USING (semantic_fact_id)
      WHERE (rc.reason_code, sf.fact_type) NOT IN (('NOT_READY_HOLD', 'NOT_READY'), ('NOT_READY_WARNING', 'NOT_READY'),
                                                  ('NOTE_HOLD', 'HOLD'), ('NOTE_RUSH', 'RUSH'), ('NOTE_DEADLINE', 'DEADLINE'))) x
UNION ALL
SELECT 'gold', 'entry_reason', 'RELATION', 'reason params.semantic_fact_id is linked in entry_reason_fact', 'ERROR', NULL, 0,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT er.entry_reason_id::text k FROM gold.entry_reason er
      WHERE er.params ? 'semantic_fact_id' AND NOT EXISTS (
          SELECT 1 FROM gold.entry_reason_fact f
          WHERE f.entry_reason_id = er.entry_reason_id AND f.semantic_fact_id = (er.params ->> 'semantic_fact_id')::bigint)) x
UNION ALL
SELECT 'gold', 'entry_reason', 'RELATION', 'QA_HOLD cites a FAIL test of the same PO', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT er.entry_reason_id::text k FROM gold.entry_reason er JOIN gold.reason_code rc USING (reason_code_id)
      JOIN gold.schedule_entry se USING (schedule_entry_id)
      LEFT JOIN silver.quality_test qt ON qt.quality_test_id = (er.params ->> 'quality_test_id')::bigint
      WHERE rc.reason_code = 'QA_HOLD'
        AND (qt.quality_test_id IS NULL OR qt.result_code <> 'FAIL' OR qt.process_order_id <> se.process_order_id)) x
UNION ALL
SELECT 'gold', 'entry_reason', 'RELATION', 'CUSTOMER_DEMAND cites orders allocated to the entry PO', 'ERROR', NULL, 0,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT er.params ->> 'order_number' k FROM gold.entry_reason er JOIN gold.reason_code rc USING (reason_code_id)
      JOIN gold.schedule_entry se USING (schedule_entry_id)
      WHERE rc.reason_code = 'CUSTOMER_DEMAND' AND NOT EXISTS (
          SELECT 1 FROM silver.order_allocation oa JOIN silver.customer_order co USING (customer_order_id)
          WHERE oa.process_order_id = se.process_order_id AND co.order_number = er.params ->> 'order_number')) x
UNION ALL
SELECT 'gold', 'plan_decision', 'RELATION', 'status ACCEPTED ⇒ the plan has an ACCEPT decision', 'ERROR', NULL, 0,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT sp.schedule_plan_id::text k FROM gold.schedule_plan sp
      WHERE sp.status = 'ACCEPTED' AND NOT EXISTS (
          SELECT 1 FROM gold.plan_decision d WHERE d.schedule_plan_id = sp.schedule_plan_id AND d.decision = 'ACCEPT')) x

-- ============================================================================ CARDINALITY
UNION ALL
SELECT 'gold', 'schedule_plan', 'CARDINALITY', 'every demo line has a plan', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT wc.demo_line_id k FROM silver.work_center wc
      WHERE wc.demo_line_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM gold.schedule_plan sp WHERE sp.work_center_id = wc.work_center_id)) x
UNION ALL
SELECT 'gold', 'schedule_plan', 'CARDINALITY', 'exactly one non-SUPERSEDED plan per line, and it is the latest', 'ERROR', NULL, 0,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT sp.work_center_id::text k FROM gold.schedule_plan sp
      GROUP BY sp.work_center_id
      HAVING count(*) FILTER (WHERE sp.status <> 'SUPERSEDED') <> 1
          OR max(sp.plan_version) FILTER (WHERE sp.status <> 'SUPERSEDED') <> max(sp.plan_version)) x
UNION ALL
SELECT 'gold', 'schedule_plan', 'CARDINALITY', 'plan versions are contiguous 1..n per line', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT work_center_id::text k FROM gold.schedule_plan GROUP BY 1 HAVING max(plan_version) <> count(*) OR min(plan_version) <> 1) x
UNION ALL
SELECT 'gold', 'schedule_entry', 'CARDINALITY', 'every plan has ≥ 1 entry', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT sp.schedule_plan_id::text k FROM gold.schedule_plan sp
      WHERE NOT EXISTS (SELECT 1 FROM gold.schedule_entry se WHERE se.schedule_plan_id = sp.schedule_plan_id)) x
UNION ALL
SELECT 'gold', 'schedule_entry', 'CARDINALITY', 'positions contiguous 1..n; PLANNED first, then HOLD', 'ERROR', NULL, 0,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT schedule_plan_id::text k FROM gold.schedule_entry GROUP BY schedule_plan_id
      HAVING min(position) <> 1 OR max(position) <> count(*)
          OR coalesce(max(position) FILTER (WHERE entry_status = 'PLANNED'), 0)
             > coalesce(min(position) FILTER (WHERE entry_status = 'HOLD'), 2147483647)) x
UNION ALL
SELECT 'gold', 'entry_reason', 'CARDINALITY', 'every entry has ≥ 1 reason; seq contiguous 1..n', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT se.schedule_entry_id::text k FROM gold.schedule_entry se
      LEFT JOIN gold.entry_reason er USING (schedule_entry_id)
      GROUP BY se.schedule_entry_id
      HAVING count(er.entry_reason_id) = 0 OR min(er.seq) <> 1 OR max(er.seq) <> count(er.entry_reason_id)) x
UNION ALL
SELECT 'gold', 'entry_reason', 'CARDINALITY', 'HOLD entries have exactly one HARD reason, at seq 1', 'ERROR', NULL, 0,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT se.schedule_entry_id::text k FROM gold.schedule_entry se
      JOIN gold.entry_reason er USING (schedule_entry_id) JOIN gold.reason_code rc USING (reason_code_id)
      WHERE se.entry_status = 'HOLD'
      GROUP BY se.schedule_entry_id
      HAVING count(*) <> 1 OR bool_or(er.seq <> 1 OR rc.category <> 'HARD')) x
UNION ALL
SELECT 'gold', 'policy', 'CARDINALITY', 'exactly one ACTIVE default policy', 'ERROR', NULL, 1,
       (SELECT count(*) FROM gold.policy WHERE work_center_id IS NULL AND status = 'ACTIVE'), NULL
UNION ALL
SELECT 'gold', 'policy', 'CARDINALITY', 'at most one ACTIVE policy per line', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT coalesce(work_center_id::text, 'default') k FROM gold.policy WHERE status = 'ACTIVE' GROUP BY 1 HAVING count(*) > 1) x
UNION ALL
SELECT 'gold', 'v_plan_status', 'CARDINALITY', 'exactly one is_latest per line', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT work_center_id::text k FROM gold.v_plan_status GROUP BY 1 HAVING count(*) FILTER (WHERE is_latest) <> 1) x
UNION ALL
SELECT 'gold', 'changeover_rule', 'CARDINALITY', 'every in-scope line with plans has SAME_VARIETY / SAME_SPECIES / SPECIES_CHANGE', 'ERROR', NULL, 0,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT wc.work_center_code || '/' || t.code k FROM silver.work_center wc
      CROSS JOIN (VALUES ('SAME_VARIETY'), ('SAME_SPECIES'), ('SPECIES_CHANGE')) t (code)
      WHERE wc.demo_line_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM gold.changeover_rule r WHERE r.work_center_id = wc.work_center_id AND r.transition_code = t.code)) x
UNION ALL
SELECT 'gold', 'changeover_rule', 'CARDINALITY', 'TRAIT_CHANGE rules exist (Excelis / GMO / Fresh switch, SQ-11)', 'WARN', 'G-07', 0,
       CASE WHEN EXISTS (SELECT 1 FROM gold.changeover_rule WHERE transition_code = 'TRAIT_CHANGE') THEN 0 ELSE 1 END,
       'no TRAIT_CHANGE row'

-- ============================================================================ CONSTRAINT
UNION ALL
SELECT 'gold', 'schedule_entry', 'CONSTRAINT', 'PLANNED: start, end, run h, changeover h present; end ≥ start; h ≥ 0', 'ERROR', NULL, 0,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT schedule_entry_id::text k FROM gold.schedule_entry
      WHERE entry_status = 'PLANNED'
        AND (planned_start_at IS NULL OR planned_end_at IS NULL OR est_run_h IS NULL OR est_changeover_h IS NULL
             OR planned_end_at < planned_start_at OR est_run_h < 0 OR est_changeover_h < 0)) x
UNION ALL
SELECT 'gold', 'schedule_entry', 'CONSTRAINT', 'HOLD: no planned times, not at risk', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT schedule_entry_id::text k FROM gold.schedule_entry
      WHERE entry_status = 'HOLD' AND (planned_start_at IS NOT NULL OR planned_end_at IS NOT NULL OR is_at_risk)) x
UNION ALL
SELECT 'gold', 'schedule_entry', 'CONSTRAINT', 'timeline: start = previous end + changeover; first start = horizon', 'ERROR', NULL, 0,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT x.schedule_entry_id::text k FROM (
          SELECT se.*, sp.horizon_start,
                 lag(se.planned_end_at) OVER (PARTITION BY se.schedule_plan_id ORDER BY se.position) AS prev_end
          FROM gold.schedule_entry se JOIN gold.schedule_plan sp USING (schedule_plan_id)
          WHERE se.entry_status = 'PLANNED') x
      WHERE x.planned_start_at <> coalesce(x.prev_end, x.horizon_start) + x.est_changeover_h * interval '1 hour'
         OR x.planned_end_at <> x.planned_start_at + x.est_run_h * interval '1 hour') x
UNION ALL
SELECT 'gold', 'schedule_entry', 'CONSTRAINT', 'slack_days = due_date − planned end date (plant TZ); at risk ⇔ slack < 0', 'ERROR', NULL, 0,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT se.schedule_entry_id::text k FROM gold.schedule_entry se, tz
      WHERE se.entry_status = 'PLANNED'
        AND (se.slack_days IS DISTINCT FROM (se.due_date - (se.planned_end_at AT TIME ZONE tz.tz)::date)
             OR se.is_at_risk <> coalesce(se.slack_days < 0, false))) x
UNION ALL
SELECT 'gold', 'entry_reason', 'CONSTRAINT', 'params carry the reason_code.param_keys', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT rc.reason_code || '#' || er.entry_reason_id k FROM gold.entry_reason er JOIN gold.reason_code rc USING (reason_code_id)
      WHERE NOT (er.params ?& rc.param_keys)) x
UNION ALL
SELECT 'gold', 'reason_code', 'CONSTRAINT', 'template placeholders not guaranteed by param_keys (render "—" when absent)', 'INFO', 'G-21', 0,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT DISTINCT rc.reason_code || ':' || m[1] k
      FROM gold.reason_code rc, regexp_matches(rc.template, '\{([a-z_]+)\}', 'g') m
      WHERE NOT (m[1] = ANY (rc.param_keys))) x
UNION ALL
SELECT 'gold', 'semantic_fact', 'CONSTRAINT', 'status rule: AUTO ⇔ conf ≥ policy floor (or HUMAN); reviewed ⇔ reviewed_by', 'ERROR', NULL, 0,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT sf.semantic_fact_id::text k FROM gold.semantic_fact sf
      WHERE (sf.status = 'AUTO' AND sf.reader <> 'HUMAN'
             AND sf.confidence < (gold.active_policy(sf.work_center_id)).fact_min_confidence)
         OR (sf.status = 'NEEDS_CONFIRMATION' AND sf.confidence >= (gold.active_policy(sf.work_center_id)).fact_min_confidence)
         OR (sf.status IN ('CONFIRMED', 'REJECTED')) <> (sf.reviewed_by IS NOT NULL)) x
UNION ALL
SELECT 'gold', 'semantic_fact', 'CONSTRAINT', 'reviewed status = latest active raw.note_review', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT sf.semantic_fact_id::text k FROM gold.semantic_fact sf JOIN gold.source_note sn USING (source_note_id)
      LEFT JOIN silver.process_order po ON po.process_order_id = sf.process_order_id
      LEFT JOIN LATERAL (SELECT r.decision FROM raw.note_review r
                         WHERE r.voided_at IS NULL AND r.note_hash = sn.note_hash AND r.fact_type = sf.fact_type
                           AND (r.po_number = po.po_number OR r.po_number IS NULL)
                         ORDER BY (r.po_number IS NULL), r.reviewed_at DESC, r.note_review_id DESC LIMIT 1) rv ON true
      WHERE rv.decision IS DISTINCT FROM CASE WHEN sf.status IN ('CONFIRMED', 'REJECTED') THEN sf.status END) x
UNION ALL
SELECT 'gold', 'policy', 'CONSTRAINT', 'ACTIVE policies: LEXICOGRAPHIC and only known criteria codes', 'ERROR', NULL, 0,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT p.policy_id || ':' || coalesce(c ->> 'code', 'null') k FROM gold.policy p, jsonb_array_elements(p.criteria) c
      WHERE p.status = 'ACTIVE'
        AND (p.ranking_mode <> 'LEXICOGRAPHIC'
             OR coalesce(c ->> 'code', '') NOT IN ('ONLINE_FIRST', 'RUSH', 'URGENT_DUE', 'PRIORITY', 'SAME_VARIETY',
                                                   'SAME_SPECIES', 'DUE_DATE', 'RUN_ORDER'))) x
UNION ALL
SELECT 'gold', 'changeover_rule', 'CONSTRAINT', 'DERIVED rules = v_changeover_observed medians, n ≥ 5', 'ERROR', NULL, 0,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT r.work_center_id || '/' || r.transition_code k FROM gold.changeover_rule r
      LEFT JOIN gold.v_changeover_observed o USING (work_center_id, transition_code)
      WHERE r.rule_source = 'DERIVED'
        AND (o.n IS NULL OR o.n < 5 OR r.derived_n <> o.n OR r.hours <> o.median_changeover_h
             OR r.prep_h <> o.median_prep_h OR r.cleandown_h <> o.median_cleandown_h)) x
UNION ALL
SELECT 'gold', 'changeover_rule', 'CONSTRAINT', 'monotonic: SAME_VARIETY ≤ SAME_SPECIES ≤ SPECIES_CHANGE (SQ-11)', 'WARN', 'G-07', 0,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT wc.work_center_code k FROM gold.changeover_rule r JOIN silver.work_center wc USING (work_center_id)
      GROUP BY wc.work_center_code
      HAVING max(r.hours) FILTER (WHERE r.transition_code = 'SAME_VARIETY') > max(r.hours) FILTER (WHERE r.transition_code = 'SAME_SPECIES')
          OR max(r.hours) FILTER (WHERE r.transition_code = 'SAME_SPECIES') > max(r.hours) FILTER (WHERE r.transition_code = 'SPECIES_CHANGE')) x
UNION ALL
SELECT 'gold', 'v_open_queue', 'CONSTRAINT', 'due_date = least(need_by, finish) and due_date_basis agrees', 'ERROR', NULL, 0,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT po_number k FROM gold.v_open_queue
      WHERE due_date IS DISTINCT FROM least(need_by_date, scheduled_finish_date)
         OR (due_date_basis = 'NEED_BY' AND due_date IS DISTINCT FROM need_by_date)
         OR (due_date_basis = 'SCHEDULE_FINISH' AND due_date IS DISTINCT FROM scheduled_finish_date)
         OR ((due_date IS NULL) <> (due_date_basis IS NULL))) x
UNION ALL
SELECT 'gold', 'v_open_queue', 'CONSTRAINT', 'open rows on served lines without kg (run time would be 0, SQ-26)', 'WARN', 'G-10', 0,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT po_number k FROM gold.v_open_queue WHERE demo_line_id IS NOT NULL AND NOT has_kg) x
UNION ALL
SELECT 'gold', 'v_open_queue', 'CONSTRAINT', 'open rows on served lines using the line-median speed (THROUGHPUT_FALLBACK)', 'INFO', 'G-11', 0,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT po_number || ':' || coalesce(species_code, '-') k FROM gold.v_open_queue
      WHERE demo_line_id IS NOT NULL AND throughput_basis = 'WORK_CENTER') x

-- ============================================================================ RULE
UNION ALL
SELECT 'gold', 'schedule_entry', 'RULE', 'a runnable ONLINE batch is position 1', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT se.schedule_plan_id || '/' || se.position k FROM gold.schedule_entry se
      JOIN silver.line_schedule_item li ON li.line_schedule_item_id = se.line_schedule_item_id
      WHERE li.status_code = 'ONLINE' AND se.entry_status = 'PLANNED' AND se.position <> 1) x
UNION ALL
SELECT 'gold', 'v_open_queue', 'RULE', 'a note never holds the ONLINE batch (D-07)', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT po_number k FROM gold.v_open_queue WHERE status_code = 'ONLINE' AND hold_reason IN ('NOT_READY', 'NOTE_HOLD')) x
UNION ALL
SELECT 'gold', 'v_open_queue', 'RULE', 'is_hold ⇔ hold_reason is set', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT po_number k FROM gold.v_open_queue WHERE is_hold <> (hold_reason IS NOT NULL)) x
UNION ALL
SELECT 'gold', 'v_open_queue', 'RULE', 'is_not_ready ⇔ trusted NOT_READY and no RELEASE on the row''s notes', 'ERROR', NULL, 0,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT q.po_number k FROM gold.v_open_queue q
      WHERE q.is_not_ready <> (
          EXISTS (SELECT 1 FROM gold.v_trusted_fact f WHERE f.line_schedule_item_id = q.line_schedule_item_id AND f.fact_type = 'NOT_READY')
          AND NOT EXISTS (SELECT 1 FROM gold.v_trusted_fact f WHERE f.line_schedule_item_id = q.line_schedule_item_id AND f.fact_type = 'RELEASE'))) x
UNION ALL
SELECT 'gold', 'schedule_entry', 'RULE', 'latest plan: HOLD ⇔ v_open_queue.is_hold', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT q.po_number k FROM gold.schedule_entry se JOIN latest l USING (schedule_plan_id)
      JOIN gold.v_open_queue q ON q.line_schedule_item_id = se.line_schedule_item_id
      WHERE (se.entry_status = 'HOLD') <> q.is_hold) x
UNION ALL
SELECT 'gold', 'entry_reason', 'RULE', 'latest plan: HOLD reason matches hold_reason (QA_FAIL→QA_HOLD, STATUS→STATUS_HOLD, …)', 'ERROR', NULL, 0,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT q.po_number || ':' || rc.reason_code k FROM gold.schedule_entry se JOIN latest l USING (schedule_plan_id)
      JOIN gold.v_open_queue q ON q.line_schedule_item_id = se.line_schedule_item_id
      JOIN gold.entry_reason er ON er.schedule_entry_id = se.schedule_entry_id AND er.seq = 1
      JOIN gold.reason_code rc USING (reason_code_id)
      WHERE se.entry_status = 'HOLD'
        AND rc.reason_code <> CASE q.hold_reason WHEN 'QA_FAIL' THEN 'QA_HOLD' WHEN 'STATUS' THEN 'STATUS_HOLD'
                                                 WHEN 'NOT_READY' THEN 'NOT_READY_HOLD' WHEN 'NOTE_HOLD' THEN 'NOTE_HOLD' END) x
UNION ALL
SELECT 'gold', 'entry_reason', 'RULE', 'latest plan: ONLINE + not-ready note ⇒ NOT_READY_WARNING', 'ERROR', NULL, 0,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT q.po_number k FROM gold.schedule_entry se JOIN latest l USING (schedule_plan_id)
      JOIN gold.v_open_queue q ON q.line_schedule_item_id = se.line_schedule_item_id
      WHERE q.status_code = 'ONLINE' AND q.is_not_ready AND se.entry_status = 'PLANNED'
        AND NOT EXISTS (SELECT 1 FROM gold.entry_reason er JOIN gold.reason_code rc USING (reason_code_id)
                        WHERE er.schedule_entry_id = se.schedule_entry_id AND rc.reason_code = 'NOT_READY_WARNING')) x
UNION ALL
SELECT 'gold', 'entry_reason', 'RULE', 'note-backed reasons are linked to ≥ 1 fact', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT er.entry_reason_id::text k FROM gold.entry_reason er JOIN gold.reason_code rc USING (reason_code_id)
      WHERE rc.reason_code IN ('NOT_READY_HOLD', 'NOT_READY_WARNING', 'NOTE_HOLD', 'NOTE_RUSH', 'NOTE_DEADLINE')
        AND NOT EXISTS (SELECT 1 FROM gold.entry_reason_fact f WHERE f.entry_reason_id = er.entry_reason_id)) x
UNION ALL
SELECT 'gold', 'entry_reason', 'RULE', 'linked facts are trusted (AUTO / CONFIRMED) in latest plans', 'ERROR', NULL, 0,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT erf.semantic_fact_id::text k FROM gold.entry_reason_fact erf
      JOIN gold.entry_reason er USING (entry_reason_id) JOIN gold.schedule_entry se USING (schedule_entry_id)
      JOIN latest l USING (schedule_plan_id) JOIN gold.semantic_fact sf USING (semantic_fact_id)
      WHERE sf.status NOT IN ('AUTO', 'CONFIRMED')) x
UNION ALL
SELECT 'gold', 'entry_reason', 'RULE', 'seq 1 of an ONLINE planned entry is ALREADY_RUNNING', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT se.schedule_entry_id::text k FROM gold.schedule_entry se
      JOIN silver.line_schedule_item li ON li.line_schedule_item_id = se.line_schedule_item_id
      JOIN gold.entry_reason er ON er.schedule_entry_id = se.schedule_entry_id AND er.seq = 1
      JOIN gold.reason_code rc USING (reason_code_id)
      WHERE li.status_code = 'ONLINE' AND se.entry_status = 'PLANNED' AND rc.reason_code <> 'ALREADY_RUNNING') x
UNION ALL
SELECT 'gold', 'schedule_plan', 'RULE', 'every plan cites its policy', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT schedule_plan_id::text k FROM gold.schedule_plan WHERE policy_id IS NULL) x

-- ============================================================================ CATALOG (key standard, uc1-data-model §5.3)
UNION ALL
SELECT 'catalog', 'silver/gold/raw', 'CATALOG', 'every table has a primary key', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT n.nspname || '.' || c.relname k FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind = 'r' AND n.nspname IN ('silver', 'gold') AND c.relname NOT LIKE '%\_legacy'
        AND NOT EXISTS (SELECT 1 FROM pg_constraint k WHERE k.conrelid = c.oid AND k.contype = 'p')) x
UNION ALL
SELECT 'catalog', 'silver/gold', 'CATALOG', 'every bigint *_id column (not the PK, not load_id) has a foreign key', 'ERROR', NULL, 0, count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT n.nspname || '.' || c.relname || '.' || a.attname k
      FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind = 'r' AND n.nspname IN ('silver', 'gold') AND c.relname NOT LIKE '%\_legacy'
        AND a.attnum > 0 AND NOT a.attisdropped AND a.attname LIKE '%\_id' AND a.attname <> 'load_id'
        AND a.atttypid = 'bigint'::regtype
        AND NOT EXISTS (SELECT 1 FROM pg_constraint k WHERE k.conrelid = c.oid AND k.contype = 'p' AND k.conkey = ARRAY[a.attnum])
        AND NOT EXISTS (SELECT 1 FROM pg_constraint k WHERE k.conrelid = c.oid AND k.contype = 'f' AND a.attnum = ANY (k.conkey))) x
UNION ALL
SELECT 'silver', '* (fact tables)', 'RELATION', 'load_id (lineage, no declared FK) exists in raw.load_batch as SUCCESS', 'ERROR', NULL, 0,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT t.tbl || ':' || t.load_id k FROM (
          SELECT 'process_order' tbl, load_id FROM silver.process_order
          UNION ALL SELECT 'process_order_work_center', load_id FROM silver.process_order_work_center
          UNION ALL SELECT 'line_schedule_item', load_id FROM silver.line_schedule_item
          UNION ALL SELECT 'conditioning_run', load_id FROM silver.conditioning_run
          UNION ALL SELECT 'quality_test', load_id FROM silver.quality_test) t
      WHERE t.load_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM raw.load_batch b WHERE b.load_id = t.load_id AND b.status = 'SUCCESS')
      GROUP BY t.tbl, t.load_id) x
UNION ALL
SELECT 'silver', '* (fact tables)', 'RELATION', 'load_id NULL only on rows not loaded from a CSV (ingest / BFF)', 'WARN', 'G-09', 0,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT t.tbl || ':' || t.src k FROM (
          SELECT 'process_order' tbl, source_csv || ':' || source_row_number src, load_id, source_csv FROM silver.process_order
          UNION ALL SELECT 'line_schedule_item', source_csv || ':' || source_row_number, load_id, source_csv FROM silver.line_schedule_item
          UNION ALL SELECT 'conditioning_run', source_csv || ':' || source_row_number, load_id, source_csv FROM silver.conditioning_run
          UNION ALL SELECT 'quality_test', source_csv || ':' || source_row_number, load_id, source_csv FROM silver.quality_test) t
      WHERE t.load_id IS NULL AND t.source_csv <> 'raw.ingest_event') x
UNION ALL
SELECT 'catalog', 'silver/gold', 'CATALOG', 'FK named after the referenced PK (column = referenced column)', 'WARN', NULL, 0,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT c.relname || '.' || a.attname || '→' || rc.relname || '.' || ra.attname k
      FROM pg_constraint k
      JOIN pg_class c ON c.oid = k.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = k.conkey[1]
      JOIN pg_class rc ON rc.oid = k.confrelid JOIN pg_attribute ra ON ra.attrelid = rc.oid AND ra.attnum = k.confkey[1]
      WHERE k.contype = 'f' AND n.nspname IN ('silver', 'gold') AND c.relname NOT LIKE '%\_legacy'
        AND a.attname <> ra.attname AND NOT (a.attname = 'parent_plan_id' AND ra.attname = 'schedule_plan_id')) x
UNION ALL
SELECT 'catalog', 'silver/gold', 'CATALOG', 'FK columns without a leading index (join / cascade cost)', 'INFO', NULL, 0,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT c.relname || '.' || a.attname k
      FROM pg_constraint k
      JOIN pg_class c ON c.oid = k.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = k.conkey[1]
      WHERE k.contype = 'f' AND n.nspname IN ('silver', 'gold') AND c.relname NOT LIKE '%\_legacy'
        AND NOT EXISTS (SELECT 1 FROM pg_index i WHERE i.indrelid = c.oid AND i.indkey[0] = k.conkey[1])) x
UNION ALL
SELECT 'catalog', 'gold', 'CATALOG', 'gold v3 tables kept as *_legacy, each with a reason comment', 'ERROR', NULL, 0,
       count(*), array_to_string((array_agg(k ORDER BY k))[1:5], ', ')
FROM (SELECT c.relname k FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'gold' AND c.relkind = 'r' AND c.relname LIKE '%\_legacy'
        AND coalesce(obj_description(c.oid, 'pg_class'), '') NOT LIKE 'LEGACY gold v3%') x
)
SELECT layer, obj AS "table", category, check_name, severity, gap, expected, actual,
       CASE WHEN actual = expected THEN 'PASS'
            WHEN severity = 'ERROR' THEN 'FAIL'
            WHEN severity = 'WARN' THEN 'WARN'
            ELSE 'INFO' END AS status,
       sample
FROM c
ORDER BY CASE WHEN actual = expected THEN 4 WHEN severity = 'ERROR' THEN 1 WHEN severity = 'WARN' THEN 2 ELSE 3 END,
         array_position(ARRAY['GRAIN', 'RELATION', 'CARDINALITY', 'CONSTRAINT', 'RULE', 'CATALOG'], category),
         layer, obj, check_name;
