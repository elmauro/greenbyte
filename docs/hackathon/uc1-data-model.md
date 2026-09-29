# UC1 data model — Pasco conditioning (batch allocation)

**Owner:** Data API (Camilo) · **Status:** Draft v1 · **Use case:** UC1 Plant Capacity Utilization  
**Sources:** `Hackathon 2026 - Use Cases/Hackathon 2026-UseCases/UC1 - Plant Capacity Utilization/`  
**Related:** [syngenta-demo-architecture.md](./syngenta-demo-architecture.md) §7 · [uc1-mvp-scope.md](./uc1-mvp-scope.md)

This document describes the source extracts, the core entities for batch allocation (sequencing), and the PostgreSQL model that the Data API will serve.

---

## 1. What UC1 needs from data

From the Syngenta brief: *take a batch list, plant capacity and open customer orders, and return a ranked conditioning schedule with a stated reason for each position; re-sequence live when a rush batch or failed QA test is injected.*

| Brief input | Found in extracts? | Source |
| --- | --- | --- |
| Batch list (species, variety, qty, size, arrival) | Yes, partial | `Excel SAP data` / `Main`, per-line schedules |
| Plant capacity (lines, throughput) | Derivable | `Resource Info` + `LSV Conditioning Logs` (kg/h) |
| Processing steps and durations | Derivable | Conditioning logs (prep / run / cleandown hours) |
| Changeover rules by variety | Derivable (heuristic) | Line 1 log sequence (see §4.3) |
| Pass/fail test results | Yes | `LSV Pass_Fail Log` |
| **Open customer orders** | **No** | Must be **synthesized** (see §6) |
| Arrival date | No | Assume "in plant" for open POs; synthesize if needed |

Out of scope: treat/pack stage (`LSV/SSV Treatpack`, `Packaging Rates`), Seed Health, other facilities.

---

## 2. Source inventory

Two workbooks:

- **A** = `Pasco LSV and SSV Conditioning sheets and data.xlsx`, the main extract.
- **B** = `Worksheet in Pasco LSV and SSV Conditioning sheets and data.xlsx`, the embedded "refresh" workbook described on A's `Schedule Updating` tab.

Row counts are data rows (header excluded).

### 2.1 Process (how the files are produced today)

`SAP COISPI report` (active, non-complete conditioning POs) → pasted into **B/Main** → workbook refresh splits rows per work center (B/`LSV Line 1`, …) → manual check → **Smartsheet Data Shuttle** updates the per-line schedules (A/`Line N Schedule`). The scheduler then sets `Run Order` / `Priority` by hand.

### 2.2 Tabs

| WB | Tab | Rows | Grain | UC1 role |
| --- | --- | --- | --- | --- |
| A | Schedule Updating | text | — | Process documentation |
| A | SAP Coispi report / Data Shuttle interface image | 0 | image | Skip |
| A | **Excel SAP data** | 202 | 1 row / open PO | **Open work** (all `NEW`); identical to B/Main |
| A | Large / Small Seed Conditioning | 0 | pivot title only | Skip (pivots not exported) |
| A | **Line 1 Schedule** | 476 | 1 row / PO on LSV Line 1 | **Primary UC1 queue + history** (2023-06 → 2026-11) |
| A | Line 2 Schedule | 442 | 1 row / PO | Same shape as Line 1 (+ `Week Number`) |
| A | Gravity Schedule | 917 | 1 row / PO (rework) | Downstream/rework step; has `Size` |
| A | Colorsort Schedule | 406 | 1 row / PO | All `COMPLETE`; history only |
| A | **LSV Conditioning Logs** | 1,899 | 1 row / PO run | **Throughput, loss, prep/cleandown times** |
| A | **LSV Pass_Fail Log** | 3,142 | 1 row / output batch (size fraction) | **QA results**: Pass 2,293 · Fail 812 |
| A | Line 3 / 5 / 6 Schedule | 276 / 1,066 / 484 | 1 row / PO | SSV lines (Phase 2) |
| A | SSV Conditioning Logs | 2,230 | 1 row / PO run | SSV throughput (Phase 2) |
| B | Main | 202 | = A/Excel SAP data | Same data |
| B | Components | 214 | PO → resource | PO ↔ work center routing (94 % of POs appear in Main) |
| B | LSV Line 1 / LSV Line 2 / LSV Gravity / SSV Line 3·5·6 / Seed Health | 15 / 40 / 22 / 16 / 42 / 24 / 43 | slices of Main by work center | Redundant; used for checks |
| B | LSV/SSV Treatpack, LSV Colorsort, SSV Line 7 | 0–1 | — | Empty |
| B | **Resource Info** | 31 | 1 row / work center | **Line master** (code, name, department) |
| B | Packaging Rates | mixed blocks | — | Treat/pack; out of scope |
| B | Sheet1 | ~15 | field receipts (gross/tare/net, cage, barcode) | Raw intake sample for "arrival" story (optional) |

### 2.3 Key columns (Line 1 focus)

**Open POs (`Excel SAP data`):** Crop (species code), Material Description, Prod. Order, Output Qty, UOM (KG/KS), Scheduled Finish Date (SAP), Notes, Priority (1–9, 75 % blank), PO Status, WorkCenter, Pack Line, Department. `Hours` / `Capacity` are **empty**.

**Line schedule (`Line 1 Schedule`):** Run Order, PO Status (`COMPLETE`/`NEW`/`RELEASED`/`ONLINE`), Scheduled Finish Date, Priority, PO Number, Crop Year, Species, Material Description, Lot Number, Input Weight (KG), Excelis/GMO (treatment/trait flag), Comments, Output Weight (KG), Loss %, PSL Cleanout, PO Finished?. Currently **12 open POs** on Line 1 (7 NEW, 4 RELEASED, 1 ONLINE). All of them are in the SAP extract.

**Conditioning log:** PO Number, Equipment ID, Operator, Date, Crop Year, Species, Variety Name, Lot Number, Input KG, Prep / Run / Cleandown Time (h), Output KGs, Loss KG, Scrap Rate, KG per hour, Size Fraction.

**Pass/fail log:** PO Number, Date, Equipment ID, Crop Year, Species, Variety, Lot Number, Size Fraction, KGs, Output Batch, Pass/Fail, Failed for, Raw/Ready Germ, Raw/Ready Vigor, Comments.

### 2.4 Domain codes decoded

| Code | Meaning (inferred) |
| --- | --- |
| Species `SWCO` / `SWBS` | Sweet corn: `CO` = commercial, `BS` = basic/stock seed. Same pattern: `PECO` (pea), `BECO` (bean), `WACO` (watermelon), `SQCO` (squash), `CACO` (capsicum), `TOCO` (tomato), `CUCO` (cucumber), `MECO` (melon), `BRCO` (broccoli), `CFCO` (cauliflower), `WCCO` (Chinese cabbage) |
| Material Description | `<SPECIES> <VARIETY> [<TYPE>] <STATE> ZZZ BK <UOM>`. Example: `SWCO GSS3951 CRS CLX ZZZ BK KG` gives variety `GSS3951`, type `CRS`, state `CLX`, bulk, kg |
| State token | `RAW` (field run) → `RDY` (ready/conditioned); `CLX`/`CLD`/`RDX`/`RDF`/`RDH`: treatment or finish variants of the ready state |
| UOM `KS` | Thousand seeds (small-seed crops); `KG` for large seed |
| Size fraction | `LR`, `LF`, `MR`, `MF` (Large/Medium × Round/Flat), `UN` (undersize); suffixes `H`/`L` for heavy/light |
| PO prefix | `100…` production order (161), `300…` repair/rework (24), `240…` gravity rework (14), `120…` other (3) |
| Excelis / GMO / Fresh | Trait/treatment family: a changeover and segregation constraint |
| Notes / Comments | Routing text such as `SWCO RAX-CLX SUP INT Ln1`, or instructions such as `RUSH`, `Please rework for failed AP` |

---

## 3. Data quality findings (the ETL must handle these)

| # | Issue | Example | Rule |
| --- | --- | --- | --- |
| 1 | Excel error strings in numeric cells | `#DIVIDE BY ZERO` in `KG per hour` (4 rows) | Coerce to NULL; recompute derived metrics in SQL |
| 2 | Inconsistent casing / labels | `EXCELIS` vs `Excelis`, `Fresh`/`FRESH`, `OffType`/`Off-Type`, `COB`/`Cob` | Normalize to enums |
| 3 | Mixed types in a column | Crop Year `2023CL` vs `2023`; Lot `150638606D` vs int | Store as text; parse `crop_year int` + `crop_year_suffix` |
| 4 | Free text in `Priority` (SSV lines) | `RUSH`, `polished`, `Line 6`, `Moved up per Liz` | Split into `priority_rank int` + `priority_note text` |
| 5 | Equipment name drift | `Line 1`, `Line 1 Gravity`, `Colorsorter Line 1`, `LINE 3(NORTH STAR)` | Map to `work_center` via a lookup table |
| 6 | Truncated notes (40 chars) | `…FOR AP+ 2 X.  THIS` | Keep as-is; flag `is_truncated` |
| 7 | Negative loss | SSV log: output > input (`-1.48 kg`) | Keep; flag `dq_negative_loss` |
| 8 | Blank Pass/Fail | 37 rows | Status `PENDING` |
| 9 | Duplicate/typo headers | `Equiment ID`, `Specie`, header with `\n` | Map explicitly in ETL |
| 10 | Stale "open" POs | SAP finish 2025-12-30 still `NEW` | Surface as **overdue** (useful at-risk signal) |
| 11 | Lot reused across POs | 345 lots with more than one PO (rework, split by size) | Lot is its own entity; PO → lot is N:1 |
| 12 | Duplicate workbooks | B/Main = A/Excel SAP data (identical) | Load once; B used for Components + Resource Info |

Join health (good): 453 of 470 Line 1 schedule POs have a conditioning log; 1,850 of 1,888 logged POs have pass/fail rows. So **PO Number is a reliable key** across sheets.

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
                        │1:N                     │ N:M (allocation)
 ┌────────────┐  ┌──────▼───────┐  1:N   ┌───────▼────────┐
 │ WorkCenter │◄─┤ ProcessOrder ├───────►│ OrderAllocation│
 │ (Line 1…)  │  │ (PO = batch) │        └────────────────┘
 └─────┬──────┘  └──┬───┬───┬───┘
       │            │   │   │ N:1
       │            │   │   └──────────►┌──────────┐
       │            │   │               │   Lot    │  seed lot (physical)
       │            │   │1:N            └──────────┘
       │            │ ┌─▼────────────────┐
       │            │ │ ConditioningRun  │ prep/run/cleandown, kg in/out
       │            │ └──────────────────┘
       │            │1:N
       │          ┌─▼────────────────┐
       │          │   QualityTest    │ per size fraction / output batch
       │          └──────────────────┘
       │1:N
 ┌─────▼────────────┐   1:N  ┌───────────────┐  1:N ┌──────────────┐
 │  SchedulePlan    ├───────►│ ScheduleEntry ├─────►│ EntryReason  │
 │ (versioned)      │        │ position, eta │      └──────────────┘
 └─────┬────────────┘        └───────────────┘
       │ triggered by / accepted by
 ┌─────▼────────────┐        ┌───────────────┐
 │   PlanEvent      │        │ PlanDecision  │  human accept / override
 │ rush, qa_fail    │        │ (audit)       │
 └──────────────────┘        └───────────────┘
```

**Key design ideas**

1. **ProcessOrder (PO) is the batch.** It's the unit the scheduler sequences, and the only key shared by every sheet.
2. **Lot is separate from PO.** One lot can have several POs (first pass, rework, size splits). QA failures attach to the lot/output batch and propagate to the POs that depend on it.
3. **Reference data vs facts vs decisions.** Reference data (species, material, work center, changeover rules) is loaded once. Operational facts (POs, runs, QA) come from the extracts. Decisions (plans, entries, reasons, events, acceptances) are written by the app. Only the decision tables are written at runtime.
4. **Plans are immutable and versioned.** Every re-sequence creates a new `schedule_plan` (`plan_version` +1), so the diff and the "why it changed" story come straight from comparing two versions. This matches `planVersion` / `diff.moves[]` in the frontend contract.
5. **Reasons are data, not prose.** Each entry stores structured reason codes and parameters (for example `DUE_DATE_RISK {days_late: 3}`). The Agent API turns them into plain language, and the citations point to stable IDs.
6. **Capacity is derived, not typed in.** Throughput and changeover durations are views over historical conditioning logs, per work center × species/variety. SAP `Hours`/`Capacity` are empty.

### 4.2 Capacity model (derived from logs)

Median values from `LSV Conditioning Logs`:

| Work center | kg/h (run) | kg/h (incl. prep+clean) | Scrap rate | Prep h | Cleandown h |
| --- | --- | --- | --- | --- | --- |
| **Line 1** | **1,114** | 874 | 19 % | 1.00 | 1.50 |
| Line 2 | 274 | 175 | 25 % | 0.50 | 1.50 |
| Gravity | 434 | 358 | 9 % | 0.25 | 0.25 |
| Colorsorter | 227 | 161 | 5 % | 0.25 | 0.50 |

Line 1 by species (median kg/h): PECO 1,341 · SWCO 1,085 · BECO 930 · SWBS 656 · SWTO 1,845. So **run duration = input kg / kg/h(line, species)**.

### 4.3 Changeover rule (derived from the Line 1 run sequence)

Ordering Line 1 runs by date and comparing each run to the previous one:

| Transition | Median prep h | Median cleandown h | n |
| --- | --- | --- | --- |
| Same variety | 0.92 | **0.50** | 199 |
| Same species, different variety | 1.50 | **2.25** | 214 |
| Species change | 1.50 | 1.29 | 48 |

**Heuristic for v1:** a variety change costs roughly **+1.75 h** of cleandown compared with a same-variety run. This backs the "group same variety, limit changeover" reason. Add a trait-family penalty for moves between Excelis, GMO and Fresh; the size of that penalty still needs validating with Syngenta.

---

## 5. Logical model (PostgreSQL)

Four schemas keep the layers separate:

| Schema | Purpose | Written by |
| --- | --- | --- |
| `raw` | 1:1 copy of each tab, all columns `text`, plus `source_file`, `source_sheet`, `source_row`, `loaded_at` | ETL only (re-runnable) |
| `ref` | Reference/master data | ETL + manual seeds |
| `ops` | Cleaned operational facts | ETL |
| `plan` | Scheduling decisions and audit trail | Data API at runtime |

Views in `ops` (or an `analytics` schema) provide the derived capacity numbers.

### 5.1 `ref`

```sql
ref.species        (species_code PK, crop_name, seed_class /* CO|BS */, seed_size /* LSV|SSV */)
ref.material       (material_id PK, material_description UNIQUE, species_code FK, variety_code,
                    type_code, state_code, trait_family /* EXCELIS|GMO|FRESH|NONE */, uom)
ref.work_center    (work_center_code PK /* LSVLN1 */, name /* LSV Line 1 */, department,
                    line_type /* LINE|GRAVITY|COLORSORT|REPAIR|SEED_HEALTH */, is_in_scope bool)
ref.equipment_alias(alias PK /* 'Line 1', 'Colorsorter Line 1' */, work_center_code FK)
ref.changeover_rule(rule_id PK, work_center_code FK, from_scope, to_scope
                    /* SAME_VARIETY|SAME_SPECIES|SPECIES_CHANGE|TRAIT_CHANGE */,
                    hours numeric, source /* DERIVED|SME */, derived_n int)
ref.reason_code    (reason_code PK, description, template /* for Agent fallback */)
```

### 5.2 `ops`

```sql
ops.lot            (lot_number PK, species_code FK, crop_year int, crop_year_suffix text)

ops.process_order  (po_number bigint PK, po_type /* PRODUCTION|REPAIR|GRAVITY|OTHER from prefix */,
                    material_id FK, lot_number FK NULL, work_center_code FK,
                    status /* NEW|RELEASED|STAGED|ONLINE|LAB|HOLD|COMPLETE */,
                    qty numeric, uom, input_kg numeric,
                    sap_finish_date date, scheduled_finish_date date,
                    priority_rank int NULL, priority_note text,
                    manual_run_order int NULL, notes text, notes_truncated bool,
                    source_sheet text, updated_at timestamptz)

ops.conditioning_run (run_id PK, po_number FK, work_center_code FK, equipment_raw text,
                    run_date date, operator text, size_fraction text,
                    input_kg, output_kg, loss_kg, prep_h, run_h, cleandown_h,
                    dq_flags text[])
                    -- scrap_rate, kg_per_hour recomputed in view, not trusted from Excel

ops.quality_test   (test_id PK, po_number FK, lot_number FK, output_batch bigint,
                    test_date date, work_center_code FK, size_fraction, kg,
                    result /* PASS|FAIL|PENDING */, fail_reason /* COB|DENT|DISCOLORED|OFF_TYPE|BROKEN|SMUT|WEED|INERT|TARE */,
                    raw_germ, ready_germ, raw_vigor, ready_vigor, comments)

ops.customer_order (order_id PK, customer_name, material_id FK /* or species+variety */,
                    qty, uom, need_by_date date, priority_tier /* STANDARD|KEY|RUSH */,
                    is_synthetic bool DEFAULT true)
ops.order_allocation (order_id FK, po_number FK, allocated_qty, PRIMARY KEY (order_id, po_number))
```

### 5.3 `plan` (runtime, owned by the Data API)

```sql
plan.schedule_plan (plan_id PK, work_center_code FK, plan_version int, parent_plan_id FK NULL,
                    status /* PROPOSED|ACCEPTED|SUPERSEDED */, trigger_event_id FK NULL,
                    horizon_start timestamptz, created_at, created_by /* 'heuristic-v1' */,
                    UNIQUE (work_center_code, plan_version))

plan.schedule_entry(plan_id FK, position int, po_number FK,
                    planned_start timestamptz, planned_end timestamptz,
                    est_run_h, est_changeover_h, at_risk bool, previous_position int NULL,
                    PRIMARY KEY (plan_id, position))

plan.entry_reason  (plan_id, position, seq, reason_code FK, params jsonb, weight numeric,
                    FOREIGN KEY (plan_id, position) REFERENCES plan.schedule_entry)
                    -- e.g. ('DUE_DATE_RISK', {"sap_finish":"2026-10-05","slack_days":-2})
                    --      ('SAME_VARIETY_GROUP', {"variety":"GSS3951","saved_h":1.75})
                    --      ('QA_HOLD', {"test_id":123,"fail_reason":"DENT"})

plan.plan_event    (event_id PK, work_center_code FK, event_type /* RUSH|QA_FAIL|NEW_BATCH */,
                    po_number FK NULL, payload jsonb, created_at, created_by)

plan.plan_decision (decision_id PK, plan_id FK, decision /* ACCEPT|OVERRIDE|REJECT */,
                    override_detail jsonb, decided_by, decided_at, comment)
```

### 5.4 Derived views

```sql
ops.v_throughput          -- median/p75 kg_per_hour by work_center × species (× variety when n ≥ 5)
ops.v_changeover_observed -- the §4.3 transition stats; source for ref.changeover_rule
ops.v_open_queue          -- open POs per work center + material + latest QA + allocated orders
ops.v_po_quality_status   -- per PO: PASS | FAIL (reason) | PENDING | NOT_TESTED
ops.v_order_risk          -- per customer order: covering POs, planned finish vs need_by, slack days
```

---

## 6. Gaps and synthetic data

| Gap | Approach |
| --- | --- |
| **Customer orders** (required by the brief) | Generate about 15–25 synthetic orders for Line 1 materials. `need_by_date` is the SAP finish date plus or minus a few days, with 2–3 key customers. `is_synthetic = true` |
| Arrival date | Treat open POs as in plant; `Sheet1` field receipts can illustrate intake if needed |
| Changeover rules | Seed `ref.changeover_rule` from §4.3 (`source = DERIVED`); ask a Syngenta SME to confirm the trait-family penalty |
| Line 1 queue is small (12 open POs, 15 in SAP) | Enough for the demo; optionally add "shadow" POs from 2026 history re-dated into the horizon (flagged synthetic) |
| Rush / QA-fail events | Rush: insert a synthetic PO + `plan_event`. QA fail: insert an `ops.quality_test` FAIL row for an open PO's lot + `plan_event` |

---

## 7. How the model serves the Data API

| Endpoint | Reads | Writes |
| --- | --- | --- |
| `GET /lines/{id}/queue` | latest `plan.schedule_plan` + entries + reasons; falls back to `ops.v_open_queue` | — |
| `POST /schedule/replan` | `v_open_queue`, `v_throughput`, `ref.changeover_rule`, `v_order_risk`, `v_po_quality_status` | `plan_event`, new `schedule_plan` (v+1), entries, reasons |
| `GET /batches/{po}` | `process_order`, `material`, `lot`, `conditioning_run` history, `quality_test` | — |
| `POST /schedule/accept` (via BFF) | `schedule_plan` | `plan_decision`, status → `ACCEPTED` |

The `diff.moves[]` response is `previous_position` vs `position` between plan v and v+1. `diff.reasons[]` and the Agent payload come from `entry_reason` (codes plus params), so explanations cite PO numbers, lots and test IDs.

### 7.1 Heuristic v1 (lives in the Data API, not a solver)

Score each runnable PO (status not in HOLD/LAB/COMPLETE and QA not FAIL):

1. **Hard:** exclude QA FAIL / HOLD. Keep `ONLINE` at position 1 (already running).
2. **Urgency:** slack = `need_by (or sap_finish) − projected_end`. Overdue or negative slack first.
3. **Priority:** `priority_rank` (1 = highest), a RUSH event overrides it.
4. **Changeover:** a greedy pass groups same variety, then same species and trait family, using `ref.changeover_rule` hours.
5. Each rule that fires on a position writes an `entry_reason` row.

---

## 8. ETL approach

1. **Extract:** a script reads both workbooks tab by tab into `raw.*`, all as text, with lineage columns. Idempotent (truncate + load).
2. **Transform:** SQL (or Python) from `raw` → `ref`/`ops`. It applies the §3 rules, parses Material Description, maps equipment aliases, and recomputes metrics.
3. **Seed:** synthetic customer orders + changeover rules + reason codes.
4. **Validate:** row counts per tab, FK coverage (PO in run/test → PO master), a DQ report (`dq_flags` counts).
5. **Scope order:** Line 1 (LSVLN1) end to end first, then Line 2 / Gravity / Colorsort (same LSV shape), then the SSV lines (Phase 2).

Suggested repo layout: `backend/database/migrations/` (DDL per schema), `backend/database/seeds/` (synthetic orders, rules, reason codes), `backend/database/etl/` (loader + transforms).

---

## 9. Open questions for Syngenta

1. Is the variety-change cost (about +1.75 h cleandown on Line 1) consistent with plant practice? Does moving between Excelis, GMO and Fresh require a full cleanout (`PSL Cleanout`)?
2. What does `Priority` 1–9 mean: customer tier, or the scheduler's manual rank?
3. Confirm what the state tokens mean (`CLX`, `CLD`, `RDX`, `RDF`, `RDH`) and the prefixes `300…` / `240…`.
4. Does a QA fail on one size fraction block the whole PO, or only that output batch?
