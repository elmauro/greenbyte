-- Gold model v4 tables (etl/gold-model/gold-data-model.md §3). Replaces the v3 definitions of reason_code,
-- plan_event, schedule_plan, schedule_entry, entry_reason and plan_decision, and adds policy, source_note,
-- semantic_fact and entry_reason_fact. On a live database upgraded in place (etl/build_model.py --upgrade-gold-v4)
-- the v3 tables are kept as gold.<name>_legacy; on a clean build they never exist.
-- Plans are immutable: every replan inserts plan_version + 1 (diff = previous_position vs position).

-- Reason kinds. param_keys = params every row of the code must carry (checked by gold.add_reason, G-21).
CREATE TABLE gold.reason_code (
    reason_code_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reason_code    text   NOT NULL UNIQUE,
    category       text   NOT NULL CHECK (category IN ('HARD', 'URGENCY', 'PRIORITY', 'CHANGEOVER', 'DEMAND', 'EVENT', 'STATE')),
    description    text   NOT NULL,
    template       text   NOT NULL,
    param_keys     text[] NOT NULL DEFAULT '{}'
);
COMMENT ON TABLE gold.reason_code IS
  'Machine reason codes. template {placeholders} are filled from entry_reason.params (fallback text; the Agent API writes the real prose). v4: param_keys contract';

-- Soft ranking rules per line, versioned (D-02, D-06). Hard rules stay in gold.replan: the running batch is first,
-- held / failed / not-ready batches leave the runnable list.
CREATE TABLE gold.policy (
    policy_id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    work_center_id      bigint REFERENCES silver.work_center,
    policy_version      int    NOT NULL,
    status              text   NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'RETIRED')),
    ranking_mode        text   NOT NULL CHECK (ranking_mode IN ('LEXICOGRAPHIC', 'WEIGHTED')),
    criteria            jsonb  NOT NULL CHECK (jsonb_typeof(criteria) = 'array' AND jsonb_array_length(criteria) > 0),
    fact_min_confidence numeric(4,3) NOT NULL DEFAULT 0.700 CHECK (fact_min_confidence BETWEEN 0 AND 1),
    hours_per_day       numeric(4,1) NOT NULL DEFAULT 24.0 CHECK (hours_per_day > 0 AND hours_per_day <= 24),
    notes               text,
    created_by          text   NOT NULL,
    created_at          timestamptz NOT NULL DEFAULT clock_timestamp(),
    UNIQUE NULLS NOT DISTINCT (work_center_id, policy_version)
);
CREATE UNIQUE INDEX policy_one_active_uq ON gold.policy (coalesce(work_center_id, 0)) WHERE status = 'ACTIVE';
COMMENT ON TABLE gold.policy IS
  'Versioned soft ranking rules per work center (NULL = default for every line). criteria = ordered [{code, basis, weight?}]; LEXICOGRAPHIC: earlier wins. Seeded from seeds/gold_policy.sql';
COMMENT ON COLUMN gold.policy.hours_per_day IS 'Plant calendar assumption (SQ-10). Recorded, not yet applied: the replan clock is continuous';

-- One non-empty free-text cell in one silver row (G-02, G-03). Rebuilt from silver; the business key is the stable lineage.
CREATE TABLE gold.source_note (
    source_note_id        bigint  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source_csv            text    NOT NULL,
    source_row_number     int     NOT NULL,
    source_column         text    NOT NULL CHECK (source_column IN
                            ('run_order_note', 'priority_note', 'status_note', 'comments', 'sap_notes', 'defect_comments')),
    note_text             text    NOT NULL,
    note_hash             char(64) NOT NULL,
    process_order_id      bigint  REFERENCES silver.process_order,
    line_schedule_item_id bigint  REFERENCES silver.line_schedule_item,
    quality_test_id       bigint  REFERENCES silver.quality_test,
    conditioning_run_id   bigint  REFERENCES silver.conditioning_run,
    work_center_id        bigint  REFERENCES silver.work_center,
    UNIQUE (source_csv, source_row_number, source_column),
    CHECK (num_nonnulls(line_schedule_item_id, quality_test_id, conditioning_run_id) <= 1)
);
CREATE INDEX source_note_hash_ix ON gold.source_note (note_hash);
CREATE INDEX source_note_lsi_ix ON gold.source_note (line_schedule_item_id);
COMMENT ON TABLE gold.source_note IS
  'One free-text cell (occurrence) in silver: schedule run-order / priority / status notes and comments, SAP notes, QA comments, log defect comments';

-- One typed fact from one reading applied to one note occurrence. Upserted (never deleted inside a build) so the
-- entry_reason_fact links of earlier plans stay valid when a reading or a review arrives at runtime.
CREATE TABLE gold.semantic_fact (
    semantic_fact_id bigint   GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source_note_id   bigint   NOT NULL REFERENCES gold.source_note,
    note_reading_id  bigint   NOT NULL REFERENCES raw.note_reading,
    fact_seq         smallint NOT NULL,
    process_order_id bigint   REFERENCES silver.process_order,
    work_center_id   bigint   REFERENCES silver.work_center,
    fact_type        text     NOT NULL CHECK (fact_type IN ('NOT_READY', 'HOLD', 'RELEASE', 'RUSH', 'DEADLINE', 'INFO')),
    fact_value       jsonb    NOT NULL DEFAULT '{}',
    applies_to       text     NOT NULL DEFAULT 'UNKNOWN' CHECK (applies_to IN ('PO', 'LOT', 'EQUIPMENT', 'LINE', 'UNKNOWN')),
    confidence       numeric(4,3) CHECK (confidence BETWEEN 0 AND 1),
    reader           text     NOT NULL,
    model_id         text     NOT NULL,
    prompt_version   text     NOT NULL,
    status           text     NOT NULL CHECK (status IN ('AUTO', 'NEEDS_CONFIRMATION', 'CONFIRMED', 'REJECTED')),
    reviewed_by      text,
    reviewed_at      timestamptz,
    UNIQUE (source_note_id, note_reading_id, fact_seq)
);
CREATE INDEX semantic_fact_po_status_ix ON gold.semantic_fact (process_order_id, status);
COMMENT ON TABLE gold.semantic_fact IS
  'Typed meaning of a note occurrence (source_note x raw.note_reading facts[]). status derived: latest raw.note_review, else AUTO when confidence >= policy.fact_min_confidence, else NEEDS_CONFIRMATION';

CREATE TABLE gold.plan_event (
    plan_event_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    work_center_id   bigint NOT NULL REFERENCES silver.work_center,
    event_type       text   NOT NULL CHECK (event_type IN ('rush', 'qa_fail', 'qa_pass', 'queue_refresh', 'manual_adjust', 'note_review')),
    source           text   NOT NULL CHECK (source IN ('sap_priority_change', 'pass_fail_log', 'etl_refresh', 'ui_manual')),
    process_order_id bigint REFERENCES silver.process_order,
    ingest_event_id  bigint REFERENCES raw.ingest_event,
    payload          jsonb  NOT NULL DEFAULT '{}',
    created_at       timestamptz NOT NULL DEFAULT clock_timestamp(),
    created_by       text   NOT NULL DEFAULT current_user
);
CREATE UNIQUE INDEX plan_event_ingest_event_uq ON gold.plan_event (ingest_event_id) WHERE ingest_event_id IS NOT NULL;
COMMENT ON TABLE gold.plan_event IS
  'What triggered a replan (event_type values match the BFF PlantEventType where they overlap). v4: note_review, one plan_event per ingest event';

CREATE TABLE gold.schedule_plan (
    schedule_plan_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    work_center_id   bigint NOT NULL REFERENCES silver.work_center,
    plan_version     int    NOT NULL,
    parent_plan_id   bigint REFERENCES gold.schedule_plan,
    status           text   NOT NULL CHECK (status IN ('PROPOSED', 'ACCEPTED', 'SUPERSEDED')),
    plan_event_id    bigint REFERENCES gold.plan_event,
    policy_id        bigint REFERENCES gold.policy,
    horizon_start    timestamptz NOT NULL,
    created_at       timestamptz NOT NULL DEFAULT clock_timestamp(),
    created_by       text   NOT NULL,
    UNIQUE (work_center_id, plan_version)
);
COMMENT ON TABLE gold.schedule_plan IS
  'Versioned, immutable plan per work center. v1 = baseline (no event). status is the lifecycle of the latest plan only; acceptance history is gold.v_plan_status (D-04). v4: policy_id';

CREATE TABLE gold.schedule_entry (
    schedule_entry_id     bigint  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    schedule_plan_id      bigint  NOT NULL REFERENCES gold.schedule_plan ON DELETE CASCADE,
    position              int     NOT NULL,
    process_order_id      bigint  NOT NULL REFERENCES silver.process_order,
    line_schedule_item_id bigint  NOT NULL REFERENCES silver.line_schedule_item,
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
COMMENT ON TABLE gold.schedule_entry IS
  'One PO at one position in a plan. HOLD entries sit after the planned ones and have no planned times. v4: line_schedule_item_id NOT NULL';

CREATE TABLE gold.entry_reason (
    entry_reason_id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    schedule_entry_id bigint   NOT NULL REFERENCES gold.schedule_entry ON DELETE CASCADE,
    seq               smallint NOT NULL,
    reason_code_id    bigint   NOT NULL REFERENCES gold.reason_code,
    params            jsonb    NOT NULL DEFAULT '{}',
    UNIQUE (schedule_entry_id, seq)
);
COMMENT ON TABLE gold.entry_reason IS
  'Why an entry sits where it does: reason code + parameters citing stable ids (PO, lot, quality_test_id, order_number, semantic_fact_id). seq 1 = primary reason';

CREATE TABLE gold.entry_reason_fact (
    entry_reason_id  bigint NOT NULL REFERENCES gold.entry_reason ON DELETE CASCADE,
    semantic_fact_id bigint NOT NULL REFERENCES gold.semantic_fact,
    PRIMARY KEY (entry_reason_id, semantic_fact_id)
);
COMMENT ON TABLE gold.entry_reason_fact IS 'Reason on a queue row -> the semantic facts (notes) that justified it';

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
