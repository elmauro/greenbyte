# UC1 gold data model — target (v4 proposal)

**Owner:** Data API (Camilo) · **Date:** 2026-10-01 · **Status:** BUILT (v4.0, see §0)
**Inputs:** gold as built on `master` (`migrations/005_gold_runtime.sql`, `etl/transforms/gold/*.sql`, `seeds/gold_*.sql`) and the semantic-engine proposal [`docs/hackathon/uc1-gold-engine-schema.md`](../../../../docs/hackathon/uc1-gold-engine-schema.md) (commit `9375b41`, branch `gold-layer-schemas`).
**Companion files:** [source-to-target-mapping.md](./source-to-target-mapping.md) (column-level lineage) · [WORKING-PLAN.md](./WORKING-PLAN.md) (tasks and decisions).
**Evidence:** read-only queries on the dev RDS (`greenbyte`, `raw.load_batch` load_id 1, 2026-10-01). Counts include runtime demo writes (ingest events, plans, two BFF-inserted POs), so a few totals are higher than a clean build (`process_order` 4,541 vs 4,539 in uc1-data-model §5.5).

This file defines every gold table and view: **grain, primary key, business key, foreign keys, lifecycle**. Each one is marked:

| Mark | Meaning |
| --- | --- |
| **BUILT** | Exists on `master` and in the dev RDS; no change proposed |
| **CHANGE** | Exists; this proposal changes columns, constraints or semantics |
| **NEW** | Not built yet (from the proposal or from this analysis) |

Gap IDs (`G-nn`) are listed in §6, decisions (`D-nn`) in [WORKING-PLAN.md](./WORKING-PLAN.md) §3. Questions for Syngenta (`SQ-nn`) are in [`backend/data-model/uc1-open-questions.md`](../../../data-model/uc1-open-questions.md).

---

## 0. As built (2026-10-01)

Applied to the shared dev RDS (`greenbyte`) with `python etl/build_model.py --upgrade-gold-v4`. Gold v4 checks: 13 passed; demo scenario: passed (rolled back). Decisions D-01…D-09 are recorded in [WORKING-PLAN.md](./WORKING-PLAN.md) §3.

| Area | Built | Deferred (not built) |
| --- | --- | --- |
| Durable input in `raw` | `raw.note_reading`, `raw.note_review` (`migrations/006_raw_note_curation.sql`) | `raw.plan_decision_event` + decision replay (D-08: durability not in scope) |
| Semantic engine | `gold.source_note`, `gold.semantic_fact`, `gold.entry_reason_fact`, `gold.v_note_reading_current`, `gold.v_trusted_fact`, rules-v1 reader, `gold.record_note_reading`, `gold.review_fact` (`etl/transforms/gold/05_semantic.sql`, `30_api.sql`) | Bedrock reader (Agent API side) |
| Policy | `gold.policy` v1 (LEXICOGRAPHIC, = heuristic-v1), `gold.active_policy`, `gold.policy_order_by`, policy-driven `gold.replan`, `schedule_plan.policy_id` | `WEIGHTED` mode (raises `feature_not_supported`) |
| Plan runtime | `reason_code.param_keys` + check in `gold.add_reason`, 6 new reason codes, `plan_event` `note_review` + unique `ingest_event_id`, `schedule_entry.line_schedule_item_id` NOT NULL, `gold.v_plan_status` | partial unique ACCEPT on `plan_decision` |
| Queue | `v_open_queue`: `is_not_ready`, `hold_reason`, `not_ready_fact_id`, `hold_fact_id`, `rush_fact_id`, `is_rush_note`, `fact_ids`, `due_date_basis`, `throughput_basis`, `has_kg` | — |
| New PO path | — | `sap_new_order` via `raw.ingest_event` (D-05: keep the BFF insert) |

Upgrade method (D-09): raw and silver were not dropped (v4 changes no silver table). The six gold tables whose definition changed were renamed to `gold.<name>_legacy` (`reason_code`, `plan_event`, `schedule_plan`, `schedule_entry`, `entry_reason`, `plan_decision`), with their indexes and sequences, and commented with the reason. `gold.config` and `gold.changeover_rule` are reused unchanged. Gold views and functions were recreated, and the plans regenerated (baseline v1 per demo line + replay of the 5 ingest events). The legacy tables keep the pre-upgrade demo history: 9 plans, 189 entries, 6 ACCEPT decisions. A later full build (`build_model.py` without flags) drops the gold schema, legacy tables included.

Regression (D-02): with every Line 1 note fact rejected and the ingest events voided, policy v1 rebuilt the Line 1 baseline with the same 12 positions, run hours, changeover hours and finish times as legacy plan v1. The only difference was a `RESEQUENCED` reason, which comes from the review event.

---

## 1. Design rules

1. **Gold is derived, not durable.** `001_schemas.sql` runs `DROP SCHEMA gold CASCADE` and `DROP SCHEMA silver CASCADE` on every build, and every surrogate id (`*_id identity`) is regenerated. Anything a person or a model writes that must survive a rebuild is stored **append-only in `raw`**, keyed by stable business keys (`po_number`, `line_id`, `source_csv` + `source_row_number`, `note_hash`), and replayed into gold. `raw.ingest_event` already works this way. (G-01)
2. **Gold references silver by surrogate id inside one build only.** Durable `raw` rows never store a silver or gold `*_id`.
3. **Key standard** (uc1-data-model §5.3): PK `<table>_id bigint GENERATED ALWAYS AS IDENTITY`; business key `UNIQUE`; FKs named after the referenced PK; snake_case, singular names.
4. **Metrics are computed in views, not stored** (R-DERIVED). The exception is the plan snapshot (`schedule_entry` times, slack, risk): it is frozen at replan time on purpose, so an old plan still shows what was proposed.
5. **The Agent explains; it does not decide.** The ranking reads only typed, trusted facts. Free text stays as evidence and is cited by id.
6. **No write-back to SAP/ERP.** `plan_decision` is audit only.

---

## 2. Model overview

```
                     ┌──────────── reference (seeded / derived each build) ────────────┐
                     │ config · reason_code · changeover_rule · policy (NEW)           │
                     └──────────────────────────────────────────────────────────────────┘
silver.line_schedule_item ─┐
silver.process_order ──────┼─► source_note (NEW) ──► semantic_fact (NEW) ◄── raw.note_reading (NEW, durable)
silver.quality_test ───────┤                              ▲                ◄── raw.note_review  (NEW, durable)
silver.conditioning_run ───┘                              │
                                                          │ trusted facts (v_trusted_fact)
raw.ingest_event ─► silver.process_order_change / quality_test
        │                                                 ▼
        └──────────► plan_event ─► schedule_plan ─► schedule_entry ─► entry_reason ─► entry_reason_fact (NEW)
                                        │  (policy_id NEW)
                                        └─► plan_decision ◄── raw.plan_decision_event (deferred; D-08)
```

---

## 3. Table catalog

### 3.1 Reference

#### `gold.config` — BUILT

| Item | Value |
| --- | --- |
| Grain | One demo-wide setting |
| PK | `config_key text` (natural key, no identity: the standard's documented exception) |
| FKs | none |
| Source | `seeds/gold_config.sql` (5 keys: `as_of_date`, `plan_start_at`, `plant_time_zone`, `heuristic_version`, `min_species_runs`) |
| Lifecycle | Rebuilt every build |

Note: `heuristic_version` and the proposal's `policy` overlap. When `policy` exists, `schedule_plan.created_by` keeps the heuristic name and `schedule_plan.policy_id` names the rules (G-05, D-06).

#### `gold.reason_code` — CHANGE

| Item | Value |
| --- | --- |
| Grain | One machine reason kind |
| PK | `reason_code_id` |
| Business key | `reason_code` UNIQUE |
| FKs | none |
| Source | `seeds/gold_reason_code.sql` (12 codes; 10 are used by the current plans) |

Changes:
- Add `param_keys text[] NOT NULL DEFAULT '{}'`: the params each code must carry. Today `entry_reason.params` is untyped jsonb and `agent_context` finds citable ids by key name (`quality_test_id`, `order_numbers`) (G-21).
- New codes, so semantic facts can explain a position:

| New code | Category | Template (fallback) | Required params |
| --- | --- | --- | --- |
| `NOT_READY_HOLD` | HARD | `Not ready ({fact_label}): note "{note_text}" — on hold` | `fact_label`, `semantic_fact_id`, `note_text` |
| `NOT_READY_WARNING` | STATE | `Running although the note says not ready ({fact_label}): "{note_text}"` (ONLINE batch: kept first, flagged) | `fact_label`, `semantic_fact_id`, `note_text` |
| `NOTE_HOLD` | HARD | `On hold per note "{note_text}"` | `semantic_fact_id`, `note_text` |
| `NOTE_RUSH` | EVENT | `Rush per note "{note_text}"` | `semantic_fact_id`, `note_text` |
| `NOTE_DEADLINE` | URGENCY | `Note deadline {deadline_date}: "{note_text}"` (not produced by rules-v1) | `semantic_fact_id`, `deadline_date`, `note_text` |
| `THROUGHPUT_FALLBACK` | STATE | `No {species_code} run history on {work_center_code}: line median speed used` | `work_center_code` (G-11; `species_code` can be NULL) |

`param_keys` of the existing codes list only params that are always non-null (e.g. `QA_HOLD` = `quality_test_id`, `source`; `fail_reason` can be NULL under DQ-18). Reasons cite `semantic_fact_id`, the id the Agent may quote.

#### `gold.changeover_rule` — CHANGE

| Item | Value |
| --- | --- |
| Grain | One work center × one transition type |
| PK | `changeover_rule_id` |
| Business key | (`work_center_id`, `transition_code`) UNIQUE |
| FKs | `work_center_id` → `silver.work_center` |
| Source | `seeds/gold_changeover_rule.sql` ← `gold.v_changeover_observed` (in-scope work centers, n ≥ 5) |
| Rows | 24 (8 work centers × 3 transitions). `TRAIT_CHANGE` is allowed by the CHECK but has **0 rows** |

Changes:
- Add `TRAIT_CHANGE` rows when an SME confirms them (SQ-11). LSVGRVTY's open queue mixes EXCELIS 11, FRESH 4, NONE 2, but the rule doesn't model that switch (G-07).
- Add a monotonic check to the reconciliation tests. In the derived data, LSVLN1 `SAME_SPECIES` = 3.50 h (n = 213) costs **more** than `SPECIES_CHANGE` = 2.50 h (n = 60). LSVGRVTY `SPECIES_CHANGE` = 0.50 h < `SAME_SPECIES` = 0.67 h. With these values, grouping by species does not save time, which goes against the UC1 objective (G-07).
- Leave `rule_source = 'SME'` rows as the override (already in the CHECK).

#### `gold.policy` — NEW (from proposal, with changes)

| Item | Value |
| --- | --- |
| Grain | One version of the soft ranking rules for one work center (`work_center_id` NULL = default for all lines) |
| PK | `policy_id` |
| Business key | (`work_center_id`, `policy_version`) UNIQUE NULLS NOT DISTINCT (PG 15+; local and RDS run 16) |
| FKs | `work_center_id` → `silver.work_center` (nullable) |
| Constraint | One `ACTIVE` per line: partial unique index on `coalesce(work_center_id, 0)` WHERE `status = 'ACTIVE'` |
| Source | `seeds/gold_policy.sql` (git-versioned, so it survives rebuilds; D-06) |

Columns: as in the proposal (`policy_version`, `status`, `criteria jsonb`, `fact_min_confidence`, `hours_per_day`, `notes`, `created_by`, `created_at`), plus:
- `ranking_mode text NOT NULL CHECK (ranking_mode IN ('LEXICOGRAPHIC','WEIGHTED'))`. The proposal says both "earlier entries win" (lexicographic) and gives weights where the last entry, `RUSH`, has the biggest weight (2.0). The two can't both hold. `gold.replan` is lexicographic today (D-02, G-04).
- `criteria[].code` limited to the keys the sequencer implements: `ONLINE_FIRST`, `RUSH`, `URGENT_DUE`, `PRIORITY`, `SAME_VARIETY`, `SAME_SPECIES`, `DUE_DATE`, `RUN_ORDER`. These match the current `ORDER BY` in `gold.replan` one to one, so policy v1 can reproduce heuristic-v1 exactly.

`hours_per_day` is not used today: the replan clock runs continuously at 24 h/day. Keep the default of 24 until SQ-10 is answered (G-05).

### 3.2 Semantic engine

The proposal's `gold.semantic_fact` mixes two grains: "one reading of one note" (a model call, which should be made once per distinct text) and a row per `source_row_id` (each place the note appears). The data shows the difference matters. `run_order_note` has 560 occurrences but only 72 distinct values, and `FUMIGATED` alone appears 94 times. The target splits the proposal's table into three (G-02):

| Object | Grain | Durable? |
| --- | --- | --- |
| `gold.source_note` | One non-empty free-text cell in one silver row (occurrence) | No: rebuilt from silver |
| `raw.note_reading` | One reading of one **distinct** note text by one reader/model/prompt version | **Yes** (append-only) |
| `raw.note_review` | One human confirm/reject action on a fact for a PO | **Yes** (append-only) |
| `gold.semantic_fact` | One typed fact from one reading, applied to one note occurrence | No: rebuilt (`source_note` × reading facts) |

#### `gold.source_note` — NEW

| Item | Value |
| --- | --- |
| Grain | One non-empty free-text cell: (`source_csv`, `source_row_number`, `source_column`) |
| PK | `source_note_id` |
| Business key | (`source_csv`, `source_row_number`, `source_column`) UNIQUE. Uses the stable silver lineage, not a surrogate `source_row_id` (G-03) |
| FKs | `process_order_id` → `silver.process_order` (nullable: a lot or equipment note can have no PO) · `line_schedule_item_id` → `silver.line_schedule_item` (nullable) · `quality_test_id` → `silver.quality_test` (nullable) · `conditioning_run_id` → `silver.conditioning_run` (nullable) · `work_center_id` → `silver.work_center` (nullable) |
| Check | `num_nonnulls(line_schedule_item_id, quality_test_id, conditioning_run_id) <= 1`. SAP notes (`source_column = 'sap_notes'`) have none of the three and only `process_order_id` |
| Columns | `note_text text NOT NULL` (trimmed as in silver) · `note_hash char(64) NOT NULL` = sha256 of `upper(btrim(regexp_replace(note_text, '\s+', ' ', 'g')))` · `source_column text NOT NULL CHECK (IN ('run_order_note','priority_note','status_note','comments','sap_notes','defect_comments'))` |

Scope order (G-18):
1. `line_schedule_item.run_order_note`, `.priority_note`, `.status_note`. These carry operational meaning (`FUMIGATED`, `NOT FUMIGATED`, `Needs fumi!!`, `Wait for raw germ`, `RUSH`, `Hold Vanessa`, `CLN-2 ON HOLD`). 872 schedule rows in total; 21 open-queue rows on all lines, 10 of them on the two demo lines.
2. `process_order.sap_notes` and `line_schedule_item.comments`. Low signal: for SAP POs, `comments` equals `sap_notes` in 157 of 159 rows. Both look like a material/routing description (`PECO PEA RAW RDY Ln2 INT`).
3. `quality_test.comments` (894 rows, 425 distinct) and `conditioning_run.defect_comments` (852, 548). History only, not used by the ranking.

#### `raw.note_reading` — NEW (durable)

| Item | Value |
| --- | --- |
| Grain | One reading of one distinct note text by one reader version: (`note_hash`, `reader`, `model_id`, `prompt_version`) |
| PK | `note_reading_id bigint identity` |
| Business key | (`note_hash`, `reader`, `model_id`, `prompt_version`) UNIQUE: a second call is a no-op (the proposal's intent) |
| FKs | none (raw stores no silver/gold ids) |
| Columns | `note_text text NOT NULL` (the text that was read, as evidence) · `reader text NOT NULL CHECK (IN ('RULE','BEDROCK','HUMAN'))` (D-03; `JEV` in the proposal is undefined) · `model_id text NOT NULL` (`rules-v1` for RULE) · `prompt_version text NOT NULL` · `facts jsonb NOT NULL CHECK (jsonb_typeof(facts) = 'array')` as returned, e.g. `[{"fact_type":"NOT_READY","fact_value":{"reason":"FUMIGATION"},"applies_to":"PO","confidence":0.95}]` (`[]` = read, nothing found: the proposal's `NONE`) · `read_at timestamptz NOT NULL DEFAULT clock_timestamp()` · `read_by text NOT NULL DEFAULT current_user` |
| Writer | The Data API only, through `gold.record_note_reading(...)`. The Agent API returns the facts to the Data API and never writes to the database (CLAUDE.md architecture) |

#### `raw.note_review` — NEW (durable)

| Item | Value |
| --- | --- |
| Grain | One human review action on one fact type of one note for one PO |
| PK | `note_review_id bigint identity` |
| Business key | none (append-only; the latest action per (`note_hash`, `po_number`, `fact_type`) wins) |
| Columns | `note_hash char(64) NOT NULL` · `po_number text` (NULL = applies to every occurrence of that text) · `fact_type text NOT NULL` · `decision text NOT NULL CHECK (IN ('CONFIRMED','REJECTED'))` · `comment text` · `reviewed_by text NOT NULL` · `reviewed_at timestamptz NOT NULL DEFAULT clock_timestamp()` · `voided_at timestamptz` (demo reset, same as `raw.ingest_event`) |

#### `gold.semantic_fact` — NEW (re-scoped from the proposal)

| Item | Value |
| --- | --- |
| Grain | One typed fact (`fact_seq` within the reading) from one reading applied to one note occurrence |
| PK | `semantic_fact_id` |
| Business key | (`source_note_id`, `note_reading_id`, `fact_seq`) UNIQUE |
| FKs | `source_note_id` → `gold.source_note` · `process_order_id` → `silver.process_order` (nullable, copied from `source_note`) · `work_center_id` → `silver.work_center` (nullable) |
| Columns | `note_reading_id bigint NOT NULL` (raw id: stable, because raw is not rebuilt) · `fact_seq smallint NOT NULL` · `fact_type text NOT NULL CHECK (IN ('NOT_READY','HOLD','RELEASE','RUSH','DEADLINE','INFO'))` (`NONE` is dropped: an empty `facts` array means nothing found) · `fact_value jsonb` · `applies_to text NOT NULL CHECK (IN ('PO','LOT','EQUIPMENT','LINE','UNKNOWN'))` · `confidence numeric(4,3) CHECK (BETWEEN 0 AND 1)` (NULL only for `HUMAN`) · `reader`, `model_id`, `prompt_version` (copied) · `status text NOT NULL CHECK (IN ('AUTO','NEEDS_CONFIRMATION','CONFIRMED','REJECTED'))`, **derived** at build: latest non-voided `raw.note_review` wins, else `AUTO` if confidence ≥ the active policy's `fact_min_confidence`, else `NEEDS_CONFIRMATION` · `reviewed_by`, `reviewed_at` (from the review) |
| Index | (`process_order_id`, `status`) |

#### `gold.v_trusted_fact` — NEW (view)

| Item | Value |
| --- | --- |
| Grain | One note occurrence × fact type: (`source_note_id`, `fact_type`) |
| Source | `semantic_fact` of the **current reading** of the note text (`gold.v_note_reading_current`: HUMAN > BEDROCK > RULE, then latest) WHERE `status IN ('AUTO','CONFIRMED')` and `applies_to IN ('PO','LOT','UNKNOWN')` |
| Used by | `gold.v_open_queue` joins it on `line_schedule_item_id`: a fact affects only the schedule row whose note it is, not other schedule rows of the same PO. `gold.replan` (reasons), `gold.agent_context` (`facts`, `citable.factIds`) (G-06) |

#### `gold.entry_reason_fact` — NEW (from proposal, unchanged)

| Item | Value |
| --- | --- |
| Grain | One reason on a queue row × one fact that justified it |
| PK | (`entry_reason_id`, `semantic_fact_id`) |
| FKs | `entry_reason_id` → `gold.entry_reason` ON DELETE CASCADE · `semantic_fact_id` → `gold.semantic_fact` |
| Writer | `gold.replan`, in the same transaction as the reason |

### 3.3 Plan runtime

#### `gold.plan_event` — CHANGE

| Item | Value |
| --- | --- |
| Grain | One trigger of one replan on one line |
| PK | `plan_event_id` |
| Business key | `ingest_event_id` UNIQUE where not null (add; today a replayed event could insert twice if called outside `process_ingest_event`) |
| FKs | `work_center_id` → `silver.work_center` · `process_order_id` → `silver.process_order` (nullable) · `ingest_event_id` → `raw.ingest_event` (nullable) |
| Values (as built) | `event_type` ∈ `rush`, `qa_fail`, `qa_pass`, `queue_refresh`, `manual_adjust` (lower case; the proposal's `RUSH`/`QA_FAIL`/`QUEUE_REFRESH` don't match the CHECK) · `source` ∈ `sap_priority_change`, `pass_fail_log`, `etl_refresh`, `ui_manual` |

Changes:
- New `event_type` `note_review` (`source` = `ui_manual`): a confirm/reject that changes a trusted fact triggers a replan.
- New `raw.ingest_event.event_source` `sap_new_order` for the COISPI "new PO" refresh. Today the BFF inserts straight into `silver.process_order` and `silver.line_schedule_item`, with invented lineage (`excel_sap_data.csv` rows 204–205 and `line_2_schedule.csv` rows 444–445, none of which exist in raw), and writes `plan_event` with `source = 'etl_refresh'` and no `ingest_event_id`. Those rows disappear on the next build and break "silver is derived" (G-09, D-05).

#### `gold.schedule_plan` — CHANGE

| Item | Value |
| --- | --- |
| Grain | One plan version for one line |
| PK | `schedule_plan_id` |
| Business key | (`work_center_id`, `plan_version`) UNIQUE |
| FKs | `work_center_id` → `silver.work_center` · `parent_plan_id` → `gold.schedule_plan` · `plan_event_id` → `gold.plan_event` (NULL = baseline) · `policy_id` → `gold.policy` (**NEW**, nullable until the policy seed exists) |

Change (G-08): `gold.replan` sets every non-superseded plan of the line to `SUPERSEDED`, so an accepted plan loses `ACCEPTED`. On the dev DB, 6 plans have an ACCEPT decision (ids 5–10) but only plan 9 still says `ACCEPTED`. Target: `status` ∈ `PROPOSED`, `SUPERSEDED`, `CURRENT_ACCEPTED`, `ACCEPTED_SUPERSEDED`, or keep the three values and read acceptance only from `plan_decision` via a view `gold.v_plan_status` (D-04).

#### `gold.schedule_entry` — BUILT (grain confirmed)

| Item | Value |
| --- | --- |
| Grain | One PO at one position in one plan |
| PK | `schedule_entry_id` |
| Business keys | (`schedule_plan_id`, `position`) UNIQUE · (`schedule_plan_id`, `process_order_id`) UNIQUE |
| FKs | `schedule_plan_id` → `gold.schedule_plan` ON DELETE CASCADE · `process_order_id` → `silver.process_order` · `line_schedule_item_id` → `silver.line_schedule_item` (nullable in DDL; 0 NULL rows in the dev DB) |
| Validated | No PO is open on two schedules today (0 rows), so the one-PO-per-plan grain holds. Across all statuses, 69 POs appear on more than one work center (routing Line → Gravity → Colorsort), so the grain is per line, and precedence between lines is not modelled (G-12, SQ-13) |

Recommendation: make `line_schedule_item_id` `NOT NULL`. Every entry is built from `v_open_queue`, which always has one.

#### `gold.entry_reason` — CHANGE (contract only)

| Item | Value |
| --- | --- |
| Grain | One reason on one plan entry, ordered by `seq` (seq 1 = `reasonShort`) |
| PK | `entry_reason_id` |
| Business key | (`schedule_entry_id`, `seq`) UNIQUE |
| FKs | `schedule_entry_id` → `gold.schedule_entry` ON DELETE CASCADE · `reason_code_id` → `gold.reason_code` |

Change: validate `params ?& reason_code.param_keys` in `gold.add_reason` (G-21).

#### `gold.plan_decision` — CHANGE

| Item | Value |
| --- | --- |
| Grain | One human decision on one plan |
| PK | `plan_decision_id` |
| Business key | none today. Add a partial unique (`schedule_plan_id`) WHERE `decision = 'ACCEPT'`: `accept_plan` can insert two ACCEPT rows for the same plan (G-20) |
| FKs | `schedule_plan_id` → `gold.schedule_plan` ON DELETE CASCADE |

Change: decisions are lost on every build, because only `raw.ingest_event` is replayed. Target: `raw.plan_decision_event` (`line_id`, `plan_version`, `decision`, `override_detail`, `decided_by`, `decided_at`, `comment`), replayed after the ingest events. This relies on the replay producing the same `plan_version` sequence, which holds as long as the replay order is `ingest_event_id` (D-04, G-01). `OVERRIDE`/`REJECT` are allowed by the CHECK but no code writes them, and `override_detail` has no schema yet (G-20).

---

## 4. Views (read model)

| View | Grain | Key | Status | Notes |
| --- | --- | --- | --- | --- |
| `v_throughput` | work center (`grain='WORK_CENTER'`) or work center × species (`'SPECIES'`) | (`work_center_id`, `grain`, `species_code`) | BUILT | Median input kg per run hour; runs with `run_h > 0` and `input_kg > 0` |
| `v_run_transition` | one logged run | `conditioning_run_id` | BUILT | `transition_code` vs the previous run on the same work center |
| `v_changeover_observed` | work center × transition | (`work_center_id`, `transition_code`) | BUILT | Seeds `changeover_rule` |
| `v_po_quality_status` | one PO with ≥ 1 test | `process_order_id` | BUILT | Any FAIL holds the PO (SQ-08) |
| `v_open_queue` | one open, non-duplicate schedule row (= PO × work center) | `line_schedule_item_id`; (`process_order_id`, `work_center_id`) unique by index | **CHANGE** | Add `is_not_ready`, `hold_reason` (`STATUS` \| `QA_FAIL` \| `NOT_READY` \| `NOTE_HOLD`), `fact_ids bigint[]`, `throughput_basis` (`SPECIES` \| `WORK_CENTER`), `has_kg` (G-06, G-10, G-11) |
| `v_note_reading_current` | one distinct note text | `note_hash` | NEW | Reading that counts (HUMAN > BEDROCK > RULE, latest) |
| `v_trusted_fact` | note occurrence × fact type | (`source_note_id`, `fact_type`) | NEW | §3.2 |
| `v_latest_plan` | one plan per line | `work_center_id` | BUILT | Highest `plan_version` |
| `v_plan_status` | one plan | `schedule_plan_id` | NEW (D-04) | Acceptance read from `plan_decision` |
| `v_plan_queue` | one plan entry | `schedule_entry_id` | BUILT | `queue_row` = BFF QueueRow JSON |
| `v_plan_diff` | one plan vs its parent | `schedule_plan_id` | BUILT | moves / held / added / removed / reasons |
| `v_order_risk` | one customer order × allocated PO | (`order_number`, `po_number`) | BUILT | Synthetic orders exist only for LSVLN1 (16 orders, 12 POs); LSVLN2's `due_date` is the schedule finish only (G-14) |
| `v_dq_summary` | table × source file × DQ code | (`table_name`, `source_csv`, `dq_code`) | BUILT | |

---

## 5. Functions affected

| Function | Status | Change |
| --- | --- | --- |
| `gold.replan(line, event)` | CHANGE | Read the active `policy` (record `policy_id`); exclude `is_not_ready`; write `NOT_READY_HOLD` / `NOTE_*` reasons and `entry_reason_fact` links; `THROUGHPUT_FALLBACK` reason. Policy v1 must reproduce today's order exactly (regression test against `tests/demo_scenario.sql`) |
| `gold.agent_context(plan, locale)` | CHANGE (built) | Adds `facts[]` (`factId`, `po`, `type`, `label`, `note`, `source`, `status`, `reader`, `confidence`), `constraints.policy` and `citable.factIds` |
| `gold.record_note_reading(...)` | NEW | Data API entry point that stores a `raw.note_reading` row (idempotent on its business key) and rebuilds `semantic_fact` for that hash |
| `gold.review_fact(...)` | NEW | Stores `raw.note_review`, rebuilds the status, writes `plan_event` `note_review` and replans |
| `gold.rebuild_semantic_facts()` | NEW | Build step: `source_note` from silver, `semantic_fact` = `source_note` ⋈ `raw.note_reading` (by `note_hash`), status from `raw.note_review` |
| `gold.read_notes_rules()` | NEW (D-03) | Deterministic `RULE` reader (`rules-v1`) for the demo, so the ranking doesn't depend on Bedrock being up |
| `gold.reset_demo(line)` | CHANGE (built) | Also voids `raw.note_review` rows for the line's open notes, then refreshes the facts |
| `gold.accept_plan(...)` | unchanged | Writing `raw.plan_decision_event` is deferred (D-08) |

---

## 6. Gap register

Severity: **H** = breaks the demo story or loses data · **M** = wrong numbers or a misleading explanation · **L** = hygiene / documentation.

| ID | Sev | Gap | Evidence | Resolution in this model |
| --- | --- | --- | --- | --- |
| G-01 | H | The proposal's durable data (human review, model output, policy versions) would live in gold, and gold is dropped on every build. `plan_decision` already loses accepted decisions on rebuild | `001_schemas.sql` `DROP SCHEMA gold CASCADE`; `40_baseline.sql` replays only `raw.ingest_event` | `raw.note_reading`, `raw.note_review`, `raw.plan_decision_event` (append-only, business keys); policy as a git seed |
| G-02 | H | `semantic_fact` grain is ambiguous: "one reading of one note" vs one row per source row; the unique key includes `fact_type`, so a re-read with a different type creates a second row instead of a no-op | `run_order_note` 560 rows / 72 distinct; `FUMIGATED` 94 rows | Split into `source_note` (occurrence), `raw.note_reading` (distinct text), `semantic_fact` (fact × occurrence) |
| G-03 | M | `source_table` + `source_row_id` points at different tables with no FK, and silver row ids change on every build | Identity PKs; schema dropped each build | Stable key (`source_csv`, `source_row_number`, `source_column`) + typed nullable FKs |
| G-04 | H | `policy.criteria` contradicts itself (order wins vs weights; `RUSH` last but weight 2.0); `replan` has a hard-coded `ORDER BY` and ignores the policy | Proposal §policy; `20_replan.sql` greedy `ORDER BY` | `ranking_mode`; criteria codes = current sort keys; policy v1 = heuristic-v1 |
| G-05 | L | `policy.hours_per_day` overlaps with the continuous replan clock; `heuristic_version` in `config` overlaps with `policy` | `20_replan.sql` adds run hours to a continuous clock | Keep 24 h (SQ-10); D-06 decides which keys move |
| G-06 | H | Facts never reach the hold logic or the Agent: `is_hold` only covers `ON_HOLD`/`LAB`/QA FAIL; `agent_context` has no notes; `is_rush` reads only the priority column (17 `RUSH` run-order notes ignored) | `10_views.sql` `is_hold`; LSVLN1 open: `Needs fumi!!` ×1, `Not fumi` ×2, `FUMIGATED` ×4, no note ×5; running PO `1002267630` is `Not fumi` | `v_trusted_fact` → `v_open_queue.is_not_ready`; `agent_context.facts` |
| G-07 | H | Derived changeover rules are not monotonic and have no trait dimension | 5 of 8 work centers break SAME_VARIETY ≤ SAME_SPECIES ≤ SPECIES_CHANGE (LSVCLSRT, LSVGRVTY, LSVLN1, SSVLN3, SSVLN5); LSVLN1 SAME_VARIETY 2.00 / SAME_SPECIES 3.50 / SPECIES_CHANGE 2.50 h; `TRAIT_CHANGE` 0 rows; LSVGRVTY open = EXCELIS 11, FRESH 4, NONE 2 | Reconciliation check; SME rows (SQ-11) |
| G-08 | M | `schedule_plan.status` is overwritten: an accepted plan becomes `SUPERSEDED` | 6 ACCEPT decisions (plans 5–10), 1 plan with status `ACCEPTED` (plan 9) | D-04: `v_plan_status` or extended status |
| G-09 | H | The BFF (`core-api/services/plantDemo/sapIngestDb.js` `insertCoispiPo`) writes `silver.process_order`, `silver.line_schedule_item` and `gold.plan_event` directly, with invented lineage and no `raw` record; rows are lost on rebuild, and the new PO has no material, lot or variety | POs `1002408120`, `1002509002`: `excel_sap_data.csv` rows 204–205 and `line_2_schedule.csv` rows 444–445, absent from raw | `raw.ingest_event` `sap_new_order` → `silver.apply_ingest_event` (D-05) |
| G-10 | M (latent) | SSV rows in `KS` have `input_kg` NULL, so `est_run_h` = 0 | 15 open rows (SSVLN5 14, SSVLN6 1); only LSVLN1/LSVLN2 are served (`demo_line_id`) | `has_kg` flag; SQ-26 before serving SSV lines |
| G-11 | L | Species without enough history silently use the work-center median | 8 open rows: LSVGRVTY PECO 1, SWPB 3; LSVLN2 SWTO 3; SSVLN6 TOCO 1 | `throughput_basis` + `THROUGHPUT_FALLBACK` reason |
| G-12 | M | Plans are per line; routing precedence between lines (Line → Gravity → Colorsort) is not modelled; `process_order_work_center` has no sequence | 69 POs on more than one schedule; 0 open on two at once | Out of scope for the demo; SQ-13 |
| G-13 | L | `process_order.work_center_id` is only set from SAP/routing; gold must take the line from `line_schedule_item` | 4,325 of 4,541 POs have NULL; 13 open rows where the SAP work center ≠ the schedule work center | Mapping rule: the schedule wins (S2T §4.9) |
| G-14 | M | `due_date = least(need_by, schedule finish)` mixes a synthetic commitment with the schedule date; synthetic orders cover LSVLN1 only | `v_open_queue`; need-by present on 12/12 LSVLN1 rows, 0/40 LSVLN2 | Keep; expose `due_date_basis`; SQ-02, SQ-14 |
| G-15 | L | The schedule row's lot differs from the PO lot | 4 rows | `v_open_queue` already prefers the schedule lot; add a DQ flag |
| G-16 | L | `output_batch_number` is not unique | 8 repeated values, 1 NULL | Already indexed, not unique (SQ-18) |
| G-17 | L | Variety domains differ: material variety vs log variety (`19B1101 T` vs `19B1101`) | 958 material varieties, 708 found in the logs | Changeover compares like with like today; add `variety_key` before joining across |
| G-18 | M | Most free text is not operational: `comments` repeats the SAP note | `comments = sap_notes` in 157/159 SAP rows | Semantic-engine scope order (§3.2) |
| G-19 | L | The proposal doc doesn't match the build: event case, `TRAIT_CHANGE`, missing objects (`queue_response`, `ingest`, `process_ingest_event`, `reset_demo`, `replay_ingest_events`, `v_run_transition`, `v_changeover_observed`, `v_dq_summary`, `cfg`, `resolve_line`, `est_kg_per_h`, `changeover_hours`, `add_reason`) | `005_gold_runtime.sql`, `30_api.sql` | This file supersedes the proposal's "already in gold" section |
| G-20 | L | `plan_decision` allows two ACCEPTs for one plan; `OVERRIDE`/`REJECT` are never written; `override_detail` has no schema | `accept_plan` | Partial unique; define `override_detail` when the UI needs it |
| G-21 | M | `entry_reason.params` is untyped; citable ids are found by key name | `agent_context` `cited` CTE | `reason_code.param_keys` + check in `add_reason` |

---

## 7. Planner v2 (built 2026-10-02)

**Why:** the semantic planner (Agent API) now owns the order, times, shift calendar, cleanouts, downtime, line swaps and repair ideas. The planner team asked gold to store its result as JSON and keep serving `event_response` / `agent_context` unchanged. The agreed middle point (decisions Q1–Q9, [WORKING-PLAN.md](./WORKING-PLAN.md) §6):
- The planner's contract is kept: JSON in, `gold.replan`, the same responses.
- Gold keeps the model typed: each new grain in the JSON also lands in a table with FKs to silver, inside the same `replan` call. The element is stored as sent too.
- Nothing that works today is replaced: the heuristic keeps policy v1 and its sort.

Applied to the shared dev RDS with `etl/build_model.py --upgrade-gold-planner-v2` (ALTER in place: gold is mock data; raw and silver untouched). A clean build produces the same model (`migrations/008_gold_planner_v2.sql`). Checks: gold v4 13/13, validation 153 checks with 0 FAIL, `tests/planner_scenario.sql` passes.

### 7.1 Changes to existing tables (additive)

| Table | Change | Why |
| --- | --- | --- |
| `plan_event` | `parent_plan_event_id` (self FK, ON DELETE SET NULL); event_type `planner_run` | Q1: a planner plan has its own event (event → plan stays 1:1) and points to the event it answers |
| `policy` | `engine` `HEURISTIC` \| `PLANNER` (default `HEURISTIC`); one ACTIVE per (line, engine); `gold.active_policy(wc, engine DEFAULT 'HEURISTIC')` | Q2: v1 keeps driving the heuristic; v2 (`PRIORITY`, `SPECIES_GROUP`, `SAP_FINISH`, basis ASSUMPTION pending SQ-02/SQ-04) is cited by planner plans |
| `schedule_entry` | `due_date_basis` `NEED_BY` \| `SCHEDULE_FINISH` \| `SAP_FINISH` | Q6: the heuristic and the planner measure lateness against different commitments; existing rows backfilled |
| `reason_code` | `OVERRIDE_HOLD`, `OVERRIDE_PIN` | Q3: the heuristic explains the overrides it applies |
| `config` | `season`; `planner_rules` (generated) | Q5a: `gold.cfg('planner_rules')` returns the planner's JSON, built from the tables in 7.2 |

### 7.2 New tables

| Table | Grain | PK / business key | FKs | Source |
| --- | --- | --- | --- | --- |
| `plan_override` | one override instruction on one PO (`LINE_SWAP`, `PIN_POSITION`, `FORCE_HOLD`) | `plan_override_id`; (`plan_event_id`, `element_seq`) | `plan_event` (cascade), `silver.process_order`, `from_/to_work_center_id` → `silver.work_center` | `payload.overrides[i]` + `override_json` |
| `line_downtime` | one downtime window on one line | `line_downtime_id`; (`plan_event_id`, `element_seq`) | `plan_event` (cascade), `silver.work_center` | `payload.downtime[i]` + `downtime_json` (the heuristic clock does not use it) |
| `repair_proposal` | one proposed repair route for one PO | `repair_proposal_id`; (`plan_event_id`, `element_seq`) | `plan_event` (cascade), `parent_process_order_id`, `quality_test_id` (the FAIL it answers), `fail_reason`, `route_work_center_id` | `payload.proposals[i]` + `proposal_json` |
| `fail_reason` | one QA fail code | `fail_reason_code` | — | the 9 silver codes (origin SILVER) + `FM`, `AP` (origin PLANNER, to confirm) |
| `trait_family` | one trait family | `trait_family_code` | — | EXCELIS, GMO, FRESH, NONE (SILVER) + `CERTIFIED_NON_GMO` (PLANNER, to confirm) |
| `work_center_calendar` | one line × ISO weekday × season | `work_center_calendar_id`; (`work_center_id`, `iso_weekday`, `season`) | `silver.work_center` | seed (LSVLN1/LSVLN2 Mon–Sat 00:00–24:00, HARVEST) |
| `sequence_rule` | one sequencing rule | `sequence_rule_id`; `rule_code` | `from_/to_trait_family_code` → `trait_family`, `work_center_id` | seed (cleanouts SPECIES_CHANGE, BEFORE_EXCELIS, AFTER_GMO; forbidden GMO → CERTIFIED_NON_GMO) |
| `repair_route` | one fail code → rework work center | `fail_reason_code` | `fail_reason`, `route_work_center_id` → `silver.work_center` | seed (DENT, DISCOLORED → LSVCLSRT; FM, AP → LSVGRVTY) |

Views: `gold.v_active_override` (one per PO × type, latest row, active only) and `gold.v_plan_impact` (one per plan: planned / hold / at-risk counts, newly late and no longer late on the same basis, late on a changed basis, moves, changeover hours vs parent, and the planner's `impact` claim). `v_open_queue` gains `swapped_to_work_center_id`, `swap_override_id`, `hold_override_id`, `override_hold_reason`, `pin_override_id`, `override_pinned_position` (appended), and `hold_reason` `OVERRIDE_HOLD`.

### 7.3 `gold.replan` behaviour

1. If the event already has a plan, return it (applies to every event).
2. `planner_run`: store `overrides`, `downtime` and `proposals` typed (unknown PO / line / route rejects the call). `payload` is never changed.
3. `payload.entries` present (only accepted on `planner_run`): new plan version with `created_by = 'planner-v2'` and the ACTIVE PLANNER policy. Entries are stored as sent, with three guards:
   - the schedule row belongs to the PO;
   - the row is on this line, or the PO has an active `LINE_SWAP` to it;
   - PLANNED has start ≤ end, and HOLD has no times.

   One failing entry rejects the whole plan. Reasons go through `add_reason` (codes and required params checked; `factIds` linked). `due_date_basis` defaults to `SAP_FINISH`.
4. No entries: the heuristic runs with policy v1, and respects active overrides:
   - a PO swapped away is not planned here;
   - `FORCE_HOLD` → HOLD (`OVERRIDE_HOLD`);
   - `PIN_POSITION` → that position (`OVERRIDE_PIN`), but the running batch stays first.

Not done, as agreed: no wrapper function (Q8a); `agent_context` unchanged (Q8b); the heuristic doesn't add POs swapped *into* its line (the planner plans those).

### 7.4 Open questions for the planner team

1. What do `FM` and `AP` mean (loaded as PLANNER codes to confirm)?
2. Is `CERTIFIED_NON_GMO` a real trait value, and how is it told apart from `NONE` in the schedules?
3. `COB` is the most frequent fail (263 tests) and has no repair route: on purpose?
4. Does `SPECIES_GROUP` mean same variety first, then same species (as in the heuristic)?
5. Does an override end at a date, or only when a later run sends `active: false`?
