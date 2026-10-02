-- Gold planner v2 (etl/gold-model/gold-data-model.md §7, decisions Q1–Q9 in WORKING-PLAN.md §5).
-- The semantic planner (Agent API) owns order, times, calendar, cleanouts, downtime, line swaps and repair ideas;
-- gold stores its result and keeps the model typed:
--   * additive columns on existing tables (no existing column or row changes): plan_event.parent_plan_event_id
--     + event_type 'planner_run', policy.engine, schedule_entry.due_date_basis
--   * one new table per new grain (plan_override, line_downtime, repair_proposal) with the JSON element as sent
--   * typed planner reference data (work_center_calendar, sequence_rule, repair_route) on gold reference domains
--     (fail_reason, trait_family) that extend the silver domains without touching silver.
-- Used by the clean build (after 007) and by the in-place upgrade (etl/build_model.py --upgrade-gold-planner-v2).

DO $$
BEGIN
    IF to_regclass('gold.plan_override') IS NOT NULL THEN
        RAISE EXCEPTION 'gold planner v2 already applied (gold.plan_override exists)';
    END IF;
END
$$;

-- ---------------------------------------------------------------- additive changes on existing tables

-- Q1: a planner plan has its own event (event -> plan stays 1:1); it may answer an earlier event.
ALTER TABLE gold.plan_event
    ADD COLUMN parent_plan_event_id bigint REFERENCES gold.plan_event ON DELETE SET NULL;
DO $$
DECLARE
    r record;
BEGIN
    -- the CHECK name differs between a clean build and a live DB upgraded from v3 (…_check vs …_check1)
    FOR r IN SELECT conname FROM pg_constraint
             WHERE conrelid = 'gold.plan_event'::regclass AND contype = 'c'
               AND pg_get_constraintdef(oid) LIKE '%event_type%' LOOP
        EXECUTE format('ALTER TABLE gold.plan_event DROP CONSTRAINT %I', r.conname);
    END LOOP;
END
$$;
ALTER TABLE gold.plan_event ADD CONSTRAINT plan_event_event_type_ck CHECK (event_type IN
    ('rush', 'qa_fail', 'qa_pass', 'queue_refresh', 'manual_adjust', 'note_review', 'planner_run'));
CREATE INDEX plan_event_parent_ix ON gold.plan_event (parent_plan_event_id);
COMMENT ON COLUMN gold.plan_event.parent_plan_event_id IS
  'planner v2 (Q1): the event a planner_run answers (e.g. the rush or QA fail it re-plans). NULL for ingest events';
COMMENT ON TABLE gold.plan_event IS
  'What triggered a replan (event_type values match the BFF PlantEventType where they overlap). v4: note_review, one plan_event per ingest event. planner v2: planner_run (payload = planner JSON, stored as sent)';

-- Q2: policy versions per engine; v1 keeps driving the heuristic, v2 is the planner's.
ALTER TABLE gold.policy
    ADD COLUMN engine text NOT NULL DEFAULT 'HEURISTIC' CHECK (engine IN ('HEURISTIC', 'PLANNER'));
DROP INDEX gold.policy_one_active_uq;
CREATE UNIQUE INDEX policy_one_active_uq ON gold.policy (coalesce(work_center_id, 0), engine) WHERE status = 'ACTIVE';
COMMENT ON COLUMN gold.policy.engine IS
  'planner v2 (Q2): HEURISTIC = rules gold.replan sorts by (policy_order_by); PLANNER = rules the semantic planner applies (not interpreted by gold). One ACTIVE per line and engine';

-- Q6: which commitment due_date / slack / at risk are measured against.
ALTER TABLE gold.schedule_entry
    ADD COLUMN due_date_basis text CHECK (due_date_basis IN ('NEED_BY', 'SCHEDULE_FINISH', 'SAP_FINISH'));
COMMENT ON COLUMN gold.schedule_entry.due_date_basis IS
  'planner v2 (Q6): NEED_BY / SCHEDULE_FINISH (heuristic, = v_open_queue.due_date_basis) or SAP_FINISH (planner default)';

-- ---------------------------------------------------------------- gold reference domains (Q5b)

CREATE TABLE gold.fail_reason (
    fail_reason_code text PRIMARY KEY,
    description      text NOT NULL,
    origin           text NOT NULL CHECK (origin IN ('SILVER', 'PLANNER'))
);
COMMENT ON TABLE gold.fail_reason IS
  'QA fail reasons usable by gold: the silver domain (origin SILVER) + codes the planner uses that the Pasco extract does not have (origin PLANNER, to confirm). Silver is not changed';

CREATE TABLE gold.trait_family (
    trait_family_code text PRIMARY KEY,
    description       text NOT NULL,
    origin            text NOT NULL CHECK (origin IN ('SILVER', 'PLANNER'))
);
COMMENT ON TABLE gold.trait_family IS
  'Trait families usable by gold: the silver domain (EXCELIS, GMO, FRESH, NONE) + planner-only values (CERTIFIED_NON_GMO, to confirm)';

-- ---------------------------------------------------------------- planner reference data (Q5a)

CREATE TABLE gold.work_center_calendar (
    work_center_calendar_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    work_center_id          bigint   NOT NULL REFERENCES silver.work_center,
    iso_weekday             smallint NOT NULL CHECK (iso_weekday BETWEEN 1 AND 7),
    start_time              time     NOT NULL,
    end_time                text     NOT NULL CHECK (end_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$|^24:00$'),
    season                  text     NOT NULL DEFAULT 'HARVEST',
    UNIQUE (work_center_id, iso_weekday, season)
);
COMMENT ON TABLE gold.work_center_calendar IS
  'Working window of a line per ISO weekday (1 = Monday) and season. end_time text so 24:00 is allowed. Read by the planner (planner_rules.calendar); the heuristic clock stays continuous';

CREATE TABLE gold.sequence_rule (
    sequence_rule_id  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    rule_code         text NOT NULL UNIQUE,
    rule_type         text NOT NULL CHECK (rule_type IN ('CLEANOUT', 'FORBIDDEN')),
    transition_code   text CHECK (transition_code IN ('SAME_VARIETY', 'SAME_SPECIES', 'SPECIES_CHANGE', 'TRAIT_CHANGE')),
    from_trait_family_code   text REFERENCES gold.trait_family,
    to_trait_family_code     text REFERENCES gold.trait_family,
    work_center_id    bigint REFERENCES silver.work_center,
    basis             text NOT NULL DEFAULT 'ASSUMPTION' CHECK (basis IN ('ASSUMPTION', 'CONFIRMED')),
    notes             text,
    CHECK (num_nonnulls(transition_code, from_trait_family_code, to_trait_family_code) >= 1),
    CHECK (rule_type <> 'FORBIDDEN' OR (from_trait_family_code IS NOT NULL AND to_trait_family_code IS NOT NULL))
);
COMMENT ON TABLE gold.sequence_rule IS
  'Sequencing rules between consecutive batches: CLEANOUT (full cleanout needed; length = the line SPECIES_CHANGE hours in changeover_rule) or FORBIDDEN (trait A may not run right before trait B). work_center_id NULL = every line';

CREATE TABLE gold.repair_route (
    fail_reason_code     text   PRIMARY KEY REFERENCES gold.fail_reason,
    route_work_center_id bigint NOT NULL REFERENCES silver.work_center,
    basis                text   NOT NULL DEFAULT 'ASSUMPTION' CHECK (basis IN ('ASSUMPTION', 'CONFIRMED')),
    notes                text
);
COMMENT ON TABLE gold.repair_route IS
  'Where a batch that failed QA for this reason is reworked (e.g. DENT -> LSVCLSRT colorsort). Unmapped fail reasons are shown as unknown by the planner';

-- ---------------------------------------------------------------- planner output: one table per new grain

-- Q3: one override instruction on one PO. Types share the grain; type-specific columns are checked per type.
CREATE TABLE gold.plan_override (
    plan_override_id    bigint  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    plan_event_id       bigint  NOT NULL REFERENCES gold.plan_event ON DELETE CASCADE,
    element_seq         int     NOT NULL,
    process_order_id    bigint  NOT NULL REFERENCES silver.process_order,
    override_type       text    NOT NULL CHECK (override_type IN ('LINE_SWAP', 'PIN_POSITION', 'FORCE_HOLD')),
    from_work_center_id bigint  REFERENCES silver.work_center,
    to_work_center_id   bigint  REFERENCES silver.work_center,
    pinned_position     int     CHECK (pinned_position >= 1),
    hold_reason         text,
    is_active           boolean NOT NULL DEFAULT true,
    override_json       jsonb   NOT NULL,
    created_at          timestamptz NOT NULL DEFAULT clock_timestamp(),
    UNIQUE (plan_event_id, element_seq),
    CHECK (override_type <> 'LINE_SWAP' OR (to_work_center_id IS NOT NULL
                                           AND to_work_center_id IS DISTINCT FROM from_work_center_id)),
    CHECK (override_type <> 'PIN_POSITION' OR pinned_position IS NOT NULL),
    CHECK (override_type <> 'FORCE_HOLD' OR hold_reason IS NOT NULL)
);
CREATE INDEX plan_override_po_ix ON gold.plan_override (process_order_id, override_type);
COMMENT ON TABLE gold.plan_override IS
  'One override instruction on one PO from a planner_run payload (overrides[i]); override_json = the element as sent. The latest row per (PO, type) wins (gold.v_active_override). The heuristic respects active ones: LINE_SWAP away = skipped, FORCE_HOLD = HOLD, PIN_POSITION = placed at that position';
COMMENT ON COLUMN gold.plan_override.from_work_center_id IS 'Line of the PO''s open schedule row when the override was stored (lineage)';

-- Q4a: one downtime window on one line (stored for the planner / UI; the heuristic clock does not use it).
CREATE TABLE gold.line_downtime (
    line_downtime_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    plan_event_id    bigint NOT NULL REFERENCES gold.plan_event ON DELETE CASCADE,
    element_seq      int    NOT NULL,
    work_center_id   bigint NOT NULL REFERENCES silver.work_center,
    starts_at        timestamptz NOT NULL,
    ends_at          timestamptz NOT NULL,
    reason           text,
    downtime_json    jsonb  NOT NULL,
    UNIQUE (plan_event_id, element_seq),
    CHECK (ends_at > starts_at)
);
CREATE INDEX line_downtime_wc_ix ON gold.line_downtime (work_center_id, starts_at);
COMMENT ON TABLE gold.line_downtime IS 'One downtime window on one line from a planner_run payload (downtime[i]); downtime_json = the element as sent';

-- Q4b: one proposed repair route for one PO (usually after a QA fail). No new PO is created (SQ-09).
CREATE TABLE gold.repair_proposal (
    repair_proposal_id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    plan_event_id        bigint NOT NULL REFERENCES gold.plan_event ON DELETE CASCADE,
    element_seq          int    NOT NULL,
    parent_process_order_id bigint NOT NULL REFERENCES silver.process_order,
    quality_test_id      bigint REFERENCES silver.quality_test,
    fail_reason_code     text   REFERENCES gold.fail_reason,
    route_work_center_id bigint NOT NULL REFERENCES silver.work_center,
    status               text   NOT NULL DEFAULT 'PROPOSED' CHECK (status IN ('PROPOSED', 'ACCEPTED', 'REJECTED')),
    proposal_json        jsonb  NOT NULL,
    UNIQUE (plan_event_id, element_seq)
);
CREATE INDEX repair_proposal_po_ix ON gold.repair_proposal (parent_process_order_id);
COMMENT ON TABLE gold.repair_proposal IS
  'One proposed repair route for one PO from a planner_run payload (proposals[i]); quality_test_id = the FAIL it answers (given, else the latest FAIL of the PO); proposal_json = the element as sent';
