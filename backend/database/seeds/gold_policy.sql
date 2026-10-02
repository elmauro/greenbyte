-- Ranking policy v1 (D-02, D-06): LEXICOGRAPHIC, the same keys and order as heuristic-v1, so plans are unchanged
-- by moving the rules into data. One ACTIVE default (work_center_id NULL) applies to every line; add a per-line row
-- with a higher policy_version and status ACTIVE to override a line. Every criterion is our assumption until the
-- plant confirms it (SQ-02, SQ-04, SQ-05, SQ-11).
--   ONLINE_FIRST   the running batch stays first (also enforced in code: it is a hard rule)
--   RUSH           rush batches next (SAP priority raise, RUSH text in priority, trusted RUSH note)
--   URGENT_DUE     batches that would be late if started now, earliest due first
--   PRIORITY       scheduler / SAP priority rank, 1 = highest
--   SAME_VARIETY   same species and variety as the previous planned batch (smallest changeover)
--   SAME_SPECIES   same species as the previous planned batch
--   DUE_DATE       earliest due date
--   RUN_ORDER      the scheduler's run order on the sheet
-- Idempotent (ON CONFLICT DO NOTHING): the in-place upgrades re-run this file.
INSERT INTO gold.policy
    (work_center_id, policy_version, status, ranking_mode, criteria, fact_min_confidence, hours_per_day, notes, created_by,
     engine)
VALUES (NULL, 1, 'ACTIVE', 'LEXICOGRAPHIC',
        '[{"code": "ONLINE_FIRST", "basis": "ASSUMPTION"},
          {"code": "RUSH",         "basis": "ASSUMPTION"},
          {"code": "URGENT_DUE",   "basis": "ASSUMPTION"},
          {"code": "PRIORITY",     "basis": "ASSUMPTION"},
          {"code": "SAME_VARIETY", "basis": "ASSUMPTION"},
          {"code": "SAME_SPECIES", "basis": "ASSUMPTION"},
          {"code": "DUE_DATE",     "basis": "ASSUMPTION"},
          {"code": "RUN_ORDER",    "basis": "ASSUMPTION"}]',
        0.700, 24.0,
        'policy-v1 = heuristic-v1 order. hours_per_day 24 until the shift calendar is known (SQ-10)',
        'seeds/gold_policy.sql', 'HEURISTIC')
ON CONFLICT (work_center_id, policy_version) DO NOTHING;

-- Policy v2 (planner v2, Q2): the rules the semantic planner applies. Gold stores them and plans cite them;
-- gold.replan does not sort by them (engine PLANNER). basis stays ASSUMPTION until Syngenta answers SQ-02 / SQ-04
-- (the planner team sent them as CONFIRMED, Q9b).
--   PRIORITY       scheduler / SAP priority rank, 1 = highest
--   SPECIES_GROUP  keep batches of the same species (and variety) together (smallest changeover)
--   SAP_FINISH     earliest SAP scheduled finish date first (entry due_date_basis SAP_FINISH)
INSERT INTO gold.policy
    (work_center_id, policy_version, status, ranking_mode, criteria, fact_min_confidence, hours_per_day, notes, created_by,
     engine)
VALUES (NULL, 2, 'ACTIVE', 'LEXICOGRAPHIC',
        '[{"code": "PRIORITY",      "basis": "ASSUMPTION"},
          {"code": "SPECIES_GROUP", "basis": "ASSUMPTION"},
          {"code": "SAP_FINISH",    "basis": "ASSUMPTION"}]',
        0.700, 24.0,
        'planner-v2 rules (semantic planner, Agent API). Sent as CONFIRMED by the planner team; stored as ASSUMPTION pending SQ-02 / SQ-04. Calendar: gold.work_center_calendar (hours_per_day not used by the planner)',
        'seeds/gold_policy.sql', 'PLANNER')
ON CONFLICT (work_center_id, policy_version) DO NOTHING;

-- Active policy for a work center and engine: the line's own ACTIVE row, else the default.
-- planner v2: engine argument (default HEURISTIC, so every v4 caller keeps its behaviour).
DROP FUNCTION IF EXISTS gold.active_policy(bigint);
CREATE OR REPLACE FUNCTION gold.active_policy(p_work_center_id bigint, p_engine text DEFAULT 'HEURISTIC')
RETURNS gold.policy
LANGUAGE sql STABLE AS $$
    SELECT p.* FROM gold.policy p
    WHERE p.status = 'ACTIVE' AND p.engine = p_engine
      AND (p.work_center_id = p_work_center_id OR p.work_center_id IS NULL)
    ORDER BY (p.work_center_id IS NULL), p.policy_version DESC
    LIMIT 1
$$;
