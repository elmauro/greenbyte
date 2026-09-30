-- Apply one raw.ingest_event to silver (used at runtime by gold.ingest_* and on every build to replay the log).
--   sap_priority_change -> silver.process_order_change (priority / scheduled finish delta on an existing PO)
--   pass_fail_log       -> silver.quality_test row (source_csv = 'raw.ingest_event', source_row_number = ingest_event_id)
-- The PO must already exist in silver.process_order: ingest never invents a PO.

-- Current effective priority of a PO (latest ingested change, else its open schedule row, else SAP).
CREATE FUNCTION silver.effective_priority(p_process_order_id bigint) RETURNS smallint
LANGUAGE sql STABLE AS $$
    SELECT coalesce(
        (SELECT c.priority_rank FROM silver.process_order_change c
         WHERE c.process_order_id = p_process_order_id AND c.priority_rank IS NOT NULL
         ORDER BY c.ingest_event_id DESC LIMIT 1),
        (SELECT li.priority_rank FROM silver.line_schedule_item li
         WHERE li.process_order_id = p_process_order_id AND li.status_code <> 'COMPLETE' AND NOT li.is_duplicate
         ORDER BY li.priority_rank NULLS LAST LIMIT 1),
        (SELECT po.priority_rank FROM silver.process_order po WHERE po.process_order_id = p_process_order_id))
$$;

CREATE FUNCTION silver.apply_ingest_event(p_ingest_event_id bigint) RETURNS bigint
LANGUAGE plpgsql AS $$
DECLARE
    e        raw.ingest_event;
    v_po     silver.process_order;
    v_prio   smallint;
    v_result text;
BEGIN
    SELECT * INTO e FROM raw.ingest_event WHERE ingest_event_id = p_ingest_event_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'ingest_event % not found', p_ingest_event_id USING ERRCODE = 'no_data_found';
    END IF;
    IF e.voided_at IS NOT NULL THEN
        RAISE EXCEPTION 'ingest_event % is voided', p_ingest_event_id USING ERRCODE = 'invalid_parameter_value';
    END IF;

    SELECT * INTO v_po FROM silver.process_order
    WHERE po_number = (silver.norm_po(e.payload ->> 'po')).po_number;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'PO % is not a known process order', e.payload ->> 'po' USING ERRCODE = 'no_data_found';
    END IF;

    IF e.event_source = 'sap_priority_change' THEN
        v_prio := silver.to_rank(e.payload ->> 'priority');
        IF v_prio IS NULL AND silver.to_date(left(e.payload ->> 'scheduledFinish', 10)) IS NULL THEN
            RAISE EXCEPTION 'sap_priority_change needs priority and/or scheduledFinish (YYYY-MM-DD…)'
                USING ERRCODE = 'invalid_parameter_value';
        END IF;
        INSERT INTO silver.process_order_change
            (process_order_id, ingest_event_id, priority_rank, scheduled_finish_date, is_rush, changed_at)
        VALUES (v_po.process_order_id, e.ingest_event_id, v_prio,
                silver.to_date(left(e.payload ->> 'scheduledFinish', 10)),
                coalesce((e.payload ->> 'rush')::boolean,
                         v_prio IS NOT NULL AND v_prio < coalesce(silver.effective_priority(v_po.process_order_id), 32767)),
                e.received_at)
        ON CONFLICT (ingest_event_id) DO NOTHING;
    ELSE
        v_result := silver.result_code(e.payload ->> 'passFail');
        IF v_result = 'PENDING' THEN
            RAISE EXCEPTION 'pass_fail_log needs passFail = Pass | Fail' USING ERRCODE = 'invalid_parameter_value';
        END IF;
        INSERT INTO silver.quality_test
            (process_order_id, po_number_raw, po_number_status, lot_id, work_center_id, equipment_raw,
             output_batch_number, test_date, species_code, variety_code, size_fraction_code, size_fraction_raw,
             batch_kg, result_code, fail_reason_code, comments, ingest_event_id, source_csv, source_row_number, dq_flags)
        SELECT v_po.process_order_id, e.payload ->> 'po', (silver.norm_po(e.payload ->> 'po')).po_number_status,
               coalesce(l.lot_id, v_po.lot_id),
               coalesce(silver.resolve_work_center('lsv_pass_fail_log.csv', e.payload ->> 'equipmentId'),
                        (SELECT work_center_id FROM silver.work_center WHERE demo_line_id = e.line_id)),
               e.payload ->> 'equipmentId',
               silver.to_num(e.payload ->> 'outputBatch')::bigint,
               coalesce(silver.to_date(e.payload ->> 'testDate'), e.received_at::date),
               sp.species_code, m.variety_code,
               silver.size_code(e.payload ->> 'sizeFraction'), e.payload ->> 'sizeFraction',
               silver.to_num(e.payload ->> 'kgs'),
               v_result, silver.fail_code(e.payload ->> 'failedFor'), e.payload ->> 'comments',
               e.ingest_event_id, 'raw.ingest_event', e.ingest_event_id,
               CASE WHEN v_result = 'FAIL' AND silver.fail_code(e.payload ->> 'failedFor') IS NULL
                    THEN ARRAY['DQ-18'] ELSE '{}'::text[] END
        FROM (SELECT 1) one
        LEFT JOIN silver.lot l ON l.lot_number = silver.norm_lot(e.payload ->> 'lotNumber')
        LEFT JOIN silver.material m ON m.material_id = v_po.material_id
        LEFT JOIN silver.species sp ON sp.species_id = v_po.species_id
        ON CONFLICT (source_csv, source_row_number) DO NOTHING;
    END IF;

    INSERT INTO silver.process_order_source (process_order_id, source_role, source_csv, source_row_number)
    VALUES (v_po.process_order_id, 'INGEST', 'raw.ingest_event', e.ingest_event_id)
    ON CONFLICT (source_csv, source_row_number) DO NOTHING;

    RETURN v_po.process_order_id;
END
$$;
