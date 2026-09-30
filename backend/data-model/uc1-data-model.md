# UC1 data model — Pasco conditioning (batch allocation)

**Owner:** Data API (Camilo) · **Status:** v2 (2026-09-30) · **Use case:** UC1 Plant Capacity Utilization
**Sources:** `Hackathon 2026 - Use Cases/Hackathon 2026-UseCases/UC1 - Plant Capacity Utilization/` (workbooks) and its `data_sources/` (CSVs)
**Related:** [csv-to-raw-integration.md](./csv-to-raw-integration.md) (what is built) · [observations.md](../../Hackathon%202026%20-%20Use%20Cases/Hackathon%202026-UseCases/UC1%20-%20Plant%20Capacity%20Utilization/data_sources/observations.md) (column mapping, DQ catalog) · [syngenta-demo-architecture.md](../../docs/hackathon/syngenta-demo-architecture.md) §7 · [uc1-mvp-scope.md](../../docs/hackathon/uc1-mvp-scope.md)

This document describes the source extracts, the core entities for batch allocation (sequencing), and the PostgreSQL model that the Data API serves. The **raw layer is built and loaded**; `ref`, `ops` and `plan` are designed here and not yet implemented.

| Version | Date | Change |
| --- | --- | --- |
| v1 | 2026-09-29 | First model from workbook profiling (`docs/hackathon/uc1-data-model.md`) |
| v2 | 2026-09-30 | Moved to `backend/data-model/`. Added the key standard (surrogate PKs + business keys + lineage), `line_schedule_item`, `process_order_source`, `process_order_work_center`, the raw layer as built, transcribed sources, corrected DQ counts, and consolidated open questions |

---

## 1. What UC1 needs from data

From the Syngenta brief: *take a batch list, plant capacity and open customer orders, and return a ranked conditioning schedule with a stated reason for each position; re-sequence live when a rush batch or failed QA test is injected.* The output is a **recommendation with an explanation**, validated by a human, not an optimal schedule.

| Brief input | Found in extracts? | Source (raw table) |
| --- | --- | --- |
| Batch list (species, variety, qty, size, arrival) | Yes, partial | `raw.excel_sap_data`, `raw.line_*_schedule` |
| Plant capacity (lines, throughput) | Derivable | `raw.resource_info` + `raw.lsv_conditioning_logs`; cross-check `raw.large_seed_conditioning_throughput` (transcribed) |
| Processing steps and durations | Derivable | Conditioning logs (prep / run / cleandown hours) |
| Changeover rules by variety | Derivable (heuristic) | Line 1 log sequence (§4.3) |
| Pass/fail test results | Yes | `raw.lsv_pass_fail_log` |
| **Open customer orders** | **No** | Must be **synthesized** (§6) |
| Arrival date | No | Assume "in plant" for open POs |

Out of scope (per brief): treat/pack stage (`Treatpack`, `Packaging Rates`), Seed Health, other facilities, sensor data.

---

## 2. Sources

### 2.1 Workbooks and how they are produced today

- **Pasco** = `Pasco LSV and SSV Conditioning sheets and data.xlsx` (16 tabs), the main extract.
- **Worksheet** = `Worksheet in Pasco LSV and SSV Conditioning sheets and data.xlsx` (16 tabs), the "refresh" workbook embedded in Pasco's `Schedule Updating` tab. Its cell values are identical to the embedded copy.

Process: `SAP COISPI report` (active, non-complete conditioning POs) → pasted into **Worksheet › Main** → Power Query splits rows per work center (`LSV Line 1`, …) → manual check → **Smartsheet Data Shuttle** updates the per-line schedules (**Pasco › `Line N Schedule`**). The scheduler then sets `Run Order` / `Priority` by hand.

### 2.2 CSV extracts (40 files in `data_sources/`)

| Provenance | Files | Rows | Trust |
| --- | --- | --- | --- |
| `xlsx_export` | 32: one per tab, stored cell values, CSV record N = Excel row N | 12,269 | **Verified**: 216,638 cells compared with an independent Excel reader, 0 differences |
| `manual_transcription` | 8: `sap_order_headers`, `sap_order_components`, `data_shuttle_workflow`, `large/small_seed_conditioning_throughput`, `packaging_rates_s60/s660/ssv_target_rate` | 219 | Typed from **images** in the workbooks (SAP screenshot, Data Shuttle UI, throughput cards, rate tables). Plausible but not cell-verifiable (§4.2 cross-check) |

### 2.3 Tabs by UC1 role

| Tab (raw table) | Rows | Grain | UC1 role |
| --- | --- | --- | --- |
| **Excel SAP data** (`excel_sap_data`) | 202 | 1 row / open PO | **Open work** (all `NEW`); `main` is byte-identical |
| **Line 1 Schedule** (`line_1_schedule`) | 476 | 1 row / PO on LSV Line 1 | **Primary UC1 queue + history** (2023-06 → 2026-11); **12 open POs** (7 NEW · 4 RELEASED · 1 ONLINE) |
| Line 2 / Gravity / Colorsort Schedule | 442 / 917 / 406 | 1 row / PO on that work center | LSV history; POs move between them |
| **LSV Conditioning Logs** (`lsv_conditioning_logs`) | 1,899 | 1 row / logged run | **Throughput, loss, prep/cleandown times** |
| **LSV Pass_Fail Log** (`lsv_pass_fail_log`) | 3,142 | 1 row / output batch | **QA results**: Pass 2,293 · Fail 812 · blank 37 |
| Line 3 / 5 / 6 Schedule, SSV Conditioning Logs | 276 / 1,066 / 484 / 2,230 | as above | SSV lines (Phase 2) |
| **Resource Info** (`resource_info`) | 31 | 1 row / work center | **Work-center master** |
| Components (`components`) | 214 | PO → resource | Routing (header on row 2) |
| Worksheet slices (`lsv_line_1`, `lsv_line_2`, `lsv_gravity`, `ssv_line_3/5/6`, `seed_health`) | 15 / 40 / 22 / 16 / 42 / 24 / 43 | slices of Main | Reconciliation only (sum = 202) |
| Treatpack, Colorsort, SSV Line 7 slices | 0 | header only | Empty |
| Packaging Rates, Sheet1, Schedule Updating, Large/Small Seed Conditioning | — | layouts / notes | Not modelled (out of scope or notes) |

### 2.4 Domain codes decoded (inferred; open questions in §9)

| Code | Meaning |
| --- | --- |
| Species `SWCO` / `SWBS` | Sweet corn: `CO` = commercial, `BS` = basic/stock seed. Same pattern: `PECO` pea, `BECO` bean, `WACO` watermelon, `SQCO` squash, `CACO` capsicum, `TOCO` tomato, `CUCO` cucumber, `MECO` melon, `BRCO` broccoli, `CFCO` cauliflower, `WCCO` Chinese cabbage; `CAME` camelina |
| Material description | `<SPECIES> <VARIETY…> [<TYPE>] <STATE> ZZZ BK <UOM>`, e.g. `SWCO GSS3951 CRS CLX ZZZ BK KG` gives variety `GSS3951`, type `CRS`, state `CLX`. 24 of 1,118 descriptions are off-grammar |
| State | `RAW` (field run) → `RDY` (ready); `CLX`, `CLD`, `RDX`, `RDF`, `RDH`, `PMD` = treatment/finish variants |
| UOM | `KG`; `KS` = thousand seeds (small seed) |
| Size fraction | `L`/`M` × `R`/`F` (Large/Medium × Round/Flat), `U`/`UN` undersize, suffix `H`/`L` heavy/light |
| PO number | `100…`/`240…` (10 digits), `300…`/`120…`/`100028…` (9 digits). `150…` in a PO column is a **lot**; `Off System` / `BAYER n` are placeholders |
| Trait family | `EXCELIS` / `GMO` / `FRESH` / none: a changeover and segregation constraint |
| Notes / comments | Routing text (`SWCO RAX-CLX SUP INT Ln1`) or instructions (`RUSH`, `Please rework for failed AP`) |

---

## 3. Data quality: what shapes the model

The full catalog (24 issues, with counts and Excel rows) and the column-by-column mapping are in [observations.md](../../Hackathon%202026%20-%20Use%20Cases/Hackathon%202026-UseCases/UC1%20-%20Plant%20Capacity%20Utilization/data_sources/observations.md) §7–§8. The findings that change the **model** (not just the ETL):

| Finding | Evidence | Model decision |
| --- | --- | --- |
| PO number is the shared join key but **not a clean key** | Placeholders (`Off System` ×12, `BAYER 1–4`), lot numbers in the PO column (69 rows), leading zeros (98), typos (8) | Surrogate `process_order_id`; `po_number` = normalized business key (nullable, partial unique index); `po_number_raw` always kept |
| **POs move between work centers** | Gravity ∩ Colorsort 28 POs, Line 5 ∩ Line 6 25, Line 3 ∩ Line 6 14, … | New `line_schedule_item` (PO × work center), separate from `process_order` |
| Logs and QA have **no natural key** | Even (PO, equipment, date, lot, size, kg) repeats; 15 full-duplicate rows | Surrogate PK + lineage (`source_csv`, `source_row_number`) as identity |
| A lot has many POs | 345 lots with more than one PO | `lot` is its own entity; PO → lot N:1 |
| Status can disagree between SAP and the schedule | 3 of 15 `LSVLN1` POs: `NEW` in SAP, `COMPLETE` on the schedule | Status lives on `line_schedule_item`; SAP status kept as `sap_status` |
| Overdue "open" POs | 103 of 202 SAP POs finish before 2026-09-28 | Not an error: the **at-risk signal** for ranking |
| Derived columns are unreliable | `#DIVIDE BY ZERO` / `#INVALID OPERATION` in 26 cells (all in rate/difference columns); helper columns | Never migrate rates or loss %: recompute in views |

Join health (good): 453 of 470 Line 1 POs have a conditioning log; 1,850 of 1,888 logged LSV POs have QA rows; all 12 open Line 1 POs are in SAP.

---

## 4. Conceptual model

### 4.1 Core entities

```text
                 ┌──────────────┐
                 │   Species    │  SWCO, PECO, BECO …
                 └──────┬───────┘
                        │1:N
                 ┌──────▼───────┐        ┌───────────────┐
                 │   Material   │◄───────┤ CustomerOrder │  (synthetic)
                 │ variety+state│  N:1   │  need by date │
                 └──────┬───────┘        └───────┬───────┘
                        │1:N                     │ N:M (OrderAllocation)
 ┌────────────┐  ┌──────▼───────┐                │
 │ WorkCenter │◄─┤ ProcessOrder │◄───────────────┘
 │ (LSVLN1 …) │  │ (PO = batch) ├──────────────►┌──────────┐
 └──┬───▲─────┘  └──┬───┬───┬───┘      N:1     │   Lot    │ physical seed lot
    │   │           │   │   │                  └──────────┘
    │   │  1:N ┌────▼───┴┐  │1:N
    │   └──────┤LineSched│  │  ┌──────────────────┐   ┌──────────────┐
    │          │uleItem  │  ├─►│ ConditioningRun  │   │ QualityTest  │◄─┐
    │          │(PO × WC)│  │  │ prep/run/clean   │   │ per output   │  │
    │          └─────────┘  │  └──────────────────┘   │ batch        │  │
    │                       └─────────────────────────►└──────────────┘  │
    │1:N                                                                  │
 ┌──▼───────────────┐   1:N  ┌───────────────┐  1:N ┌──────────────┐     │
 │  SchedulePlan    ├───────►│ ScheduleEntry ├─────►│ EntryReason  │─────┘ cites
 │ (versioned)      │        │ position, eta │      │ code+params  │  PO/lot/test ids
 └─────┬────────────┘        └───────────────┘      └──────────────┘
       │ triggered by / decided by
 ┌─────▼────────────┐        ┌───────────────┐
 │   PlanEvent      │        │ PlanDecision  │  human accept / override
 │ rush, qa_fail    │        │ (audit)       │
 └──────────────────┘        └───────────────┘
```

**Key design ideas**

1. **ProcessOrder (PO) is the batch**: the unit the scheduler sequences. It has one row per PO; where it sits on each line is a **LineScheduleItem**.
2. **Lot is separate from PO.** One lot can have several POs (first pass, rework, size splits). QA failures attach to the lot/output batch and propagate to the POs that depend on it.
3. **Reference vs facts vs decisions.** Reference data (`ref`) is loaded once. Operational facts (`ops`) come from the extracts. Decisions (`plan`) are the only tables written at runtime.
4. **Plans are immutable and versioned.** Every re-sequence creates `schedule_plan` v+1, so the diff and the "why it changed" story come from comparing two versions. This matches `planVersion` / `diff.moves[]` in the frontend contract.
5. **Reasons are data, not prose.** Each entry stores reason codes plus parameters (e.g. `DUE_DATE_RISK {slack_days: -2}`). The Agent API turns them into plain language and cites stable IDs.
6. **Capacity is derived, not typed in.** Throughput and changeover durations are views over the conditioning logs (SAP `Hours`/`Capacity` are empty).
7. **Every row traces to Excel.** Lineage columns point to the CSV record, which is the Excel row, and file hashes pin the source version.

### 4.2 Capacity model (derived from logs)

Median values from `raw.lsv_conditioning_logs` (all years):

| Work center | kg/h (run) | kg/h (incl. prep+clean) | Scrap rate | Prep h | Cleandown h |
| --- | --- | --- | --- | --- | --- |
| **Line 1** | **1,114** | 874 | 19 % | 1.00 | 1.50 |
| Line 2 | 274 | 175 | 25 % | 0.50 | 1.50 |
| Gravity | 434 | 358 | 9 % | 0.25 | 0.25 |
| Colorsorter | 227 | 161 | 5 % | 0.25 | 0.50 |

Line 1 by species (median kg/h): PECO 1,341 · SWCO 1,085 · BECO 930 · SWBS 656 · SWTO 1,845. So **run duration = input kg / kg/h(line, species)**.

**Cross-check with the transcribed 2026 dashboard cards** (`raw.large_seed_conditioning_throughput`, mean values):

| | Card | 2026 log mean |
| --- | --- | --- |
| Line 1 kg/h / scrap | 1,378 / 0.23 | 1,439 / 0.217 |
| Line 2 kg/h / scrap | 446 / 0.28 | 388 / 0.285 |

They agree in magnitude (the card's snapshot date is unknown). For ranking, use **medians over the logs**: they're robust to outliers and reproducible.

### 4.3 Changeover rule (derived from the Line 1 run sequence)

| Transition (vs previous run) | Median prep h | Median cleandown h | n |
| --- | --- | --- | --- |
| Same variety | 0.92 | **0.50** | 199 |
| Same species, different variety | 1.50 | **2.25** | 214 |
| Species change | 1.50 | 1.29 | 48 |

**Heuristic v1:** a variety change costs about **+1.75 h** of cleandown compared with a same-variety run. This backs the "group same variety, limit changeover" reason. The trait-family penalty (moving between Excelis, GMO and Fresh) needs to be validated with Syngenta.

---

## 5. Logical model (PostgreSQL)

### 5.1 Layers

| Schema | Purpose | Written by | Status |
| --- | --- | --- | --- |
| `raw` | 1:1 copy of each CSV, all `text` | `backend/database/etl/load_raw.py` | ✅ **Loaded** (load_id 1, 40 tables, 12,488 rows, verified) |
| `ref` | Reference/master data | ETL + manual seeds | Designed |
| `ops` | Typed, standardized operational facts | ETL (SQL from `raw`) | Designed |
| `plan` | Scheduling decisions and audit trail | Data API at runtime | Designed |

Derived metrics live in views (`ops.v_*`), never in columns.

### 5.2 Key and column standard (applies to `ref`, `ops`, `plan`)

- **PK:** `<table>_id bigint GENERATED ALWAYS AS IDENTITY`. FKs are named after the referenced PK.
- **Business key:** `UNIQUE` on the normalized natural key (`po_number`, `lot_number`, `work_center_code`, `material_description`, …).
- **Lineage on every `ops` row:** `source_csv`, `source_row_number`, `source_file_sha256`, `load_id`, plus `dq_flags text[]` (codes DQ-01…DQ-24).
- **Naming:** snake_case, singular tables. Suffixes `_code`, `_number` (ID kept as text), `_kg`, `_qty` + `uom_code`, `_h`, `_fraction` (0–1), `_date`, `_at`, `is_`/`has_`, `_raw` (original value).
- Full conventions: [csv-to-raw-integration.md](./csv-to-raw-integration.md) §4 and observations §5.

### 5.3 `ref`

```sql
ref.species         (species_id PK, species_code UNIQUE, crop_name, seed_class /* CO|BS */, seed_size /* LSV|SSV */)
ref.material        (material_id PK, material_description UNIQUE, species_id FK, variety_code, type_code,
                     state_code, uom_code, material_note, is_parsed bool)
ref.work_center     (work_center_id PK, work_center_code UNIQUE /* LSVLN1 */, work_center_name, department,
                     line_type /* LINE|GRAVITY|COLORSORT|REPAIR|SEED_HEALTH|TREATPACK|TREATING */, is_in_scope bool)
ref.equipment_alias (equipment_alias_id PK, source_csv, alias, work_center_id FK, is_confirmed bool,
                     UNIQUE (source_csv, alias))
ref.changeover_rule (changeover_rule_id PK, work_center_id FK, transition_code
                     /* SAME_VARIETY|SAME_SPECIES|SPECIES_CHANGE|TRAIT_CHANGE */, hours numeric(6,2),
                     rule_source /* DERIVED|SME */, derived_n int, UNIQUE (work_center_id, transition_code))
ref.reason_code     (reason_code_id PK, reason_code UNIQUE, description, template /* Agent fallback */)
```

### 5.4 `ops`

```sql
ops.lot                  (lot_id PK, lot_number UNIQUE, species_id FK, crop_year smallint, crop_year_suffix text)

ops.process_order        (process_order_id PK, po_number text /* UNIQUE WHERE NOT NULL */, po_number_raw text,
                          po_number_status /* VALID|NORMALIZED|NOT_A_PO|PLACEHOLDER|SUSPECT */,
                          po_type /* PRODUCTION|GRAVITY|REPAIR|OTHER, from prefix */,
                          material_id FK, lot_id FK NULL, work_center_id FK /* SAP routing */,
                          sap_status, planned_output_qty numeric(14,3), uom_code, sap_finish_date date,
                          priority_rank smallint, sap_notes text, is_notes_truncated bool,
                          is_off_system bool, is_manual_shipment bool, + lineage)
ops.process_order_source (process_order_source_id PK, process_order_id FK, source_csv, source_row_number,
                          UNIQUE (source_csv, source_row_number))
ops.process_order_work_center (process_order_work_center_id PK, process_order_id FK, work_center_id FK,
                          UNIQUE (process_order_id, work_center_id))              -- from components

ops.line_schedule_item   (line_schedule_item_id PK, process_order_id FK NULL, work_center_id FK, lot_id FK,
                          status_code /* NEW|RELEASED|STAGED|ONLINE|LAB|ON_HOLD|COMPLETE */, status_note,
                          run_order smallint, run_order_note, priority_rank smallint, priority_note, is_rush bool,
                          scheduled_finish_date date, original_finish_date date,
                          input_kg numeric(14,3), input_qty numeric(14,3), uom_code, output_kg numeric(14,3),
                          trait_family_code /* EXCELIS|GMO|FRESH|NONE */, size_fraction_code,
                          psl_cleanout_value numeric, comments, + lineage)
                          -- UNIQUE (process_order_id, work_center_id) except DQ-06 duplicates (flagged)

ops.conditioning_run     (conditioning_run_id PK, process_order_id FK NULL, po_number_raw, work_center_id FK,
                          equipment_raw, lot_id FK, run_date date, operator_name, species_code, variety_code,
                          size_fraction_code, input_kg, output_kg, loss_kg numeric(14,3),
                          prep_h, run_h, cleandown_h numeric(6,2), defect_comments, + lineage)

ops.quality_test         (quality_test_id PK, process_order_id FK, po_number_raw, lot_id FK, work_center_id FK,
                          equipment_raw, output_batch_number bigint /* indexed, not unique */, test_date date,
                          size_fraction_code, batch_kg numeric(14,3), result_code /* PASS|FAIL|PENDING */,
                          fail_reason_code /* COB|DENT|DISCOLORED|OFF_TYPE|BROKEN|SMUT|WEED|INERT|TARE */,
                          raw_germ_fraction, ready_germ_fraction, raw_vigor_fraction, ready_vigor_fraction
                          numeric(5,4), comments, + lineage)

ops.customer_order       (customer_order_id PK, order_number UNIQUE, customer_name, material_id FK,
                          qty numeric(14,3), uom_code, need_by_date date,
                          priority_tier /* STANDARD|KEY|RUSH */, is_synthetic bool DEFAULT true)
ops.order_allocation     (order_allocation_id PK, customer_order_id FK, process_order_id FK,
                          allocated_qty numeric(14,3), UNIQUE (customer_order_id, process_order_id))
```

### 5.5 `plan` (runtime, owned by the Data API)

```sql
plan.schedule_plan  (schedule_plan_id PK, work_center_id FK, plan_version int, parent_plan_id FK NULL,
                     status /* PROPOSED|ACCEPTED|SUPERSEDED */, plan_event_id FK NULL,
                     horizon_start timestamptz, created_at timestamptz, created_by /* 'heuristic-v1' */,
                     UNIQUE (work_center_id, plan_version))
plan.schedule_entry (schedule_entry_id PK, schedule_plan_id FK, position int, process_order_id FK,
                     planned_start_at, planned_end_at timestamptz, est_run_h, est_changeover_h numeric(6,2),
                     is_at_risk bool, previous_position int NULL, UNIQUE (schedule_plan_id, position))
plan.entry_reason   (entry_reason_id PK, schedule_entry_id FK, seq smallint, reason_code_id FK,
                     params jsonb, weight numeric, UNIQUE (schedule_entry_id, seq))
                     -- ('DUE_DATE_RISK', {"sap_finish":"2026-10-05","slack_days":-2})
                     -- ('SAME_VARIETY_GROUP', {"variety":"GSS3951","saved_h":1.75})
                     -- ('QA_HOLD', {"quality_test_id":123,"fail_reason":"DENT"})
plan.plan_event     (plan_event_id PK, work_center_id FK, event_type /* RUSH|QA_FAIL|NEW_BATCH */,
                     process_order_id FK NULL, payload jsonb, created_at, created_by)
plan.plan_decision  (plan_decision_id PK, schedule_plan_id FK, decision /* ACCEPT|OVERRIDE|REJECT */,
                     override_detail jsonb, decided_by, decided_at, comment)
```

### 5.6 Derived views

```sql
ops.v_throughput          -- median/p75 kg/h by work_center × species (× variety when n ≥ 5), from conditioning_run
ops.v_changeover_observed -- §4.3 transition stats; source for ref.changeover_rule
ops.v_open_queue          -- open line_schedule_items per work center + material + latest QA + allocations
ops.v_po_quality_status   -- per PO: PASS | FAIL (reason) | PENDING | NOT_TESTED
ops.v_order_risk          -- per customer order: covering POs, planned finish vs need_by, slack days
ops.v_dq_summary          -- dq_flags counts per table (must equal observations §8)
```

---

## 6. Gaps and synthetic data

| Gap | Approach |
| --- | --- |
| **Customer orders** (required by the brief) | About 15–25 synthetic orders for Line 1 materials: `need_by_date` = SAP finish ± a few days, 2–3 key customers, `is_synthetic = true` |
| Arrival date | Treat open POs as in plant; `sheet1` field receipts can illustrate intake |
| Changeover rules | Seed `ref.changeover_rule` from §4.3 (`rule_source = DERIVED`); SME confirms the trait penalty |
| Line 1 queue is small (12 open POs) | Enough for the demo; optionally add "shadow" POs re-dated from 2026 history (flagged synthetic) |
| Rush / QA-fail events | Rush: synthetic PO + `plan_event`. QA fail: an `ops.quality_test` FAIL row on an open PO's lot + `plan_event` |

---

## 7. How the model serves the Data API

| Endpoint | Reads | Writes |
| --- | --- | --- |
| `GET /lines/{id}/queue` | latest `plan.schedule_plan` + entries + reasons; falls back to `ops.v_open_queue` | — |
| `POST /schedule/replan` | `v_open_queue`, `v_throughput`, `ref.changeover_rule`, `v_order_risk`, `v_po_quality_status` | `plan_event`, new `schedule_plan` (v+1), entries, reasons |
| `GET /batches/{po}` | `process_order`, `material`, `lot`, `conditioning_run` history, `quality_test` | — |
| `POST /schedule/accept` (via BFF) | `schedule_plan` | `plan_decision`, status → `ACCEPTED` |

`diff.moves[]` = `previous_position` vs `position` between plan v and v+1. `diff.reasons[]` and the Agent payload come from `entry_reason`, so explanations cite PO numbers, lots and test IDs.

### 7.1 Heuristic v1 (in the Data API, not a solver)

Score each runnable PO (status not `ON_HOLD`/`LAB`/`COMPLETE`, QA not `FAIL`):

1. **Hard:** exclude QA FAIL / ON_HOLD. Keep `ONLINE` at position 1 (already running).
2. **Urgency:** slack = `need_by` (or `sap_finish_date`) − projected end. Overdue or negative slack first.
3. **Priority:** `priority_rank` (1 = highest); a RUSH event or `is_rush` overrides it.
4. **Changeover:** a greedy pass groups same variety, then same species and trait family, using `ref.changeover_rule`.
5. Each rule that fires on a position writes an `entry_reason` row.

---

## 8. Implementation plan and status

| Step | Status | Artifact |
| --- | --- | --- |
| 1. Excel → CSV (verified) | ✅ Done | `data_sources/*.csv` + `observations.md` |
| 2. CSV → `raw` (verified) | ✅ Done (load_id 1) | `backend/database/etl/load_raw.py` · [csv-to-raw-integration.md](./csv-to-raw-integration.md) |
| 3. `ref` DDL + load | Next | `backend/database/migrations/` |
| 4. `ops` DDL + transforms (R-PO, R-STATUS, … from observations §6) | Next | SQL from `raw` |
| 5. Seeds (customer orders, changeover rules, reason codes) | Next | `backend/database/seeds/` |
| 6. Reconciliation checks (observations §9.4) | Next | SQL tests |
| 7. Views + Data API endpoints | Then | `ops.v_*`, Data API |

Scope order: Line 1 (`LSVLN1`) end to end first, then Line 2 / Gravity / Colorsort, then SSV (Phase 2).

---

## 9. Open questions for Syngenta

Model-level questions (data-level questions Q-1…Q-10 are in observations §10):

1. Is the variety-change cost (about +1.75 h cleandown on Line 1) consistent with plant practice? Does moving between Excelis, GMO and Fresh require a full cleanout (`PSL Cleanout`)?
2. What does `Priority` 1–9 (up to 18 on Line 5) mean: customer tier, or the scheduler's manual rank?
3. Does a QA fail on one size fraction block the whole PO, or only that output batch?
4. Which source is authoritative for PO status when SAP and the line schedule disagree?
5. Should `BAYER n` (off-system, third-party) runs count in the capacity baseline?
