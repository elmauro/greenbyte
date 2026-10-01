-- Changeover rules DERIVED from the logs (gold.v_changeover_observed): median prep + cleandown by transition,
-- for in-scope work centers with at least 5 observations. TRAIT_CHANGE (Excelis/GMO/Fresh) awaits SME input (model Q-1).
INSERT INTO gold.changeover_rule
    (work_center_id, transition_code, prep_h, cleandown_h, hours, rule_source, derived_n)
SELECT o.work_center_id, o.transition_code, o.median_prep_h, o.median_cleandown_h, o.median_changeover_h, 'DERIVED', o.n
FROM gold.v_changeover_observed o
JOIN silver.work_center wc USING (work_center_id)
WHERE wc.is_in_scope AND o.n >= 5
ORDER BY o.work_center_code, o.transition_code;
