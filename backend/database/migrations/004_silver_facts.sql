-- Silver operational facts. Every fact row carries lineage (uc1-data-model §5.2):
--   source_csv, source_row_number (= Excel row), source_file_sha256, load_id (raw.load_batch), dq_flags (DQ-01…DQ-24).
-- Rows created from raw.ingest_event use source_csv = 'raw.ingest_event' and source_row_number = ingest_event_id.
-- PO references keep the source value (po_number_raw) and the R-PO outcome (po_number_status).

CREATE TABLE silver.lot (
    lot_id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    lot_number              text     NOT NULL UNIQUE,
    species_id              bigint   REFERENCES silver.species,
    crop_year               smallint,
    crop_year_suffix        text,
    source_csv              text     NOT NULL,
    source_row_number       int      NOT NULL
);
COMMENT ON TABLE silver.lot IS 'Physical seed lot (R-LOT: trimmed, original case). One lot -> many POs. source_* = first row that introduced it';

CREATE TABLE silver.process_order (
    process_order_id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    po_number          text     NOT NULL UNIQUE,
    po_type            text     NOT NULL CHECK (po_type IN ('PRODUCTION', 'REWORK', 'REPAIR', 'SEED_HEALTH', 'OTHER')),
    material_id        bigint   REFERENCES silver.material,
    species_id         bigint   REFERENCES silver.species,
    lot_id             bigint   REFERENCES silver.lot,
    work_center_id     bigint   REFERENCES silver.work_center,
    is_in_sap          boolean  NOT NULL,
    sap_status         text,
    planned_output_qty numeric(14,3),
    uom_code           text     CHECK (uom_code IN ('KG', 'KS')),
    sap_finish_date    date,
    priority_rank      smallint,
    sap_notes          text,
    is_notes_truncated boolean  NOT NULL DEFAULT false,
    source_csv         text     NOT NULL,
    source_row_number  int      NOT NULL,
    source_file_sha256 char(64),
    load_id            bigint,
    dq_flags           text[]   NOT NULL DEFAULT '{}'
);
COMMENT ON TABLE silver.process_order IS
  'One row per PO (= the batch). Created from SAP first (authoritative attributes), then components, schedules, logs. Only valid/normalized PO numbers (R-PO); placeholders and lot numbers stay on the fact rows';
COMMENT ON COLUMN silver.process_order.work_center_id IS 'SAP routing work center (Excel SAP data WorkCenter, else components Resource)';

CREATE TABLE silver.process_order_source (
    process_order_source_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    process_order_id        bigint NOT NULL REFERENCES silver.process_order,
    source_role             text   NOT NULL CHECK (source_role IN ('SAP', 'SAP_COPY', 'ROUTING', 'SCHEDULE', 'LOG', 'QA', 'INGEST')),
    source_csv              text   NOT NULL,
    source_row_number       int    NOT NULL,
    UNIQUE (source_csv, source_row_number)
);
COMMENT ON TABLE silver.process_order_source IS 'Every source row that references a PO (lineage and cross-tab coverage)';

CREATE TABLE silver.process_order_work_center (
    process_order_work_center_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    process_order_id             bigint NOT NULL REFERENCES silver.process_order,
    work_center_id               bigint NOT NULL REFERENCES silver.work_center,
    source_csv                   text   NOT NULL,
    source_row_number            int    NOT NULL,
    source_file_sha256           char(64),
    load_id                      bigint,
    UNIQUE (process_order_id, work_center_id)
);
COMMENT ON TABLE silver.process_order_work_center IS 'Routing PO -> work center from components.csv';

CREATE TABLE silver.line_schedule_item (
    line_schedule_item_id  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    process_order_id       bigint   REFERENCES silver.process_order,
    po_number_raw          text     NOT NULL,
    po_number_status       text     NOT NULL,
    is_off_system          boolean  NOT NULL DEFAULT false,
    is_manual_shipment     boolean  NOT NULL DEFAULT false,
    is_duplicate           boolean  NOT NULL DEFAULT false,
    work_center_id         bigint   NOT NULL REFERENCES silver.work_center,
    equipment_raw          text,
    lot_id                 bigint   REFERENCES silver.lot,
    material_id            bigint   REFERENCES silver.material,
    species_code           text,
    status_code            text     CHECK (status_code IN ('NEW', 'RELEASED', 'STAGED', 'ONLINE', 'LAB', 'ON_HOLD', 'COMPLETE')),
    status_note            text,
    run_order              smallint,
    run_order_note         text,
    priority_rank          smallint,
    priority_note          text,
    is_rush                boolean  NOT NULL DEFAULT false,
    scheduled_finish_date  date,
    original_finish_date   date,
    input_kg               numeric(14,3),
    input_qty              numeric(14,3),
    uom_code               text     CHECK (uom_code IN ('KG', 'KS')),
    output_kg              numeric(14,3),
    trait_family_code      text     NOT NULL CHECK (trait_family_code IN ('EXCELIS', 'GMO', 'FRESH', 'NONE')),
    size_fraction_code     text,
    size_fraction_raw      text,
    psl_cleanout_value     numeric,
    comments               text,
    source_csv             text     NOT NULL,
    source_row_number      int      NOT NULL,
    source_file_sha256     char(64),
    load_id                bigint,
    dq_flags               text[]   NOT NULL DEFAULT '{}',
    UNIQUE (source_csv, source_row_number)
);
CREATE UNIQUE INDEX line_schedule_item_po_wc_uq
    ON silver.line_schedule_item (process_order_id, work_center_id)
    WHERE process_order_id IS NOT NULL AND NOT is_duplicate;
COMMENT ON TABLE silver.line_schedule_item IS
  'A PO on one work-center schedule (7 *_schedule.csv tabs). Business key (process_order_id, work_center_id); DQ-06 repeats kept with is_duplicate on the later rows';

CREATE TABLE silver.conditioning_run (
    conditioning_run_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    process_order_id    bigint   REFERENCES silver.process_order,
    po_number_raw       text     NOT NULL,
    po_number_status    text     NOT NULL,
    work_center_id      bigint   REFERENCES silver.work_center,
    equipment_raw       text,
    lot_id              bigint   REFERENCES silver.lot,
    run_date            date     NOT NULL,
    operator_name       text,
    species_code        text,
    variety_code        text,
    size_fraction_code  text,
    size_fraction_raw   text,
    input_kg            numeric(14,3),
    output_kg           numeric(14,3),
    loss_kg             numeric(14,3),
    prep_h              numeric(6,2),
    run_h               numeric(6,2),
    cleandown_h         numeric(6,2),
    defect_comments     text,
    source_csv          text     NOT NULL,
    source_row_number   int      NOT NULL,
    source_file_sha256  char(64),
    load_id             bigint,
    dq_flags            text[]   NOT NULL DEFAULT '{}',
    UNIQUE (source_csv, source_row_number)
);
COMMENT ON TABLE silver.conditioning_run IS 'One logged conditioning run (LSV + SSV logs). No natural key: identity = lineage';
COMMENT ON COLUMN silver.conditioning_run.operator_name IS 'Personal data (DQ-19): pseudonymize before any shared or production use';

CREATE TABLE silver.quality_test (
    quality_test_id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    process_order_id     bigint   REFERENCES silver.process_order,
    po_number_raw        text     NOT NULL,
    po_number_status     text     NOT NULL,
    lot_id               bigint   REFERENCES silver.lot,
    work_center_id       bigint   REFERENCES silver.work_center,
    equipment_raw        text,
    output_batch_number  bigint,
    test_date            date     NOT NULL,
    species_code         text,
    variety_code         text,
    size_fraction_code   text,
    size_fraction_raw    text,
    batch_kg             numeric(14,3),
    result_code          text     NOT NULL CHECK (result_code IN ('PASS', 'FAIL', 'PENDING')),
    fail_reason_code     text     CHECK (fail_reason_code IN
                           ('COB', 'DENT', 'DISCOLORED', 'OFF_TYPE', 'BROKEN', 'SMUT', 'WEED', 'INERT', 'TARE')),
    raw_germ_fraction    numeric(5,4),
    ready_germ_fraction  numeric(5,4),
    raw_vigor_fraction   numeric(5,4),
    ready_vigor_fraction numeric(5,4),
    comments             text,
    ingest_event_id      bigint   REFERENCES raw.ingest_event,
    source_csv           text     NOT NULL,
    source_row_number    int      NOT NULL,
    source_file_sha256   char(64),
    load_id              bigint,
    dq_flags             text[]   NOT NULL DEFAULT '{}',
    UNIQUE (source_csv, source_row_number)
);
CREATE INDEX quality_test_output_batch_ix ON silver.quality_test (output_batch_number);
CREATE INDEX quality_test_po_ix ON silver.quality_test (process_order_id);
COMMENT ON TABLE silver.quality_test IS 'One output-batch QA test (LSV Pass_Fail Log + ingested rows). output_batch_number is indexed, not unique';

CREATE TABLE silver.process_order_change (
    process_order_change_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    process_order_id        bigint   NOT NULL REFERENCES silver.process_order,
    ingest_event_id         bigint   NOT NULL UNIQUE REFERENCES raw.ingest_event,
    priority_rank           smallint,
    scheduled_finish_date   date,
    is_rush                 boolean  NOT NULL,
    changed_at              timestamptz NOT NULL
);
COMMENT ON TABLE silver.process_order_change IS 'SAP-style delta on an existing PO (priority / scheduled finish) from raw.ingest_event. Latest change wins in gold.v_open_queue';

CREATE TABLE silver.customer_order (
    customer_order_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_number      text    NOT NULL UNIQUE,
    customer_name     text    NOT NULL,
    material_id       bigint  NOT NULL REFERENCES silver.material,
    qty               numeric(14,3) NOT NULL,
    uom_code          text    NOT NULL CHECK (uom_code IN ('KG', 'KS')),
    need_by_date      date    NOT NULL,
    priority_tier     text    NOT NULL CHECK (priority_tier IN ('STANDARD', 'KEY', 'RUSH')),
    is_synthetic      boolean NOT NULL DEFAULT true
);
COMMENT ON TABLE silver.customer_order IS 'Open customer orders — NOT in the Pasco extracts: synthetic seed (is_synthetic = true), see seeds/silver_customer_order.sql';

CREATE TABLE silver.order_allocation (
    order_allocation_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_order_id   bigint NOT NULL REFERENCES silver.customer_order,
    process_order_id    bigint NOT NULL REFERENCES silver.process_order,
    allocated_qty       numeric(14,3) NOT NULL,
    UNIQUE (customer_order_id, process_order_id)
);
COMMENT ON TABLE silver.order_allocation IS 'Customer order <-> PO coverage (synthetic, with the orders)';
