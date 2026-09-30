-- Gold tables: derived reference used by the replan (config, reason codes, changeover rules) and the
-- runtime decision trail written by the Data API (events, versioned plans, entries, reasons, decisions).
-- Plans are immutable: every replan inserts plan_version + 1 (diff = previous_position vs position).

CREATE TABLE gold.config (
    config_key  text PRIMARY KEY,
    value       text NOT NULL,
    description text
);
COMMENT ON TABLE gold.config IS 'Demo clock and heuristic parameters (seeds/gold_config.sql)';

CREATE TABLE gold.reason_code (
    reason_code_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reason_code    text NOT NULL UNIQUE,
    category       text NOT NULL CHECK (category IN ('HARD', 'URGENCY', 'PRIORITY', 'CHANGEOVER', 'DEMAND', 'EVENT', 'STATE')),
    description    text NOT NULL,
    template       text NOT NULL
);
COMMENT ON TABLE gold.reason_code IS 'Machine reason codes. template {placeholders} are filled from entry_reason.params (fallback text; the Agent API writes the real prose)';

CREATE TABLE gold.changeover_rule (
    changeover_rule_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    work_center_id     bigint NOT NULL REFERENCES silver.work_center,
    transition_code    text   NOT NULL CHECK (transition_code IN ('SAME_VARIETY', 'SAME_SPECIES', 'SPECIES_CHANGE', 'TRAIT_CHANGE')),
    prep_h             numeric(6,2) NOT NULL,
    cleandown_h        numeric(6,2) NOT NULL,
    hours              numeric(6,2) NOT NULL,
    rule_source        text   NOT NULL CHECK (rule_source IN ('DERIVED', 'SME')),
    derived_n          int,
    UNIQUE (work_center_id, transition_code)
);
COMMENT ON TABLE gold.changeover_rule IS 'Changeover cost by transition vs the previous run (median prep + cleandown from gold.v_changeover_observed). SME rows override (Q model-1)';

CREATE TABLE gold.plan_event (
    plan_event_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    work_center_id   bigint NOT NULL REFERENCES silver.work_center,
    event_type       text   NOT NULL CHECK (event_type IN ('rush', 'qa_fail', 'qa_pass', 'queue_refresh', 'manual_adjust')),
    source           text   NOT NULL CHECK (source IN ('sap_priority_change', 'pass_fail_log', 'etl_refresh', 'ui_manual')),
    process_order_id bigint REFERENCES silver.process_order,
    ingest_event_id  bigint REFERENCES raw.ingest_event,
    payload          jsonb  NOT NULL DEFAULT '{}',
    created_at       timestamptz NOT NULL DEFAULT clock_timestamp(),
    created_by       text   NOT NULL DEFAULT current_user
);
COMMENT ON TABLE gold.plan_event IS 'What triggered a replan (event_type values match the BFF PlantEventType where they overlap)';

CREATE TABLE gold.schedule_plan (
    schedule_plan_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    work_center_id   bigint NOT NULL REFERENCES silver.work_center,
    plan_version     int    NOT NULL,
    parent_plan_id   bigint REFERENCES gold.schedule_plan,
    status           text   NOT NULL CHECK (status IN ('PROPOSED', 'ACCEPTED', 'SUPERSEDED')),
    plan_event_id    bigint REFERENCES gold.plan_event,
    horizon_start    timestamptz NOT NULL,
    created_at       timestamptz NOT NULL DEFAULT clock_timestamp(),
    created_by       text   NOT NULL,
    UNIQUE (work_center_id, plan_version)
);
COMMENT ON TABLE gold.schedule_plan IS 'Versioned, immutable plan per work center. v1 = baseline (no event)';

CREATE TABLE gold.schedule_entry (
    schedule_entry_id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    schedule_plan_id      bigint  NOT NULL REFERENCES gold.schedule_plan ON DELETE CASCADE,
    position              int     NOT NULL,
    process_order_id      bigint  NOT NULL REFERENCES silver.process_order,
    line_schedule_item_id bigint  REFERENCES silver.line_schedule_item,
    entry_status          text    NOT NULL CHECK (entry_status IN ('PLANNED', 'HOLD')),
    planned_start_at      timestamptz,
    planned_end_at        timestamptz,
    est_run_h             numeric(8,2),
    est_changeover_h      numeric(6,2),
    due_date              date,
    slack_days            numeric(8,2),
    is_at_risk            boolean NOT NULL DEFAULT false,
    previous_position     int,
    UNIQUE (schedule_plan_id, position),
    UNIQUE (schedule_plan_id, process_order_id)
);
COMMENT ON TABLE gold.schedule_entry IS 'One position in a plan. HOLD entries sit after the planned ones and have no planned times';

CREATE TABLE gold.entry_reason (
    entry_reason_id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    schedule_entry_id bigint   NOT NULL REFERENCES gold.schedule_entry ON DELETE CASCADE,
    seq               smallint NOT NULL,
    reason_code_id    bigint   NOT NULL REFERENCES gold.reason_code,
    params            jsonb    NOT NULL DEFAULT '{}',
    UNIQUE (schedule_entry_id, seq)
);
COMMENT ON TABLE gold.entry_reason IS 'Why an entry sits where it does: reason code + parameters citing stable ids (PO, lot, quality_test_id, order_number). seq 1 = primary reason';

CREATE TABLE gold.plan_decision (
    plan_decision_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    schedule_plan_id bigint NOT NULL REFERENCES gold.schedule_plan ON DELETE CASCADE,
    decision         text   NOT NULL CHECK (decision IN ('ACCEPT', 'OVERRIDE', 'REJECT')),
    override_detail  jsonb,
    decided_by       text   NOT NULL,
    decided_at       timestamptz NOT NULL DEFAULT clock_timestamp(),
    comment          text
);
COMMENT ON TABLE gold.plan_decision IS 'Human decision on a plan (audit). No write-back to SAP/ERP';
