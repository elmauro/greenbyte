-- Gold reference tables that did not change in gold model v4: config (demo clock) and changeover rules.
-- reason_code, the plan runtime tables (events, plans, entries, reasons, decisions) and the v4 tables
-- (policy, source_note, semantic_fact, entry_reason_fact) are in 007_gold_v4_runtime.sql.

CREATE TABLE gold.config (
    config_key  text PRIMARY KEY,
    value       text NOT NULL,
    description text
);
COMMENT ON TABLE gold.config IS 'Demo clock and heuristic parameters (seeds/gold_config.sql)';

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
