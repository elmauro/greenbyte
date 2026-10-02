# UC1 gold model v4 — working plan

**Owner:** Data API (Camilo) · **Date:** 2026-10-01 (demo day 2026-10-02) · **Branch:** `gold-layer-schemas` (tracks `origin/gold-layer-schemas`, `master` merged in locally)
**Goal:** turn the gold-layer proposal ([`docs/hackathon/uc1-gold-engine-schema.md`](../../../../docs/hackathon/uc1-gold-engine-schema.md)) into a model with a verified source-to-target mapping. Every table must have a clear grain, its PK and FKs must match the medallion standard, and every gap must be named before any SQL is written.

| File | Content |
| --- | --- |
| [gold-data-model.md](./gold-data-model.md) | Target gold model: catalog (grain, PK, business key, FKs, lifecycle), views, functions, gap register G-01…G-21 |
| [source-to-target-mapping.md](./source-to-target-mapping.md) | Column-level silver → gold mapping, silver inventory and grain checks, rule-reader patterns, API projection, key/FK matrix |
| this file | Phases, tasks, decisions, validation, lifecycle |

---

## 1. Where we are

| Step | Status |
| --- | --- |
| Read the proposal and the gold layer as built on `master` | Done |
| Re-read the silver layer (migrations 003–004, transforms 05–40, seeds) | Done |
| Validate grain, keys and FKs on the dev RDS (read-only) | Done — results in S2T §2 |
| Source-to-target mapping for every gold table and view | Done (draft) |
| Target gold model + gap register | Done (draft) |
| Decisions D-01…D-09 | **Decided 2026-10-01** (§3) |
| Gold v4 built on the shared dev RDS (`--upgrade-gold-v4`) | **Done 2026-10-01**: 13 v4 checks pass, demo scenario passes, policy-v1 regression = heuristic-v1, backend Jest 30/30 |
| Feature package / story ID | **Not created**: next free ID is `GREENBYTE-006` (task 0.2) |

What the analysis found, in short:
1. **The proposal's new tables are sound in intent, but they hold durable data in a schema that is dropped on every build** (G-01). Readings, reviews and decisions must be stored in `raw`, append-only, and replayed.
2. **`semantic_fact` has two grains** (G-02). It is split into `source_note` (where a note appears), `raw.note_reading` (one reading per distinct text) and `semantic_fact` (fact × occurrence).
3. **The policy's `criteria` contradicts itself** (G-04). Policy v1 must reproduce today's `replan` sort order exactly before any weights are introduced.
4. **Facts don't reach the queue yet** (G-06). Fumigation status (`Needs fumi!!`, `Not fumi`, `NOT FUMIGATED`) is the clearest demo win (SQ-01), but the running batch on Line 1 is itself `Not fumi`, so `ONLINE` must stay first.
5. **Two existing defects hit the demo story:** the derived changeover hours are not monotonic (G-07: on Line 1, same species 3.5 h > species change 2.5 h), and the BFF writes new POs straight into silver with invented lineage (G-09).

---

## 2. Phases and tasks

Effort: S ≤ 2 h · M ≤ ½ day · L > ½ day. Owners: **DA** = Data API (Camilo) · **AG** = Agent API (David) · **BFF** = UI + BFF (Mauricio) · **PA** = proposal author (commit `9375b41`).

### Phase 0 — Agree the model (today, before any SQL)

| # | Task | Owner | Effort | Output |
| --- | --- | --- | --- | --- |
| 0.1 | Review gold-data-model + S2T with PA and AG; resolve D-01…D-06 (§3) | DA, PA, AG | S | Decisions recorded in §3 |
| 0.2 | Register the story: `node cursor/scripts/new-feature.mjs --name "UC1 gold model v4 (semantic facts + policy)" --area backend` (assigns `GREENBYTE-006`), then create the feature package `cursor/analysis/features/backend/uc1-gold-model-v4/` and link these three files from `analysis.md` | DA | S | Registry row, STORY-LOG entry |
| 0.3 | Mark the "Already in gold" section of the proposal doc as superseded by gold-data-model.md, and fix its event-type casing (G-19) | PA | S | Doc PR |
| 0.4 | Correct SQ-01 in `backend/data-model/uc1-open-questions.md`. The open Line 1 queue has **4** `FUMIGATED` rows, not 5 (4 FUMIGATED · 2 Not fumi · 1 Needs fumi!! · 5 no note) | DA | S | Doc fix |

### Phase 1 — Demo-critical: fumigation as a typed, cited fact (target: before demo day)

Smallest slice that changes the demo story. It is fully deterministic (rule reader), so it doesn't depend on Bedrock.

| # | Task | Owner | Effort | Maps to |
| --- | --- | --- | --- | --- |
| 1.1 | Migration `006_semantic.sql`: `raw.note_reading`, `raw.note_review` (`CREATE TABLE IF NOT EXISTS`, outside the dropped schemas); `gold.source_note`, `gold.semantic_fact`, `gold.entry_reason_fact` | DA | M | model §3.2 |
| 1.2 | `etl/transforms/gold/15_semantic.sql`: build `source_note` (schedule operational notes first), `gold.read_notes_rules()` (`rules-v1`, all rules evaluated), `semantic_fact`, `v_trusted_fact` | DA | M | S2T §5 |
| 1.3 | `v_open_queue`: add `is_not_ready`, `hold_reason`, `fact_ids`; run-order `RUSH` notes feed `is_rush` through facts; **ONLINE is never held by a fact** | DA | S | S2T §4.3 |
| 1.4 | Seed reason codes `NOT_READY_HOLD`, `NOTE_HOLD`, `NOTE_RUSH`; `replan` writes them plus `entry_reason_fact` | DA | M | S2T §6.4–6.5 |
| 1.5 | `agent_context`: `facts[]`, `constraints.policy` and `citable.factIds` | DA → AG | S | S2T §7 |
| 1.6 | Tests: extend `tests/reconciliation.sql` (§4) and `tests/demo_scenario.sql` (Line 1 baseline: `1002266889` and `1002266913` move to HOLD as NOT_READY; `1002267630` stays position 1) | DA | S | §4 |
| 1.7 | BFF/MSW: show `NOT_READY_HOLD` reason text; update the MSW handler and the Cypress expectation for the Line 1 baseline | BFF | S | contract |

Exit criteria: build + reconciliation green on the dev RDS; `queue_response('line-1')` shows the not-ready batches on hold with a reason that cites the note; `agent_context` lists the facts.

**Demo risk to accept or fix:** a full rebuild (`build_model.py` without flags) drops the POs added through the BFF "new PO" button, all accept decisions (G-01, G-09) and the `*_legacy` tables. Do not run it on the demo database after rehearsals start; use `gold.reset_demo` per line.

### Phase 2 — Durability and policy (after the demo)

| # | Task | Owner | Effort | Maps to |
| --- | --- | --- | --- | --- |
| 2.1 | `gold.policy` + `seeds/gold_policy.sql` (v1 = heuristic-v1, `LEXICOGRAPHIC`); `schedule_plan.policy_id` | DA | M | model §3.1 |
| 2.2 | Refactor `replan` to build its sort from `policy.criteria`. Regression: plans identical to heuristic-v1 for both demo lines | DA | L | S2T §6.3 |
| 2.3 | `raw.plan_decision_event` + replay after ingest; partial unique ACCEPT; plan status per D-04 (`v_plan_status`) | DA | M | G-01, G-08, G-20 |
| 2.4 | New PO through `raw.ingest_event` (`sap_new_order`) in `silver.apply_ingest_event`; replace the BFF's direct silver/gold inserts (`sapIngestDb.js` `insertCoispiPo`) with a Data API call | DA, BFF | M | G-09, D-05 |
| 2.5 | `gold.review_fact` + `plan_event` `note_review` + UI confirm/reject for `NEEDS_CONFIRMATION` facts | DA, BFF | M | model §3.2 |
| 2.6 | Bedrock reader: the Agent API returns `facts[]` per distinct note; the Data API stores them via `gold.record_note_reading` | AG, DA | M | D-03 |
| 2.7 | Constraints: `plan_event.ingest_event_id` UNIQUE, `schedule_entry.line_schedule_item_id` NOT NULL, `reason_code.param_keys` check in `add_reason` | DA | S | G-20, G-21 |
| 2.8 | `v_open_queue`: `due_date_basis`, `throughput_basis`, `has_kg`; reason `THROUGHPUT_FALLBACK` | DA | S | G-10, G-11, G-14 |

### Phase 3 — Needs Syngenta answers

| # | Task | Blocked by | Maps to |
| --- | --- | --- | --- |
| 3.1 | Changeover: attribute cleandown to the transition *into the next run*; `TRAIT_CHANGE` rows; SME overrides | SQ-11 | G-07 |
| 3.2 | Fumigation lead time / release time as a `NOT_READY` until-date | SQ-01 | G-06 |
| 3.3 | Seed-in-plant (`NOT_READY` when there is no lot / receipt) | SQ-07 | — |
| 3.4 | SSV `KS` → kg conversion before serving SSV lines | SQ-26 | G-10 |
| 3.5 | Cross-line routing precedence (Line → Gravity → Colorsort) | SQ-13 | G-12 |
| 3.6 | Shift calendar → `policy.hours_per_day` / calendar | SQ-10 | G-05 |

---

## 3. Decisions (resolved 2026-10-01)

| ID | Decision | Outcome | Consequence in the build |
| --- | --- | --- | --- |
| D-01 | Where human/model input lives | **Append-only tables in `raw`** | `raw.note_reading`, `raw.note_review` (`migrations/006_raw_note_curation.sql`); keyed by `note_hash` / `po_number`, never by silver/gold ids |
| D-02 | How the policy ranks | **LEXICOGRAPHIC v1** (= heuristic-v1 order); WEIGHTED later | `gold.policy_order_by` builds the greedy ORDER BY from `criteria`; WEIGHTED raises `feature_not_supported`; regression proven equal on Line 1 |
| D-03 | Who reads notes | **Rules now, Bedrock later** | `gold.rules_v1_facts` / `gold.read_notes_rules` in every build; `gold.record_note_reading` is the entry point for Bedrock or a person (still: ask PA what `JEV` means) |
| D-04 | Plan acceptance state | **Keep 3 statuses + `gold.v_plan_status`** | `v_plan_status.is_accepted / accepted_at / is_current_accepted` from `plan_decision` |
| D-05 | New PO from the "COISPI refresh" | **Keep the current BFF insert** | `sapIngestDb.js insertCoispiPo` unchanged; G-09 stays open: those rows fail 6 reconciliation checks and vanish on a full build |
| D-06 | Policy vs config | **Policy owns ranking** | `policy`: ranking_mode, criteria, fact_min_confidence, hours_per_day; `config` unchanged |
| D-07 | Effect of a trusted NOT_READY fact | **Hold it, except the running batch** | `v_open_queue.is_hold`; reasons `NOT_READY_HOLD` (held) and `NOT_READY_WARNING` (ONLINE kept first) |
| D-08 | Scope now | **Phase 1 + policy-driven replan + hardening** (not decision durability) | `raw.plan_decision_event`, decision replay and the ACCEPT partial unique are deferred |
| D-09 | How to apply | **Shared dev DB, in place**: no drops in raw/silver; changed tables → `*_legacy` with a reason comment; gold may be dropped/recreated | `etl/build_model.py --upgrade-gold-v4` + `upgrades/2026-10-01_gold_v4_legacy.sql`; 6 gold tables kept as `_legacy`; no `_complement` table was needed (no silver table changed, gold tables were replaced, not extended) |

### 3.1 Task status after the build

| Task | Status |
| --- | --- |
| 1.1–1.6 | Done (1.6: `tests/gold_v4_checks.sql` 13 checks + `tests/demo_scenario.sql` updated) |
| 1.7 BFF/MSW/Cypress: show the new reasons, mocks for the Line 1 baseline with 2 NOT_READY holds | **Open** (BFF owner): live mode already returns them; MSW mocks still show the v3 baseline |
| 2.1, 2.2 policy + policy-driven replan | Done |
| 2.3 decision durability | Deferred (D-08); `v_plan_status` built |
| 2.4 new PO via `raw.ingest_event` | Not doing (D-05) |
| 2.5 `gold.review_fact` | Done in SQL; UI open |
| 2.6 Bedrock reader | `gold.record_note_reading` done; Agent API side open |
| 2.7 constraints | Done, except the ACCEPT partial unique (deferred with 2.3) |
| 2.8 `due_date_basis`, `throughput_basis`, `has_kg`, `THROUGHPUT_FALLBACK` | Done |
| 0.2 feature package, 0.3 proposal doc, 0.4 SQ-01 count | Open |

## 4. Validation plan

New checks for `tests/reconciliation.sql` (each fails the build):

| Check | Expectation |
| --- | --- |
| `source_note` business key | No duplicate (`source_csv`, `source_row_number`, `source_column`) |
| `source_note` coverage | Schedule operational notes = 899 cells (560 + 336 + 3) on the current extract |
| Every distinct `note_hash` has a `rules-v1` reading | 0 missing |
| `semantic_fact` → `source_note` and → `raw.note_reading` | 0 orphans |
| `v_trusted_fact` grain | unique (`process_order_id`, `fact_type`) |
| ONLINE never HOLD | 0 `schedule_entry` rows with HOLD whose schedule status is `ONLINE` |
| Fact reasons cite facts | every `NOT_READY_HOLD` / `NOTE_*` reason has ≥ 1 `entry_reason_fact` |
| Changeover monotonic (warning, not failure, until SQ-11) | `SAME_VARIETY ≤ SAME_SPECIES ≤ SPECIES_CHANGE` per work center; today 5 of 8 fail: LSVCLSRT, LSVGRVTY, LSVLN1, SSVLN3, SSVLN5 (`tests/gold_v4_validation.sql`) |
| silver lineage | every silver fact row with `source_csv` ≠ `raw.ingest_event` exists in its raw table (catches G-09) |
| policy | exactly one ACTIVE policy resolves for every `demo_line_id` |

Demo scenario (`tests/demo_scenario.sql`): baseline Line 1 with facts → `1002267630` position 1 with an extra `NOT_READY` reason. `1002266889` (`Needs fumi!!`) and `1002266913` (`Not fumi`) are HOLD `NOT_READY_HOLD`. The rush scenario on `1002295402` is unchanged.

---

## 5. Lifecycle and close

- Gates: `node cursor/scripts/run-feature-gates.mjs` between phases.
- On close: feature manifest, `cursor/analysis/features/INDEX.md`, `cursor/company/future-work/backend/STORY-LOG.md`, `STORY-REGISTRY.md`.
- Docs to update when Phase 1 lands: `backend/data-model/uc1-data-model.md` §5.6 (gold objects) and §7.1 (heuristic), `backend/database/README.md` (build steps), `backend/docs/api/` examples (`agent_context` facts, new reason codes).

---

## 6. Planner v2 decisions (2026-10-02)

Request: lean gold handoff for the semantic planner (planner team). Team rules applied:
1. If the ask breaks current logic, propose a version that fits the model.
2. If it can be accommodated, add columns without changing existing ones.
3. A new grain gets a new table.
4. Silver stays the source of truth.

| ID | Decision | Outcome |
| --- | --- | --- |
| Q1 | Which event a planner plan belongs to | Own `planner_run` event (+ `parent_plan_event_id`); one plan per event; a repeat call returns the saved plan |
| Q2 | Policy v2 vs the heuristic | Additive `policy.engine`; v1 HEURISTIC stays ACTIVE, v2 PLANNER ACTIVE |
| Q3 | Overrides / line swap | One table `plan_override` (typed + `override_json`; LINE_SWAP, PIN_POSITION, FORCE_HOLD); the heuristic respects them |
| Q4a | Downtime | `line_downtime`, planner-only (heuristic clock unchanged) |
| Q4b | Repair proposals | `repair_proposal`, aligned to silver PO / QA test / work center |
| Q4c | Impact | JSON in the payload + derived `v_plan_impact` |
| Q5a | `planner_rules` | Typed tables (`work_center_calendar`, `sequence_rule`, `repair_route`); config JSON generated from them |
| Q5b | `FM`, `AP`, `CERTIFIED_NON_GMO` | Gold reference domains `fail_reason` / `trait_family` with origin SILVER / PLANNER; silver untouched |
| Q6 | `due_date` meaning | `schedule_entry.due_date_basis`; planner default SAP_FINISH; old rows backfilled |
| Q7 | Planner output checks | 3 guards; one bad entry rejects the plan; heuristic-only validation checks scoped, planner checks added |
| Q8 | Entry point / Agent context | No wrapper (INSERT event + `replan` + `event_response` in one transaction); `agent_context` unchanged |
| Q9 | Delivery | ALTER in place + mirror in the repo; v2 criteria stored as ASSUMPTION; same branch `gold-layer-schemas` |

Built and applied 2026-10-02 (`--upgrade-gold-planner-v2`). Open questions for the planner team: gold-data-model §7.4.

## 7. Demo date shift decisions (GREENBYTE-017, 2026-10-02)

Request (Data API owner): the dates in the data are already in the past, and the demo shows delivery dates live. Move the scheduled finish dates forward in gold without breaking any key relation.

| ID | Decision | Outcome |
| --- | --- | --- |
| DT-1 | Where to apply | In **silver**, not as an `UPDATE` on gold: the finish date lives in `silver.line_schedule_item`, and gold is dropped and rebuilt on every build (G-01). raw and the CSVs are untouched |
| DT-2 | Clock vs dates (option C) | Clock moves to demo day (`silver.demo_as_of()` = 2026-10-02). Dates move just enough to keep a few orders tight. The first request was +2 months, but that would leave nothing at risk |
| DT-3 | Shift size | **+7 days** (`silver.demo_date_shift_days()`), chosen from the CSV simulation: 8 of 153 open rows overdue, 20 due within 3 days, none on Line 1 at day 0 |
| DT-4 | Scope | All lines; all commitment dates: scheduled finish, original finish, SAP finish (the planner's lateness basis). The need-by date follows |
| DT-5 | Not shifted | run / test history, audit timestamps, live ingest and SAP-batch dates, and DQ-15 (measured on the source date, still 103) |
| DT-6 | Apply | Full `build_model.py` on the dev RDS + `--reset-demo` per demo line. **Applied 2026-10-02** to the dev RDS: full build (reconciliation 61/61, gold v4 13/13) + `--reset-demo line-1` |

Follow-ups: the MSW mocks and BFF fallbacks (`frontend/src/demo/plant/*`, `backend/core-api/services/plantDemo/{constants,pascoLine1Baseline,customerOrderMeta}.js`) still carry dates from the old clock. Refresh them from the rebuilt `queue_response` (UI/BFF owner).

