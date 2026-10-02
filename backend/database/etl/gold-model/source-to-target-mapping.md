# UC1 source-to-target mapping — silver → gold

**Owner:** Data API (Camilo) · **Date:** 2026-10-01 · **Status:** BUILT (v4.0, 2026-10-01; deferred items marked)
**Scope:** every gold table and view of the target model in [gold-data-model.md](./gold-data-model.md), column by column, from `silver` (and the durable `raw` tables). The raw → silver mapping is already documented in [`observations.md`](../../../../Hackathon%202026%20-%20Use%20Cases/Hackathon%202026-UseCases/UC1%20-%20Plant%20Capacity%20Utilization/data_sources/observations.md) §7 and [`csv-to-raw-integration.md`](../../../data-model/csv-to-raw-integration.md). Here it is summarized only (§2), so you can trace any gold column back to the CSV.
**Built from:** `migrations/003–005`, `etl/transforms/silver/*.sql`, `etl/transforms/gold/*.sql`, `seeds/*.sql` on `master` (`8a5f2f4`), checked against the dev RDS on 2026-10-01.

How to read the mapping tables:

| Column | Meaning |
| --- | --- |
| Target | Gold column |
| Source | `schema.table.column`, a function, or `—` (generated) |
| Rule | Transformation (rule IDs `R-*` are from observations §6) |
| St | **B** built · **C** change proposed · **N** new · **G** gap (see gold-data-model §6) |

---

## 1. Flow and build order

```
CSV ─load_raw.py─► raw.<csv tables> ──silver/05_staging──► _stg_schedule · _stg_log · _stg_qa · _stg_po_ref
                                     ──silver/10_reference─► work_center · equipment_alias · species · material
                                     ──silver/20_process_order─► lot · process_order · process_order_source · process_order_work_center
                                     ──silver/30_facts──► line_schedule_item · conditioning_run · quality_test
                    raw.ingest_event ──silver/40_ingest─► process_order_change · quality_test (ingested)
                           seeds ───────────────────────► customer_order · order_allocation (synthetic)
silver ──gold/10_views──► v_throughput · v_run_transition · v_changeover_observed · v_po_quality_status · v_open_queue · v_dq_summary
seeds  ─────────────────► config · reason_code · changeover_rule (← v_changeover_observed) · policy (N)
silver + raw.note_* ─(N)─► source_note · semantic_fact · v_trusted_fact
gold/20_replan + 30_api ─► plan_event · schedule_plan · schedule_entry · entry_reason · entry_reason_fact (N) · plan_decision
gold/40_baseline ───────► replan(v1) per demo line, then replay raw.ingest_event (raw.plan_decision_event replay deferred)
```

As built (`etl/build_model.py` STEPS): `migrations/006_raw_note_curation.sql` after 002, `migrations/007_gold_v4_runtime.sql` after 005, then after `silver/40_ingest.sql`: `seeds/gold_reason_code.sql` → `seeds/gold_policy.sql` → `gold/05_semantic.sql` (source_note, rules-v1 reader, semantic_fact, v_trusted_fact) → `gold/10_views.sql` (`v_open_queue` reads `v_trusted_fact`). The in-place path is `--upgrade-gold-v4` (gold-data-model §0).

---

## 2. Silver source inventory (what gold reads)

Grain, keys and FKs as built, checked on the dev RDS. "Rows" = dev RDS on 2026-10-01 (includes runtime demo writes).

| Silver table | Grain (one row per…) | PK | Business key | FKs | Rows | Raw source | Gold use |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `work_center` | work center | `work_center_id` | `work_center_code`; `demo_line_id` UNIQUE | — | 32 | `resource_info.csv` + proposed `LSVHANDPICK` | every gold table (line) |
| `equipment_alias` | Equipment ID spelling × file | `equipment_alias_id` | (`source_csv`, `alias`) | `work_center_id` | 19 | R-EQUIP table | indirect (resolves the log/QA work center) |
| `species` | species code | `species_id` | `species_code` | — | 35 | every Crop/Species column | `v_open_queue` (via `li.species_code`, text) |
| `material` | material description | `material_id` | `material_description` | `species_id` | 1,115 | SAP + 7 schedules | variety for changeover |
| `lot` | seed lot | `lot_id` | `lot_number` | `species_id` | 3,243 | Lot columns + lots in PO columns | `lot_number` in queue / Agent citable |
| `process_order` | PO (the batch) | `process_order_id` | `po_number` | `material_id`, `species_id`, `lot_id`, `work_center_id` | 4,541 (204 `is_in_sap`) | SAP → components → schedules → logs | entry PO; SAP finish/priority fallback |
| `process_order_source` | PO × source row | `process_order_source_id` | (`source_csv`, `source_row_number`) | `process_order_id` | 11,859 | `_stg_po_ref` | lineage only |
| `process_order_work_center` | PO × routed work center | `process_order_work_center_id` | (`process_order_id`, `work_center_id`) | both | 214 | `components.csv` | not used by gold (G-12) |
| `line_schedule_item` | PO on one work-center schedule (one row per source row; DQ-06 repeats kept with `is_duplicate`) | `line_schedule_item_id` | (`source_csv`, `source_row_number`); (`process_order_id`, `work_center_id`) unique WHERE PO not null AND NOT `is_duplicate` | `process_order_id` (54 NULL: placeholder/lot/suspect POs), `work_center_id`, `lot_id`, `material_id` | 4,069 (3 duplicates) | 7 `*_schedule.csv` | **main source of the queue** |
| `conditioning_run` | logged run | `conditioning_run_id` | (`source_csv`, `source_row_number`) | `process_order_id` (48 NULL), `work_center_id` (0 NULL), `lot_id` | 4,129 | LSV + SSV logs | throughput, changeover |
| `quality_test` | output-batch test | `quality_test_id` | (`source_csv`, `source_row_number`) | `process_order_id` (0 NULL), `lot_id`, `work_center_id`, `ingest_event_id` | 3,143 | Pass_Fail log + `pass_fail_log` events | QA hold |
| `process_order_change` | SAP-style delta from one ingest event | `process_order_change_id` | `ingest_event_id` | `process_order_id`, `ingest_event_id` | 4 | `raw.ingest_event` (`sap_priority_change`) | effective priority / finish / rush |
| `customer_order` | customer order line | `customer_order_id` | `order_number` | `material_id` | 16 | **synthetic seed** | due date, demand reason |
| `order_allocation` | order × PO | `order_allocation_id` | (`customer_order_id`, `process_order_id`) | both | 16 (12 POs) | **synthetic seed** | due date, demand reason |

Grain checks run (all pass unless noted):

| Check | Result |
| --- | --- |
| Open schedule rows: one work center per PO | 0 POs open on two schedules → the plan grain (PO per line) holds |
| `line_schedule_item.species_code` vs `material.species` | 0 mismatches |
| `line_schedule_item.material_id` vs `process_order.material_id` | 0 mismatches |
| `line_schedule_item.lot_id` vs `process_order.lot_id` | **4 mismatches** (G-15) |
| SAP work center vs open schedule work center | **13 open rows differ** (G-13) |
| `quality_test.output_batch_number` unique | **8 repeated values, 1 NULL** (G-16) |
| `order_allocation` material = PO material | 0 mismatches |
| `schedule_entry.line_schedule_item_id` NULL | 0 rows |
| silver rows without a raw source row | **2 POs + 2 schedule rows** written by the BFF (G-09) |

---

## 3. Reference tables

### 3.1 `gold.config` ← `seeds/gold_config.sql`

| Target | Source | Rule | St |
| --- | --- | --- | --- |
| `config_key` | seed literal | `as_of_date`, `plan_start_at`, `plant_time_zone`, `heuristic_version`, `min_species_runs` | B |
| `value` | `silver.demo_as_of()` (2026-10-02, demo day; R-DATE-SHIFT, GREENBYTE-017) for the two dates; literals otherwise | `plan_start_at` = demo as-of date + ` 06:00:00 America/Los_Angeles`. Until 2026-10-02 this was `silver.extract_as_of()` (2026-09-28) | B |
| `description` | seed literal | — | B |

### 3.2 `gold.reason_code` ← `seeds/gold_reason_code.sql`

| Target | Source | Rule | St |
| --- | --- | --- | --- |
| `reason_code_id` | — | identity | B |
| `reason_code`, `category`, `description`, `template` | seed literal | 12 rows; `category` ∈ HARD, URGENCY, PRIORITY, CHANGEOVER, DEMAND, EVENT, STATE | B |
| `param_keys` | seed literal | params the code requires (gold-data-model §3.1) | N |
| new rows | seed literal | `NOT_READY_HOLD`, `NOTE_HOLD`, `NOTE_RUSH`, `NOTE_DEADLINE`, `THROUGHPUT_FALLBACK` | N |

### 3.3 `gold.changeover_rule` ← `gold.v_changeover_observed` ← `gold.v_run_transition` ← `silver.conditioning_run`

| Target | Source | Rule | St |
| --- | --- | --- | --- |
| `changeover_rule_id` | — | identity | B |
| `work_center_id` | `conditioning_run.work_center_id` | only `work_center.is_in_scope` | B |
| `transition_code` | `v_run_transition.transition_code` | vs the previous run on the same work center, ordered by `run_date, source_csv, source_row_number`: same species and variety → `SAME_VARIETY`; same species → `SAME_SPECIES`; else `SPECIES_CHANGE`; first run → NULL (excluded) | B · G-07 (no `TRAIT_CHANGE`) |
| `prep_h` | `conditioning_run.prep_h` | median per (work center, transition) | B |
| `cleandown_h` | `conditioning_run.cleandown_h` | median | B |
| `hours` | `prep_h + cleandown_h` | median of the per-run sum `coalesce(prep_h,0) + coalesce(cleandown_h,0)`, **not** the sum of the medians | B |
| `rule_source` | literal `DERIVED` | `SME` rows override (not loaded yet) | B |
| `derived_n` | `count(*)` | rule kept only if n ≥ 5 | B |

Note for G-07: the run's own `prep_h` and `cleandown_h` are attributed to the transition *into* that run. Cleandown usually happens *after* a run, so it belongs to the transition into the next run. This may explain the non-monotonic medians. Confirm with the plant (SQ-11) before changing the rule.

### 3.4 `gold.policy` ← `seeds/gold_policy.sql` (N)

| Target | Source | Rule | St |
| --- | --- | --- | --- |
| `policy_id` | — | identity | N |
| `work_center_id` | `silver.work_center` by `work_center_code` | NULL = default row | N |
| `policy_version`, `status`, `ranking_mode`, `criteria`, `fact_min_confidence`, `hours_per_day`, `notes`, `created_by` | seed literal | v1 = `LEXICOGRAPHIC`, criteria = `ONLINE_FIRST, RUSH, URGENT_DUE, PRIORITY, SAME_VARIETY, SAME_SPECIES, DUE_DATE, RUN_ORDER`, every `basis` = `ASSUMPTION`, `fact_min_confidence` 0.700, `hours_per_day` 24.0 | N |
| `created_at` | — | `now()` at build | N |

---

## 4. Read-model views

### 4.1 `gold.v_throughput` (B) ← `silver.conditioning_run` ⋈ `silver.work_center`

Filter: `run_h > 0 AND input_kg > 0`. `GROUPING SETS` (work center) and (work center, species).

| Target | Source | Rule |
| --- | --- | --- |
| `work_center_id`, `work_center_code` | `work_center` | — |
| `grain` | — | `WORK_CENTER` when species is rolled up, else `SPECIES` |
| `species_code` | `conditioning_run.species_code` | NULL on the `WORK_CENTER` row |
| `n_runs` | — | `count(*)` |
| `median_kg_per_h`, `p75_kg_per_h` | `input_kg / run_h` | p50 / p75 |
| `median_output_kg_per_h` | `output_kg / run_h` | p50 |
| `median_kg_per_total_h` | `input_kg / (prep_h + run_h + cleandown_h)` | p50 |
| `median_scrap_fraction` | `loss_kg / input_kg` | p50 |
| `median_prep_h`, `median_cleandown_h` | `prep_h`, `cleandown_h` | p50 |

Used by `gold.est_kg_per_h(work_center_id, species_code)`: the species row if `n_runs ≥ config.min_species_runs` (5), else the work-center row.

### 4.2 `gold.v_po_quality_status` (B) ← `silver.quality_test`

Grain: one PO with at least one test (`process_order_id` NOT NULL).

| Target | Source | Rule |
| --- | --- | --- |
| `process_order_id` | `quality_test.process_order_id` | group key |
| `n_tests`, `n_pass`, `n_fail`, `n_pending` | `result_code` | counts |
| `latest_test_date` | `test_date` | max |
| `quality_status` | `result_code` | any FAIL → `FAIL`; else any PENDING → `PENDING`; else `PASS` (SQ-08) |
| `latest_fail_test_id`, `latest_fail_reason` | `quality_test_id`, `fail_reason_code` | latest FAIL by `test_date DESC, quality_test_id DESC` |
| `has_ingested_result` | `ingest_event_id` | `bool_or(IS NOT NULL)` |

### 4.3 `gold.v_open_queue` (C) — the queue candidate set

Grain: one open, non-duplicate schedule row = PO × work center. Filter: `line_schedule_item.status_code <> 'COMPLETE' AND NOT is_duplicate`; inner join `process_order`, so rows with `process_order_id` NULL are excluded.

| Target | Source | Rule | St |
| --- | --- | --- | --- |
| `line_schedule_item_id` | `line_schedule_item` | PK of the view | B |
| `work_center_id`, `work_center_code`, `demo_line_id` | `work_center` via `li.work_center_id` | the line comes from the **schedule**, not from `process_order.work_center_id` (G-13) | B |
| `process_order_id`, `po_number`, `po_type` | `process_order` | — | B |
| `species_code` | `line_schedule_item.species_code` | R-SPECIES (upper) | B |
| `variety_code`, `material_description` | `material` via `coalesce(li.material_id, po.material_id)` | — | B |
| `trait_family_code`, `size_fraction_code` | `line_schedule_item` | — | B |
| `lot_number` | `lot` via `coalesce(li.lot_id, po.lot_id)` | schedule lot wins (G-15) | B |
| `status_code`, `status_note`, `run_order`, `run_order_note` | `line_schedule_item` | `*_note` = the non-numeric text kept by `silver.rank_note` / `status_note` | B |
| `input_kg`, `input_qty`, `uom_code` | `line_schedule_item` | `input_kg` NULL when the UoM is `KS` (G-10) | B |
| `schedule_priority_rank`, `priority_note` | `line_schedule_item.priority_rank`, `.priority_note` | — | B |
| `priority_rank` | latest `process_order_change.priority_rank` → `li.priority_rank` → `po.priority_rank` | first non-null | B |
| `priority_source` | — | `INGEST` \| `SCHEDULE` \| `SAP` | B |
| `priority_ingest_event_id` | `process_order_change.ingest_event_id` | latest priority change | B |
| `scheduled_finish_date` | latest `process_order_change.scheduled_finish_date` → `li.scheduled_finish_date` | `li` value = source + 7 days (R-DATE-SHIFT); ingest changes are live dates, not shifted | B |
| `sap_finish_date` | `process_order.sap_finish_date` | reference only (SQ-02); source + 7 days (R-DATE-SHIFT) | B |
| `is_rush` | `li.is_rush` OR any `process_order_change.is_rush` | `li.is_rush` = priority text contains `rush` | B |
| `quality_status`, `latest_fail_test_id`, `latest_fail_reason` | `v_po_quality_status` | `NOT_TESTED` when absent | B |
| `need_by_date`, `order_numbers`, `priority_tier` | `customer_order` ⋈ `order_allocation` | min need-by; orders sorted by need-by; best tier RUSH > KEY > STANDARD | B (synthetic, LSVLN1 only — G-14) |
| `due_date` | — | `least(need_by_date, scheduled_finish_date)` | B (G-14) |
| `due_date_basis` | — | `NEED_BY` \| `SCHEDULE_FINISH` (whichever won) | C |
| `is_hold` | `status_code`, `quality_status`, `v_trusted_fact` | today: `status_code IN ('ON_HOLD','LAB') OR quality_status = 'FAIL'`. Target: OR `is_not_ready` OR trusted `HOLD` fact | C (G-06) |
| `is_not_ready` | `v_trusted_fact` on the same `line_schedule_item_id` | a trusted `NOT_READY` fact and no `RELEASE` fact on that row's notes | C |
| `hold_reason` | — | first of `QA_FAIL`, `STATUS`, `NOT_READY`, `NOTE_HOLD` | C |
| `fact_ids` | `v_trusted_fact.semantic_fact_id` | array | C |
| `throughput_basis` | `v_throughput` | `SPECIES` if n ≥ 5 runs, else `WORK_CENTER` (G-11) | C |
| `has_kg` | `input_kg` | `input_kg IS NOT NULL AND input_kg > 0` (G-10) | C |

Row counts on the dev RDS (open, non-duplicate): LSVGRVTY 17 · LSVLN1 12 · LSVLN2 40 · SSVLN3 16 · SSVLN5 41 · SSVLN6 21. Only LSVLN1 (`line-1`) and LSVLN2 (`line-2`) get plans (`demo_line_id`).

### 4.4 Other views (B, unchanged)

| View | Source | Mapping summary |
| --- | --- | --- |
| `v_run_transition` | `conditioning_run` | `lag(species_code)`, `lag(variety_code)` per work center → `transition_code` (§3.3) |
| `v_changeover_observed` | `v_run_transition` ⋈ `work_center` | n and medians per (work center, transition) |
| `v_latest_plan` | `schedule_plan` | `DISTINCT ON (work_center_id)` by `plan_version DESC` |
| `v_plan_queue` | `schedule_entry` ⋈ `schedule_plan` ⋈ `work_center` ⋈ `process_order`, left `line_schedule_item`, `material`, `lot`, `entry_reason` ⋈ `reason_code` | `reason_short` = rendered template of `seq` 1; `queue_row` JSON (§6) |
| `v_plan_diff` | `v_plan_queue`, parent `schedule_entry`, `plan_event`, `entry_reason` | moves = position ≠ previous; held = HOLD now and not HOLD on the parent; added = no previous position; removed = on the parent and not now; reasons = event code + `isolate_hold` / `resequence_downstream` + lower-case HARD/EVENT/URGENCY codes on moved or held rows |
| `v_order_risk` | `customer_order` ⋈ `order_allocation` ⋈ `process_order`, latest `v_plan_queue` row | slack = need-by − planned end date (plant time zone); at risk if HOLD or late |
| `v_dq_summary` | `dq_flags` of 5 silver tables | `unnest` and count |

---

## 5. Semantic engine (N)

### 5.1 `gold.source_note` ← silver free-text columns

One `UNION ALL` branch per source column; rows with `nullif(btrim(text), '') IS NULL` are skipped.

| Target | `run_order_note` / `priority_note` / `status_note` / `comments` branch | `sap_notes` branch | `comments` (QA) branch | `defect_comments` branch |
| --- | --- | --- | --- | --- |
| `source_csv`, `source_row_number` | `line_schedule_item.*` | `process_order.*` (`excel_sap_data.csv` rows only) | `quality_test.*` | `conditioning_run.*` |
| `source_column` | column name | `sap_notes` | `comments` | `defect_comments` |
| `note_text` | the column | `process_order.sap_notes` | `quality_test.comments` | `conditioning_run.defect_comments` |
| `note_hash` | `encode(sha256(convert_to(upper(btrim(regexp_replace(note_text,'\s+',' ','g'))),'UTF8')),'hex')` | same | same | same |
| `process_order_id` | `li.process_order_id` (nullable) | `po.process_order_id` | `qt.process_order_id` | `cr.process_order_id` (nullable) |
| `line_schedule_item_id` | `li.line_schedule_item_id` | NULL | NULL | NULL |
| `quality_test_id` | NULL | NULL | `qt.quality_test_id` | NULL |
| `conditioning_run_id` | NULL | NULL | NULL | `cr.conditioning_run_id` |
| `work_center_id` | `li.work_center_id` | `po.work_center_id` | `qt.work_center_id` | `cr.work_center_id` |

Expected volumes (dev RDS): schedule operational notes (`run_order_note`, `priority_note`, `status_note`) 899 cells on 872 rows (560 + 336 + 3); `comments` 3,841 (1,041 distinct); `sap_notes` 202 (64 distinct); QA `comments` 894 (425 distinct); `defect_comments` 852 (548 distinct).

### 5.2 `raw.note_reading` ← reader (durable, written at runtime)

| Target | Source | Rule |
| --- | --- | --- |
| `note_hash`, `note_text` | `gold.source_note` (distinct) | one call per distinct hash and reader version |
| `reader`, `model_id`, `prompt_version` | reader | `RULE`/`rules-v1`/`v1` for `gold.read_notes_rules()`; `BEDROCK`/<model id>/<prompt version> when the Agent API returns facts |
| `facts` | reader output | jsonb array, stored as received |
| `read_at`, `read_by` | — | defaults |

Rule reader v1 (`rules-v1`): check the normalized text against **every** rule. A note can produce several facts (e.g. `RUSH - needs fumigated` → `RUSH` + `NOT_READY`; `FUMIGATED priority` → `RELEASE` + `INFO`), and an empty result means `[]`. Every rule needs SME confirmation (SQ-01, SQ-05, SQ-07).

| Pattern (normalized, upper) | Fact | `fact_value` | Confidence | Evidence (rows / open rows) |
| --- | --- | --- | --- | --- |
| `NOT FUMI`, `NEEDS FUMI` (covers `NOT FUMIGATED`, `needs fumigated`) | `NOT_READY` | `{"reason":"FUMIGATION"}` | 0.90 | `NOT FUMIGATED` 24 (1 open, LSVLN2), `Not fumi` 2 (2 open, LSVLN1), `Needs fumi!!` 1 (open, LSVLN1), `RUSH - needs fumigated` 1 |
| `ONCE FUMIGATED` | `NOT_READY` | `{"reason":"FUMIGATION","conditional":true}` | 0.60 → `NEEDS_CONFIRMATION` | `Priority once fumigated` 2 |
| `^FUMIGATED\b` | `RELEASE` | `{"reason":"FUMIGATION"}` | 0.90 | `FUMIGATED` 94 (4 open, LSVLN1), `FUMIGATED priority` 1 |
| `WAIT FOR RAW GERM` | `NOT_READY` | `{"reason":"RAW_GERM_PENDING"}` | 0.80 | 2 open (LSVLN2) |
| `\bON HOLD\b`, `^HOLD\b` | `HOLD` | `{"text":…}` | 0.80 | `CLN-2 ON HOLD` 1 (open, LSVGRVTY), `Hold Vanessa` (any case) in priority notes |
| `\bRUSH\b` | `RUSH` | `{}` | 0.85 | 17 run-order notes + 39 priority notes (any case); 2 open (SSVLN3). Today `is_rush` reads **only** the priority column, so the 17 run-order `RUSH` notes are ignored (G-06) |
| `^\*[0-9]+$`, `VMEK`, `HAND ?PICK`, `LINE [0-9]+ GRAVITY`, `PRIORITY`, `QUALITY SAMPLES`, `SIZING`, `CONDITION` | `INFO` | `{"text":…}` | 0.60 | routing / grouping hints, not used by the ranking |

**Important:** the running PO on LSVLN1 (`1002267630`, `ONLINE`) has `Not fumi`. `ONLINE_FIRST` is a hard rule, so a `NOT_READY` fact must **not** remove an `ONLINE` batch. It only adds a reason. Write this as an explicit precedence in `replan`.

### 5.3 `raw.note_review` ← `gold.review_fact(...)` (durable, runtime)

| Target | Source | Rule |
| --- | --- | --- |
| `note_hash` | `gold.source_note.note_hash` of the reviewed fact | — |
| `po_number` | `silver.process_order.po_number` | NULL = every occurrence of the text |
| `fact_type`, `decision`, `comment` | request body | `decision` ∈ CONFIRMED, REJECTED |
| `reviewed_by`, `reviewed_at` | caller, clock | — |
| `voided_at` | `gold.reset_demo` | — |

### 5.4 `gold.semantic_fact` ← `source_note` ⋈ `raw.note_reading` (+ `raw.note_review`)

Join `source_note.note_hash = note_reading.note_hash`, then `jsonb_array_elements(facts) WITH ORDINALITY`.

| Target | Source | Rule |
| --- | --- | --- |
| `semantic_fact_id` | — | identity |
| `source_note_id` | `source_note` | — |
| `note_reading_id` | `raw.note_reading` | — |
| `fact_seq` | ordinality | — |
| `process_order_id`, `work_center_id` | `source_note` | — |
| `fact_type`, `fact_value`, `applies_to`, `confidence` | `facts[i]` | `applies_to` defaults to `UNKNOWN` |
| `reader`, `model_id`, `prompt_version` | `raw.note_reading` | — |
| `status` | latest non-voided `raw.note_review` on (`note_hash`, `po_number` or NULL, `fact_type`) | review decision; else `AUTO` if confidence ≥ the active `policy.fact_min_confidence`; else `NEEDS_CONFIRMATION`. A PO-specific review wins over a text-wide one |
| `reviewed_by`, `reviewed_at` | `raw.note_review` | — |

Which reading is used: one reading per distinct text, `gold.v_note_reading_current` (readers ranked `HUMAN` > `BEDROCK` > `RULE`, then the latest `read_at`). All facts of that reading count; facts of older readings stay in the table as history. `rules-v1` reads only the operational schedule columns (`run_order_note`, `priority_note`, `status_note`); the other columns are stored in `source_note` for a later reader.

### 5.5 `gold.v_trusted_fact` ← `semantic_fact`

| Target | Source | Rule |
| --- | --- | --- |
| `source_note_id`, `fact_type` | `semantic_fact` | grain key; only facts of the current reading, `status IN ('AUTO','CONFIRMED')`, `applies_to IN ('PO','LOT','UNKNOWN')` |
| `semantic_fact_id`, `process_order_id`, `work_center_id`, `fact_value`, `confidence`, `status`, `reader`, `model_id`, `prompt_version`, `note_reading_id` | `semantic_fact` | lowest `fact_seq` per key |
| `line_schedule_item_id`, `source_csv`, `source_row_number`, `source_column`, `note_text`, `note_hash` | `source_note` | — |
| `fact_label` | `fact_value ->> 'reason'`, else `fact_type` | e.g. `FUMIGATION`, `RAW_GERM_PENDING` |

`UNKNOWN` is included on purpose. Schedule notes sit on the PO row, so the rule reader can't tell PO from lot.

---

## 6. Plan runtime tables

### 6.1 `gold.plan_event` ← `raw.ingest_event` (via `gold.process_ingest_event`)

| Target | Source | Rule | St |
| --- | --- | --- | --- |
| `plan_event_id` | — | identity | B |
| `work_center_id` | `raw.ingest_event.line_id` → `gold.resolve_line` | `line-1`/`LSVLN1` → work center | B |
| `event_type` | `event_source` + silver outcome | `pass_fail_log`: Fail → `qa_fail`, else `qa_pass`; `sap_priority_change`: `process_order_change.is_rush` → `rush`, else `queue_refresh`; new: `sap_new_order` → `queue_refresh`; `review_fact` → `note_review` | B / C |
| `source` | `raw.ingest_event.event_source` | `ui_manual` for reviews | B / C |
| `process_order_id` | open `line_schedule_item` of the PO on that line | the PO must be in the line's open queue, or the event is rejected | B |
| `ingest_event_id` | `raw.ingest_event.ingest_event_id` | add UNIQUE where not null | B / C |
| `payload` | `raw.ingest_event.payload` | as received | B |
| `created_at`, `created_by` | `received_at`, `received_by` | — | B |

`process_order_change.is_rush` (from the event): `payload.rush` if sent; else the new priority is lower (more urgent) than `silver.effective_priority` before the change.

**BFF path to remove (G-09):** `insertCoispiPo` writes `plan_event` with `source = 'etl_refresh'`, no `ingest_event_id`, and a payload built in Node. Target: the BFF calls the Data API, which does `gold.ingest('sap_new_order', …)`, and `silver.apply_ingest_event` creates the PO and the schedule row with `source_csv = 'raw.ingest_event'`.

### 6.2 `gold.schedule_plan` ← `gold.replan`

| Target | Source | Rule | St |
| --- | --- | --- | --- |
| `schedule_plan_id` | — | identity | B |
| `work_center_id` | `gold.resolve_line(p_line)` | — | B |
| `plan_version` | previous max + 1 | per line, under `pg_advisory_xact_lock` | B |
| `parent_plan_id` | latest plan of the line | NULL for v1 | B |
| `status` | — | new = `PROPOSED`; all earlier plans of the line → `SUPERSEDED` (G-08); `accept_plan` → `ACCEPTED` | B / C |
| `plan_event_id` | `p_plan_event_id` | NULL = baseline | B |
| `horizon_start` | `config.plan_start_at` | — | B |
| `created_by` | `config.heuristic_version` | `heuristic-v1` | B |
| `policy_id` | active `gold.policy` for the line, else the default | — | N |

### 6.3 `gold.schedule_entry` ← `gold.v_open_queue` + `v_throughput` + `changeover_rule` (in `gold.replan`)

Candidates: `v_open_queue` WHERE `work_center_id` = the line. Runnable = NOT `is_hold` (target: also NOT `is_not_ready`, unless `status_code = 'ONLINE'`). Greedy: each step picks the first runnable candidate by the policy order (v1 = the current `ORDER BY`):

1. `status_code = 'ONLINE'` first
2. `is_rush` first
3. urgent first: `due_date` < the date the batch would finish if started now
4. among urgent, earliest `due_date`
5. `priority_rank` ascending (NULLs last)
6. same species and variety as the previous batch first
7. same species as the previous batch first
8. `due_date` ascending
9. `run_order` ascending
10. `po_number` (tie-break)

| Target | Source | Rule | St |
| --- | --- | --- | --- |
| `schedule_entry_id` | — | identity | B |
| `schedule_plan_id` | the new plan | — | B |
| `position` | — | 1..n for runnable rows, then HOLD rows | B |
| `process_order_id`, `line_schedule_item_id` | `v_open_queue` | — | B |
| `entry_status` | — | `PLANNED` (runnable) \| `HOLD` | B |
| `est_changeover_h` | `gold.changeover_hours(work_center, transition)` | transition vs the previous **planned** batch (`material.variety_code`, `species_code`); 0 for the first entry or an `ONLINE` batch; missing rule → 0 | B (G-07) |
| `est_run_h` | `input_kg / gold.est_kg_per_h(work_center, species)` | rounded to 2 decimals; 0 when `input_kg` is NULL (G-10) | B |
| `planned_start_at` | running clock + `est_changeover_h` | clock starts at `config.plan_start_at`; continuous 24 h/day | B |
| `planned_end_at` | `planned_start_at + est_run_h` | becomes the next clock | B |
| `due_date` | `v_open_queue.due_date` | snapshot | B |
| `slack_days` | `due_date − planned_end_at::date` (plant time zone) | int days | B |
| `is_at_risk` | `slack_days < 0` | false when no due date | B |
| `previous_position` | parent plan's entry for the same PO | NULL = added | B |
| HOLD rows | `v_open_queue` WHERE `is_hold` | ordered by `priority_rank`, `due_date`, `po_number`; no times | B |

### 6.4 `gold.entry_reason` ← `gold.replan` rules

`seq` is assigned in this order (only the ones that apply). `seq` 1 becomes `reasonShort`.

| Reason code | Condition | `params` (source) | St |
| --- | --- | --- | --- |
| `ALREADY_RUNNING` | `status_code = 'ONLINE'` | `work_center_code`, `status_code` | B |
| `RUSH_PRIORITY` | `is_rush` | `priority_rank`, `previous_priority` (= `schedule_priority_rank`), `source`, `ingest_event_id` | B |
| `RESEQUENCED` | event plan, position changed, not the event's own PO | `from_position`, `to_position`, `event_type`, `event_po` | B |
| `DUE_DATE_RISK` / `EARLIEST_DUE` | slack < 0 / urgent | `due_date`, `planned_end_date`, `slack_days`, `scheduled_finish_date`, `need_by_date` | B |
| `PRIORITY` | `priority_rank` not null and not rush | `priority_rank`, `priority_source` | B |
| `SAME_VARIETY_GROUP` / `SAME_SPECIES_GROUP` | transition | `variety_code`/`species_code`, `previous_po`, `saved_h` = max(SAME_SPECIES h − SAME_VARIETY h, 0) | B (G-07: `saved_h` can be 0) |
| `CUSTOMER_DEMAND` | allocated orders | `order_number`, `order_numbers`, `need_by_date`, `priority_tier`, `is_synthetic` | B |
| `CHANGEOVER` | `est_changeover_h > 0` | `transition_code`, `hours`, `from_po` | B |
| `QA_HOLD` (HOLD row) | `quality_status = 'FAIL'` | `quality_test_id`, `fail_reason`, `source` | B |
| `STATUS_HOLD` (HOLD row) | otherwise | `status_code` | B |
| `NOT_READY_HOLD` (HOLD row) | `is_not_ready` and not ONLINE | `fact_label`, `source_note_id`, `note_text` | N |
| `NOTE_HOLD` (HOLD row) | trusted `HOLD` fact | `source_note_id`, `note_text` | N |
| `NOTE_RUSH` | trusted `RUSH` fact and not already `RUSH_PRIORITY` | `source_note_id`, `note_text` | N |
| `THROUGHPUT_FALLBACK` | `throughput_basis = 'WORK_CENTER'` | `species_code`, `work_center_code` | N |

### 6.5 `gold.entry_reason_fact` ← `gold.replan` (N)

| Target | Source | Rule |
| --- | --- | --- |
| `entry_reason_id` | the reason just written | — |
| `semantic_fact_id` | `v_open_queue.fact_ids` matching the reason's fact type | one row per supporting fact |

### 6.6 `gold.plan_decision` ← `gold.accept_plan` (`raw.plan_decision_event` deferred)

| Target | Source | Rule | St |
| --- | --- | --- | --- |
| `plan_decision_id` | — | identity | B |
| `schedule_plan_id` | latest plan of the line | rejects a stale `plan_version` (`serialization_failure`) | B |
| `decision` | literal `ACCEPT` | `OVERRIDE`/`REJECT` not implemented | B |
| `override_detail` | — | NULL | B (G-20) |
| `decided_by`, `decided_at`, `comment` | caller, clock, body | — | B |
| (replay) | `raw.plan_decision_event` (`line_id`, `plan_version`) → plan | after the ingest replay; skip with a warning if the version doesn't exist | N |

---

## 7. API projection (contract fields)

`gold.v_plan_queue.queue_row` → BFF `QueueRow` (`frontend/src/demo/plant/plantDemoTypes.ts`):

| JSON key | Source | Rule |
| --- | --- | --- |
| `po` | `process_order.po_number` | — |
| `species` | `line_schedule_item.species_code` | — |
| `kg` | `line_schedule_item.input_kg` | NULL stripped |
| `finish` | `schedule_entry.planned_end_at` (plant TZ, `YYYY-MM-DD HH24:MI`); HOLD rows: `due_date` or `scheduled_finish_date` (`YYYY-MM-DD`) | — |
| `status` | `schedule_entry.entry_status` | `PLANNED` \| `HOLD` |
| `atRisk` | `schedule_entry.is_at_risk` | — |
| `reasonShort` | `render_reason(template, params)` of `seq` 1 | — |
| `previousPosition` | `schedule_entry.previous_position` | NULL stripped |

`gold.agent_context` additions (built): `facts[]` = `{factId: semantic_fact_id, po, type: fact_type, label, note: note_text, source: source_csv:source_row_number:source_column, status, reader: model_id, confidence}` for every fact linked to a reason of the plan (`entry_reason_fact`); `citable.factIds` = those ids; `constraints.policy` = `{policyId, version, rankingMode, criteria, factMinConfidence}`.

---

## 8. Key and FK conformance matrix

✔ = matches the standard (uc1-data-model §5.3) · ✖ = gap.

| Table | PK identity | Business key UNIQUE | FKs named after PK | FK targets exist | Grain documented | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `config` | ✖ (natural `config_key`, accepted exception) | ✔ | — | — | ✔ | |
| `reason_code` | ✔ | ✔ | — | — | ✔ | add `param_keys` |
| `changeover_rule` | ✔ | ✔ | ✔ | ✔ | ✔ | |
| `policy` (N) | ✔ | ✔ (NULLS NOT DISTINCT) | ✔ | ✔ | ✔ | one ACTIVE per line |
| `source_note` (N) | ✔ | ✔ (lineage triple) | ✔ | ✔ | ✔ | replaces `source_table` / `source_row_id` |
| `semantic_fact` (N) | ✔ | ✔ | ✔ | ✔ (`note_reading_id` → raw) | ✔ | re-scoped grain |
| `entry_reason_fact` (N) | composite | = PK | ✔ | ✔ | ✔ | |
| `plan_event` | ✔ | ✖ → add `ingest_event_id` UNIQUE | ✔ | ✔ | ✔ | |
| `schedule_plan` | ✔ | ✔ | ✔ (`parent_plan_id` self) | ✔ (+ `policy_id`) | ✔ | status semantics (G-08) |
| `schedule_entry` | ✔ | ✔ ×2 | ✔ | ✔ | ✔ | make `line_schedule_item_id` NOT NULL |
| `entry_reason` | ✔ | ✔ | ✔ | ✔ | ✔ | typed params (G-21) |
| `plan_decision` | ✔ | ✖ → partial unique on ACCEPT | ✔ | ✔ | ✔ | durability (G-01) |
| `raw.note_reading` (N) | ✔ | ✔ | — | — | ✔ | durable |
| `raw.note_review` (N) | ✔ | append-only | — | — | ✔ | durable |
| `raw.plan_decision_event` (deferred) | ✔ | append-only | — | — | ✔ | durable |

---

## 9. Planner v2: payload → gold (built 2026-10-02)

Source: `gold.plan_event.payload` of a `planner_run` event, written by the Data API for the semantic planner and read by `gold.replan`. The payload is stored unchanged; these are the typed copies. `element_seq` = the 1-based position of the element in its array.

### 9.1 `payload.entries[i]` → `gold.schedule_entry`

| Target | JSON key | Rule |
| --- | --- | --- |
| `line_schedule_item_id` | `lineScheduleItemId` | must exist in silver |
| `process_order_id` | `processOrderId` | default = the schedule row's PO; must equal it (guard 1) |
| `position` | `position` | unique per plan (table constraint) |
| `entry_status` | `entryStatus` | upper case; default `PLANNED` |
| `planned_start_at`, `planned_end_at` | `plannedStartAt`, `plannedEndAt` | ISO timestamps; PLANNED start ≤ end, HOLD null (guard 3) |
| `est_run_h`, `est_changeover_h` | `estRunH`, `estChangeoverH` | as sent |
| `due_date` | `dueDate` | the SAP finish date (planner rule) |
| `due_date_basis` | `dueDateBasis` | default `SAP_FINISH` |
| `slack_days`, `is_at_risk` | `slackDays`, `isAtRisk` | as sent (`isAtRisk` default false) |
| `previous_position` | `previousPosition` | as sent when the key is present, else computed from the parent plan |
| — | line | row on the plan line, or an active `LINE_SWAP` of the PO to this line (guard 2) |
| `entry_reason` (seq, code, params) | `reasons[j].seq`, `.code`, `.params` | via `gold.add_reason` (code must exist, params must carry `param_keys`); seq default j |
| `entry_reason_fact` | `reasons[j].factIds` | one row per id |

### 9.2 Other payload arrays

| Target | JSON | Rule |
| --- | --- | --- |
| `plan_override.process_order_id` | `overrides[i].po` | `silver.norm_po`; unknown PO rejects the call |
| `plan_override.override_type` | `.type` | `LINE_SWAP` \| `PIN_POSITION` \| `FORCE_HOLD` |
| `plan_override.from_work_center_id` | — | line of the PO's open schedule row |
| `plan_override.to_work_center_id` | `.workCenterCode` (or `.lineId`) | `gold.resolve_line`; LINE_SWAP only |
| `plan_override.pinned_position` | `.position` (or `.pinnedPosition`) | PIN_POSITION only |
| `plan_override.hold_reason` | `.reason` (or `.holdReason`) | FORCE_HOLD only; default `planner override` |
| `plan_override.is_active` | `.active` | default true; the latest row per (PO, type) wins |
| `line_downtime.work_center_id` | `downtime[i].lineId` (or `.workCenterCode`) | `gold.resolve_line` |
| `line_downtime.starts_at`, `ends_at`, `reason` | `.startsAt`, `.endsAt`, `.reason` | ends > starts |
| `repair_proposal.parent_process_order_id` | `proposals[i].parentPo` | unknown PO rejects the call |
| `repair_proposal.route_work_center_id` | `.route` | a work-center code, or an in-scope LSV line type (`COLORSORT` → LSVCLSRT, `GRAVITY` → LSVGRVTY) |
| `repair_proposal.quality_test_id` | `.qualityTestId` | default = the PO's latest FAIL test |
| `repair_proposal.fail_reason_code` | `.failReason` | default = that test's fail reason; must be a `gold.fail_reason` |
| `repair_proposal.status` | `.status` | default `PROPOSED` |
| `*_json` | the element | as sent |
| — | `impact` | not copied: `gold.v_plan_impact.planner_impact` reads it from the payload |

### 9.3 Reference tables → `gold.config.planner_rules`

| JSON key | Source |
| --- | --- |
| `season` | `gold.config.season` |
| `timeZone` | `gold.config.plant_time_zone` |
| `calendar.<work_center_code>` | `gold.work_center_calendar` of the season: `weekdays` (ISO), `start` = min start, `end` = max end |
| `cleanoutTriggers` | `gold.sequence_rule.rule_code` WHERE `rule_type = 'CLEANOUT'` |
| `forbiddenSequence` | first `FORBIDDEN` rule: `from` / `to` trait family |
| `repairRoutes` | `gold.repair_route`: fail code → route `line_type` |
| `repairRouteWorkCenters` | `gold.repair_route`: fail code → route `work_center_code` (added so the route can be joined) |
