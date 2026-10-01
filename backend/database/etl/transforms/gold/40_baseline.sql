-- Baseline plan v1 ("calm morning") for every line the BFF serves, then replay of the ingest log.
SELECT gold.replan(work_center_code) FROM silver.work_center WHERE demo_line_id IS NOT NULL ORDER BY work_center_code;
SELECT gold.replay_ingest_events();
