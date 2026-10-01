# UC1 data sources — observations and source-to-target mapping

**Scope:** UC1 Plant Capacity Utilization (Pasco conditioning) · **Owner:** Data API (Camilo) · **Status:** v1 (2026-09-30)
**Folder:** `Hackathon 2026 - Use Cases/Hackathon 2026-UseCases/UC1 - Plant Capacity Utilization/data_sources/`
**Related:** [`backend/data-model/uc1-data-model.md`](../../../../backend/data-model/uc1-data-model.md)

This file is the contract for the migration from the Pasco Excel extracts to PostgreSQL. It covers:

- how each CSV was produced and how to trace any value back to its source cell (§1–§3)
- the file inventory (§4)
- naming and primary-key standards (§5)
- value standardization rules (§6)
- column-by-column mapping from source to target (§7)
- the data quality catalog (§8)
- the core data model (§9)
- open questions (§10)

---

## 1. Source files (lineage anchor)

| Key | File | SHA-256 | Tabs |
| --- | --- | --- | --- |
| `Pasco` | `Pasco LSV and SSV Conditioning sheets and data.xlsx` | `7701abc443aa7b500dd5781a8ed9a020d1a22b6f8315ee44372e8a5aff42f992` | 16 |
| `Worksheet` | `Worksheet in Pasco LSV and SSV Conditioning sheets and data.xlsx` | `c9686f30d51d7f0c3b9da2a26a28670fc12460a96830d8c51718ea726c642968` | 16 |

- `Worksheet` is the workbook embedded as an object in `Pasco › Schedule Updating`. Every cell value matches the embedded copy; the bytes differ only because Excel re-saved the file.
- The ETL must store the SHA-256 with every load. If a source file changes, the hash changes, and every CSV in this folder must be regenerated.

## 2. How the CSVs were produced

**Method:** each tab was read with `openpyxl` (`data_only=True`, i.e. the **stored cell values**) and written as-is. Nothing in the CSVs is cleaned or standardized; cleaning happens in the ETL, following the rules in §6–§7.

| Rule | Detail |
| --- | --- |
| File name | Tab name → lower case → every run of non-alphanumeric characters becomes one `_`. Example: `LSV Pass_Fail Log` → `lsv_pass_fail_log.csv`. No names collide across the two workbooks. |
| Grid | Starts at cell **A1**, so the CSV column position equals the Excel column letter. Only trailing empty rows and columns are trimmed. |
| **Traceability** | **CSV record N = Excel row N** of the same tab. Headers are *not* moved: `components.csv` keeps its title in record 1 and its header in record 2. |
| Encoding | UTF-8 (no BOM), comma separator, `"` quoting only where needed, `\n` line endings. Values that contain line breaks (two header cells) are quoted, so use a CSV parser, not line counting. |
| Numbers | Integers as written. Decimals at full stored precision (Python shortest round-trip form), e.g. `0.26054896436354`. **Excel display formats are not applied**: a percentage shown as `26%` is `0.26…`. |
| Dates | `YYYY-MM-DD` (no source date has a time part). |
| Booleans | `TRUE` / `FALSE`. |
| Empty | Empty field. Text such as `NA`, `None`, `-` or `#DIVIDE BY ZERO` is **kept as it appears in the source** (it's text in Excel, not an error value). |
| Formulas | The last stored result is exported (see §3). |

### 2.1 Verification

| Check | Result |
| --- | --- |
| Round-trip: CSV re-read vs workbook values (openpyxl) | 32/32 files identical |
| Independent engine: every cell compared with `python-calamine` (Rust reader) | **216,638 cells, 0 value differences** |
| Nothing dropped: cells outside the exported grid | 0 non-empty cells outside |
| Known engine difference | 13 header cells × 2 files contain a line break stored as `CR LF`. The XML spec normalizes that to `LF`, and the Excel table definitions store the same names with `LF` only (`_x000a_`). The CSVs use `LF` (`Material \nDescription`, `Output\nQty`). |

## 3. What a CSV cannot hold (read before migrating)

| Item | Where | Impact |
| --- | --- | --- |
| Images / drawings | `SAP Coispi report`, `Data Shuttle interface image`, `Large Seed Conditioning`, `Small Seed Conditioning`, `Schedule Updating` | Not data. The throughput tabs contain only a title cell; their pivots and charts were **not exported as data**. |
| Embedded workbook object | `Schedule Updating` | Provided as the separate `Worksheet` file |
| Formulas → stored values | `Excel SAP data` / `Main`: `Crop` (`=TRIM(LEFT(B,4))`), `PO Status` (`="NEW"`), `WorkCenter`, `Pack Line`, `Department` (VLOOKUPs), `Hours`, `Capacity` | Values reflect the **last refresh**. In `Pasco`, `WorkCenter`/`Pack Line`/`Department` look up an **external workbook** (`Plant Schedules.xlsx` on SharePoint) that isn't in the repo. `Hours`/`Capacity` stored results are empty strings for all 202 rows (they only compute for Treatpack departments), so the empty CSV cells are correct. `Packaging Rates` (58) and `Sheet1` (5) formulas all have stored values. |
| Cell comment | `Excel SAP data!K1` and `Main!K1` (`Pack Line` header) | Contains an old formula (`=IFERROR(IF(VLOOKUP(F4,Yesterday!F:T,15,FALSE)…`); no data impact |
| Merged cells | `large_seed_conditioning` B2:V5, `small_seed_conditioning` B2:Z5, `components` A1:B1, `packaging_rates` (8 ranges), `sheet1` (12 ranges, rows 1–3) | The value is in the top-left cell only; the other cells of the range are empty |
| Excel tables / queries | `TableToday` (SAP data), `Table6` (Components), 11 Power Query tables in `Worksheet` | Structure only; the data is exported |
| Hidden rows/columns, hidden tabs, filters | none (`SSV Conditioning Logs` has an autofilter with no active criteria) | No rows are hidden, so none are lost |

**Answer to "is the export 100 % accurate?"** For **cell values**, yes. Every stored value is in the CSV at the same row and column, confirmed by a second, independent reader. What the CSVs cannot hold is listed above (images, charts, formulas, formatting, comments). None of it is operational data except the external-lookup provenance of `WorkCenter`, `Pack Line` and `Department`.

---

## 4. File inventory

**Shape:** `table` = header + rows · `layout` = several blocks on one tab (not one table) · `title` = heading only · `text` = prose · `empty` = no cells.

| # | CSV file | Source workbook › tab | Records × cols | Shape | Header row | Data rows | Content | Target |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `schedule_updating.csv` | Pasco › `Schedule Updating` (tab 1) | 16 × 2 | text | — | — | Process documentation (text in col B) | not migrated (documentation) |
| 2 | `sap_coispi_report.csv` | Pasco › `SAP Coispi report` (tab 2) | 0 × 0 | empty | — | — | Image only (screenshot of SAP report) | not migrated |
| 3 | `excel_sap_data.csv` | Pasco › `Excel SAP data` (tab 3) | 203 × 14 | table | 1 | 202 | Open conditioning POs from SAP COISPI (202 × NEW) | ops.process_order |
| 4 | `data_shuttle_interface_image.csv` | Pasco › `Data Shuttle interface image` (tab 4) | 0 × 0 | empty | — | — | Image only (Smartsheet Data Shuttle) | not migrated |
| 5 | `large_seed_conditioning.csv` | Pasco › `Large Seed Conditioning` (tab 5) | 2 × 2 | title | — | — | Title cell only; content was a chart image | not migrated |
| 6 | `line_1_schedule.csv` | Pasco › `Line 1 Schedule` (tab 6) | 477 × 19 | table | 1 | 476 | LSV Line 1 schedule + history | ops.line_schedule_item |
| 7 | `line_2_schedule.csv` | Pasco › `Line 2 Schedule` (tab 7) | 443 × 19 | table | 1 | 442 | LSV Line 2 schedule + history | ops.line_schedule_item |
| 8 | `gravity_schedule.csv` | Pasco › `Gravity Schedule` (tab 8) | 918 × 16 | table | 1 | 917 | LSV Gravity (rework) schedule | ops.line_schedule_item |
| 9 | `colorsort_schedule.csv` | Pasco › `Colorsort Schedule` (tab 9) | 407 × 14 | table | 1 | 406 | LSV Colorsort schedule (all COMPLETE) | ops.line_schedule_item |
| 10 | `lsv_conditioning_logs.csv` | Pasco › `LSV Conditioning Logs` (tab 10) | 1900 × 24 | table | 1 | 1899 | LSV run log (one row per run) | ops.conditioning_run |
| 11 | `lsv_pass_fail_log.csv` | Pasco › `LSV Pass_Fail Log` (tab 11) | 3143 × 19 | table | 1 | 3142 | LSV QA results per output batch | ops.quality_test |
| 12 | `small_seed_conditioning.csv` | Pasco › `Small Seed Conditioning` (tab 12) | 2 × 2 | title | — | — | Title cell only; content was a chart image | not migrated |
| 13 | `line_3_schedule.csv` | Pasco › `Line 3 Schedule` (tab 13) | 277 × 14 | table | 1 | 276 | SSV Line 3 schedule | ops.line_schedule_item (Phase 2) |
| 14 | `line_5_schedule.csv` | Pasco › `Line 5 Schedule` (tab 14) | 1067 × 14 | table | 1 | 1066 | SSV Line 5 schedule | ops.line_schedule_item (Phase 2) |
| 15 | `line_6_schedule.csv` | Pasco › `Line 6 Schedule` (tab 15) | 485 × 13 | table | 1 | 484 | SSV Line 6 schedule | ops.line_schedule_item (Phase 2) |
| 16 | `ssv_conditioning_logs.csv` | Pasco › `SSV Conditioning Logs` (tab 16) | 2231 × 17 | table | 1 | 2230 | SSV run log | ops.conditioning_run (Phase 2) |
| 17 | `main.csv` | Worksheet › `Main` (tab 1) | 203 × 14 | table | 1 | 202 | Identical to excel_sap_data.csv | reconciliation only |
| 18 | `components.csv` | Worksheet › `Components` (tab 2) | 216 × 2 | table | 2 | 214 | PO → resource (work center) routing; title in row 1 | ops.process_order_work_center |
| 19 | `lsv_treatpack.csv` | Worksheet › `LSV Treatpack` (tab 3) | 1 × 13 | table | 1 | 0 | Header only (no rows) | not migrated (out of scope) |
| 20 | `ssv_treatpack.csv` | Worksheet › `SSV Treatpack` (tab 4) | 1 × 13 | table | 1 | 0 | Header only (no rows) | not migrated (out of scope) |
| 21 | `seed_health.csv` | Worksheet › `Seed Health` (tab 5) | 44 × 14 | table | 1 | 43 | Slice of Main: PASSHLTH | reconciliation only (out of scope) |
| 22 | `ssv_line_3.csv` | Worksheet › `SSV Line 3` (tab 6) | 17 × 14 | table | 1 | 16 | Slice of Main: SSVLN3 + SSVRPR3 | reconciliation only |
| 23 | `ssv_line_5.csv` | Worksheet › `SSV Line 5` (tab 7) | 43 × 14 | table | 1 | 42 | Slice of Main: SSVLN5 + SSVRPR5 | reconciliation only |
| 24 | `ssv_line_6.csv` | Worksheet › `SSV Line 6` (tab 8) | 25 × 14 | table | 1 | 24 | Slice of Main: SSVLN6 + SSVRPR6 | reconciliation only |
| 25 | `ssv_line_7.csv` | Worksheet › `SSV Line 7` (tab 9) | 1 × 14 | table | 1 | 0 | Header only (no rows) | not migrated |
| 26 | `lsv_line_1.csv` | Worksheet › `LSV Line 1` (tab 10) | 16 × 12 | table | 1 | 15 | Slice of Main: LSVLN1 | reconciliation only |
| 27 | `lsv_line_2.csv` | Worksheet › `LSV Line 2` (tab 11) | 41 × 12 | table | 1 | 40 | Slice of Main: LSVLN2 | reconciliation only |
| 28 | `lsv_gravity.csv` | Worksheet › `LSV Gravity` (tab 12) | 23 × 15 | table | 1 | 22 | Slice of Main: LSVGRVTY (col A empty) | reconciliation only |
| 29 | `lsv_colorsort.csv` | Worksheet › `LSV Colorsort` (tab 13) | 1 × 14 | table | 1 | 0 | Header only (no rows) | not migrated |
| 30 | `resource_info.csv` | Worksheet › `Resource Info` (tab 14) | 32 × 3 | table | 1 | 31 | Work center master (31 rows) | ref.work_center |
| 31 | `packaging_rates.csv` | Worksheet › `Packaging Rates` (tab 15) | 42 × 19 | layout | — | — | Several side-by-side rate blocks (treat/pack) | not migrated (out of scope) |
| 32 | `sheet1.csv` | Worksheet › `Sheet1` (tab 16) | 18 × 26 | layout | — | — | Two side-by-side blocks: field receipts + manual shipments | not migrated (optional later) |

**Reconciliation:** `main.csv` = `excel_sap_data.csv`, cell for cell. The `Worksheet` slice tabs add up to `Main` exactly, by `WorkCenter`: LSVLN1 15 · LSVLN2 40 · LSVGRVTY 22 · SSVLN3+SSVRPR3 16 · SSVLN5+SSVRPR5 42 · SSVLN6+SSVRPR6 24 · PASSHLTH 43 = 202. Load `excel_sap_data.csv` once and use the slices only as ETL checks.

---

## 5. Naming and key standards

### 5.1 Source naming problems (as found)

| Problem | Examples |
| --- | --- |
| Line breaks inside headers | `Material \nDescription`, `Output\nQty` |
| Typos | `Equiment ID`, `Specie`, `Original Scheduled  Finish Date` (2 spaces) |
| Punctuation and units in names | `Notes:`, `Prod. Order`, `PO Finished?`, `Input Weight (KG)`, `Loss %`, `Pass/Fail` |
| Same concept, different names | PO: `Prod. Order` · `PO Number` · `Process Order`. Species: `Crop` · `Species` · `Specie` · `SWCO/SWBS`. Variety: `Variety Name` · `Variety`. Quantity: `Output Qty` · `Input Weight (KG)` · `Input Quantity` · `Input KG` · `KGs`. Unit: `UOM` · `UoM`. Loss: `Scrap Rate` · `Loss %`. Size: `Size` · `Size Fraction`. Trait: `Excelis / GMO` · `Excelis/GMO`. Original date: `SAP Finish Date` · `Original SAP Finish Date` · `Original Scheduled  Finish Date`. Delay: `Delay in Days` · `Day Count`. Work center: `WorkCenter` · `Work Center` · `Resource` · `Equipment ID` |
| Same concept, different columns across line tabs | Line 1 has `Warehouse Staging Link`; Line 2 has `Week Number`; Gravity has `Dup Check` and `GM Finder`; SSV lines have different date/delay columns |

### 5.2 Target naming standard

| Element | Convention | Example |
| --- | --- | --- |
| Schemas | `raw` (verbatim) · `ref` (reference) · `ops` (operational facts) · `plan` (runtime decisions) | `ops.conditioning_run` |
| Tables | `snake_case`, singular noun | `process_order`, `quality_test` |
| Columns | `snake_case`, English, no abbreviations except the standard suffixes below | `sap_finish_date` |
| Surrogate PK | `<table>_id`, `bigint GENERATED ALWAYS AS IDENTITY` | `process_order_id` |
| Foreign key | Same name as the referenced PK | `lot_id`, `work_center_id` |
| Business code | `_code`, text, upper case | `species_code`, `work_center_code`, `status_code` |
| Business number kept as text | `_number` | `po_number`, `lot_number`, `output_batch_number` |
| Quantities (unit in name) | `_kg`, `_qty` (+ `uom_code`), `_h` (hours) | `input_kg`, `run_h` |
| Ratios | `_fraction`, stored 0–1, never × 100 | `raw_germ_fraction` |
| Dates / timestamps | `_date` (date), `_at` (timestamptz) | `run_date`, `loaded_at` |
| Booleans | `is_` / `has_` | `is_synthetic`, `is_notes_truncated` |
| Original source value kept | `_raw` suffix, text | `po_number_raw`, `equipment_raw` |
| Free text | `comments`, `_note` | `priority_note` |
| DQ flags | `dq_flags text[]` holding codes from §8 | `{DQ-07}` |

### 5.3 Primary and business keys

**Standard (all tables):**

1. **PK = surrogate** `<table>_id bigint` identity. It never comes from the source.
2. **Business key = `UNIQUE NOT NULL`** on the normalized natural key (listed below). FKs reference the surrogate PK.
3. **Lineage on every `ops` row:** `source_csv text`, `source_row_number int`, `source_file_sha256 char(64)`, `load_id bigint`, pointing at the exact CSV record, which is the exact Excel row (§2).
4. **`raw` tables:** one per CSV (`raw.line_1_schedule`, …), loaded by `backend/database/etl/load_raw.py`. All data columns are `text`, named after the source header in `snake_case` (`%` → `pct`; blank header → `col_<letter>`). Metadata columns start with `_` so they never collide with source headers: PK = `_source_row_number` (the CSV record = the Excel row), plus `_load_id` → `raw.load_batch`. The file hashes and provenance are in `raw.load_file`; column letter → source header → raw column is in `raw.column_map`.

**R-PO — PO number normalization.** The PO is the only key shared by every tab, but its values aren't clean:

| Pattern (after `TRIM`) | Meaning (inferred) | Rule | Status |
| --- | --- | --- | --- |
| `100\d{7}` | Production order | keep | `VALID` |
| `240\d{7}` | Gravity/rework order | keep | `VALID` |
| `300\d{6}` | Repair order | keep | `VALID` |
| `120\d{6}` | Other order (Line 1/2 history) | keep | `VALID` |
| `100\d{6}` | 9-digit order (Seed Health, e.g. `100028467`) | keep | `VALID` |
| leading zero, e.g. `0300097772` | Excel/text artefact | strip the leading zero, then re-validate | `NORMALIZED` |
| `150\d{6}` / `151\d{6}` | Row added by hand for a raw shipment (comment `MANUALLY ADDED SHIPMENT`); **the value is the lot/batch number, not a PO** | `po_number` NULL, value → `lot_number`, `is_manual_shipment = true` | `NOT_A_PO` |
| `Off System`, `OFF SYSTEM`, `OFF-SYSTEM`, `BAYER 1`–`BAYER 4` | Run outside SAP (placeholder) | `po_number` NULL, `is_off_system = true` | `PLACEHOLDER` |
| anything else (`100184897`, `30006015`, `30098665`, `200007268`, `10020117755`, `3001007703`, `1.16`, `1000216-922`) | Typo or truncation | keep in `po_number_raw`, `po_number` NULL, flag DQ-03; match manually when the lot proves it (e.g. `100184897` + lot `23-MZ1713X1` = `1001848979`) | `SUSPECT` |

Store `po_number` as **text**, not bigint: it's an identifier, not a quantity, and text keeps leading-zero cases visible in `po_number_raw`.

**R-LOT — lot number:** `TRIM`, keep the original case, store as text (`150638606D`, `RBR/10248`, `23-MZ1713X1`). A lot can have many POs (rework, size splits): 345 lots in the LSV log have more than one PO.

### 5.4 Keys identified per source tab (tested on the full data)

| CSV | Candidate key | Rows | Distinct | Unique? | Finding → target key |
| --- | --- | --- | --- | --- | --- |
| `excel_sap_data.csv` | `Prod. Order` | 202 | 202 | ✅ | Business key of `process_order` |
| `resource_info.csv` | `Work Center` | 31 | 31 | ✅ | Business key of `ref.work_center`. `Pack Line` is **not** unique (`SSV S60` = `PASFOIL` + `SSVS60`) |
| `components.csv` | `Process Order` | 214 | 214 | ✅ | One work center per PO → `process_order_work_center (process_order_id, work_center_id)` |
| `gravity_schedule.csv` | `PO Number` | 917 | 917 | ✅ | `line_schedule_item` business key = (`process_order_id`, `work_center_id`) |
| `colorsort_schedule.csv` | `PO Number` | 406 | 406 | ✅ | same |
| `line_2_schedule.csv` | `PO Number` | 442 | 442 | ✅ | same (1 `OFF SYSTEM` row) |
| `line_1_schedule.csv` | `PO Number` | 476 | 470 | ❌ | 8 placeholder rows (`Off System` ×4 rows 213–216, `OFF SYSTEM` ×4 rows 315–318). Excluding placeholders: unique |
| `line_3_schedule.csv` | `PO Number` | 276 | 276 | ✅ | Contains placeholders and `150…` lot values (R-PO) |
| `line_5_schedule.csv` | `PO Number` | 1,066 | 1,065 | ❌ | `300101284` twice (rows 852, 854) → keep both, flag DQ-06 |
| `line_6_schedule.csv` | `PO Number` | 484 | 483 | ❌ | `1002256377` twice (rows 318, 341) → keep both, flag DQ-06 |
| `lsv_conditioning_logs.csv` | `PO Number` | 1,899 | 1,886 | ❌ | Several runs per PO (size fractions, repeat runs). **No natural key exists**: even (PO, equipment, date, lot, size, input kg) repeats. 7 rows are full duplicates (rows 293–295, 357–358, 1005–1006) |
| `lsv_pass_fail_log.csv` | `Output Batch` | 3,142 | 3,134 | ❌ | 8 batch numbers repeat; (PO, Output Batch) still repeats 3 times; rows 1281–1282 are full duplicates |
| `ssv_conditioning_logs.csv` | `PO Number` | 2,230 | 2,202 | ❌ | Several runs per PO; 6 full-duplicate rows (153/167, 1586/1592, 1821/1824) |

**Consequences for the model:**

- `conditioning_run` and `quality_test` have **no reliable natural key**. Their identity is the surrogate PK plus lineage (`source_csv`, `source_row_number`).
- Full-duplicate rows are **loaded, not dropped**, and flagged `DQ-05`. Whether they're double entries or genuine repeat runs is Q-5.
- **POs move between tabs.** Line 1 ∩ Line 2 = 1 PO, Line 1 ∩ Line 3 = 2, Gravity ∩ Colorsort = 28, Line 3 ∩ Line 6 = 14, Line 5 ∩ Line 6 = 25. So a PO has **one** `process_order` row and **one `line_schedule_item` per work center**.

---

## 6. Standardization rules (applied in the ETL, not in the CSVs)

### 6.1 General

| ID | Rule |
| --- | --- |
| R-TEXT | `TRIM`; collapse repeated inner spaces in *codes* only (not in comments) |
| R-NUM | Parse as numeric. Error text (`#DIVIDE BY ZERO`, `#INVALID OPERATION`), `NA`, `None`, `-`, and malformed numbers (`14..5`, `..42`) → NULL + DQ flag. **Never guess a corrected value.** |
| R-DERIVED | Don't migrate derived columns (rates, loss %, week, delay, helpers). Recompute them in views and use the source values only as ETL checks |
| R-CROPYEAR | `^(\d{4})(CL)?$` → `crop_year` smallint + `crop_year_suffix` (`CL` or NULL). `CL` meaning = Q-2 |
| R-DATE | Source dates have no time part → `date` |

### 6.2 Enumerations (source value → standard code)

| Rule | Standard codes | Source values seen |
| --- | --- | --- |
| **R-STATUS** `status_code` | `NEW`, `RELEASED`, `STAGED`, `ONLINE`, `LAB`, `ON_HOLD`, `COMPLETE` | `NEW` · `RELEASED` · `STAGED` · `ONLINE` · `ONLINE CLEANING`→`ONLINE` (+note `CLEANING`) · `ONLINE SIZING`→`ONLINE` (+`SIZING`) · `ONLINE - Condition`→`ONLINE` (+`CONDITION`) · `LAB` · `HOLD` / `ON HOLD`→`ON_HOLD` · `COMPLETE` |
| **R-PRIORITY** | `priority_rank` smallint + `priority_note` text + `is_rush` bool | Integers → rank (SAP and LSV 1–9; Line 5 goes up to 18). Any text → `priority_note` verbatim, rank NULL. Line 2 has `2A`, `6VMEK`, `DESK`; SSV lines have about 100 free-text values (`RUSH`, `Rush requested`, `polished`, `LINE 6`, `Hold Vanessa`, `Jesse Germ 10/07`, `260 kg`, …). `is_rush = true` when the text contains `RUSH` (any case) |
| **R-TRAIT** `trait_family_code` | `EXCELIS`, `GMO`, `FRESH`, `NONE` | `EXCELIS`/`Excelis`, `GMO`, `FRESH`/`Fresh`, blank → `NONE` |
| **R-SIZE** `size_fraction_code` | Base codes `LR`, `LF`, `MR`, `MF`, `L`, `M`, `R`, `F`, `S`, `U`, `UN`, plus heavy/light suffix `H`/`L` (`LRH`, `LRL`, `LFH`, `LFL`, `MRH`, `MRL`, `MFH`, `MFL`, `RH`, `RL`, `UH`, `UL`) | UPPER case (`mf`, `lr`, `Mr`). Remove the hyphen (`MF-H` → `MFH`, `MF-L` → `MFL`). `U`/`UN`/`US` = undersize (confirm, Q-4). `HEAVY` → NULL + note. Screen sizes `16`, `16C`, `18C` → NULL + `screen_size_note`. `/` and `12963` → NULL + DQ-11 |
| **R-FAIL** `fail_reason_code` | `COB`, `DENT`, `DISCOLORED`, `OFF_TYPE`, `BROKEN`, `SMUT`, `WEED`, `INERT`, `TARE` | `Cob`/`COB`, `Dent`, `Discolored`, `Off-Type`/`OffType`, `Broken`, `Smut`, `Weed`, `Inert`, `Tare` |
| **R-RESULT** `result_code` | `PASS`, `FAIL`, `PENDING` | `Pass`, `Fail`, blank (37 rows) → `PENDING` |
| **R-UOM** `uom_code` | `KG`, `KS` (thousand seeds) | `KG`, `KS`, `ks` |
| **R-SPECIES** `species_code` | 4 letters, upper case | `swco`→`SWCO`, `swbs`→`SWBS`. `CAME` (camelina) doesn't follow the material-description pattern (DQ-12) |
| **R-EQUIP** `work_center_id` via `ref.equipment_alias` | `ref.work_center` codes | See table below |

**R-EQUIP alias table** (every `Equipment ID` value seen → work center). Rows marked *(proposed)* need confirmation (Q-6):

| Source value (log / schedule) | `work_center_code` |
| --- | --- |
| `Line 1` (logs) | `LSVLN1` |
| `Line 2` (logs) | `LSVLN2` |
| `Gravity`, `Line 1 Gravity`, `Line 2 Gravity` | `LSVGRVTY` |
| `Colorsorter`, `Colorsorter Line 1`, `Colorsorter Line 2` | `LSVCLSRT` |
| `LINE 1`, `LINE 2`, `VMEK` **in `colorsort_schedule.csv`** (the colorsorter on that line) | `LSVCLSRT` (keep `equipment_raw`) |
| `VMEK`, `Colorsorter(VMEK)` | `LSVCLSRT` *(proposed: VMEK is a colorsorter)* |
| `Handpick` | *new* `LSVHANDPICK` *(proposed: not in Resource Info)* |
| `LINE 3(NORTH STAR)` | `SSVLN3` *(proposed)* |
| `Line 3` / `Line 5` / `Line 6` / `LINE 7` (SSV log) | `SSVLN3` / `SSVLN5` / `SSVLN6` / `SSVLN7` |

### 6.3 Placeholder and helper values

| Value | Where | Rule |
| --- | --- | --- |
| `Run Order` text (`FUMIGATED`, `Not fumi`, `Needs fumi!!`, `DESK MOVED TO LINE 2`, `MOVE TO LINE 1`, `2 INPUT BATCHES`, `CLN-2 ON HOLD`, `HAND PICK PO`, `GRAV30`, `0300099798`, …) | All schedules | `run_order` NULL, text → `run_order_note` verbatim |
| `Run Order` starred (`*1`, `*10`, `*`, `**`, `****`) | All schedules | `run_order` NULL, value → `run_order_note` verbatim; meaning = Q-7 (don't parse the number until confirmed) |
| `PSL Cleanout` = `-` | Line 1/2 | NULL |
| `PO Finished?` = `0` | Line 5 | ignored (derived column) |

### 6.4 Material description parsing (`ref.material`)

Grammar: `<SPECIES> <VARIETY…> [<TYPE>] <STATE> ZZZ BK <UOM>`. Read it from the right: the last token is `uom_code` (`KG`/`KS`), then `BK` (bulk) and `ZZZ` (filler), then `state_code`. States seen across the 1,118 distinct descriptions: `RDY` 725, `CLX` 111, `RDX` 72, `CLD` 66, `RDF` 44, `RAW` 40, `RDH` 24, `PMD` 10. The optional `type_code` comes before the state: `CRS`, `SDD`, `CRN`, `PEA`, `SDL`, `SNP`, `SWE`, `LNG`, `CRT`, `DET`, `SHT`, `HOT`, `PRC`. Single letters `S`, `T`, `U`, `V` are part of the variety (e.g. `R00565H S`). Everything between the species and the type/state is `variety_code`.

- Store the full `material_description` as the business key of `ref.material`.
- **24 descriptions don't match the grammar**: lower case (`swbs r10008 s crs clx zzz bk kg`), trailing notes (`BECO HUNTINGTON RDY ZZZ BK KG (no sizing)`, `(12 slot / 9 slot)`), truncated (`SWCO BSS1075-R`, `SPCO KUDURO RDY`), camelina (`CAMELINA SO-90`), and odd states (`SDL`, `SDLRDY`). Upper-case the description before matching. Move trailing `(…)` text to `material_note`. If it still doesn't match, set `is_parsed = false` and leave the parsed fields NULL.
- The type and state codes are inferred (Q-1).

---

## 7. Source-to-target column mapping

"Filled" = non-empty cells / data rows. Rule IDs refer to §5–§6. Target tables are in schema `ops` unless prefixed. Columns shown as `*_code` (e.g. `species_code`, `status_code`) are resolved to the matching `ref` FK or enum during the load. The source code value is kept on the row for readability.

### 7.1 SAP open-order extract → `ops.process_order (+ lineage in ops.process_order_source)`

Same column layout (and mapping) in `main.csv` (identical content) and in the per-work-center slices `lsv_line_1`, `lsv_line_2`, `lsv_colorsort`, `ssv_line_3`, `ssv_line_5`, `ssv_line_6`, `ssv_line_7`, `seed_health`. `lsv_gravity.csv` has the same columns shifted one to the right (column A is an empty spacer). `lsv_treatpack` / `ssv_treatpack` have no `Priority` column (and no data rows).

**`excel_sap_data.csv`**: Pasco › `Excel SAP data` · header row 1 · data rows 2–203 (202)

| Col | Source header | Filled | Target | Type | Rule |
| --- | --- | --- | --- | --- | --- |
| A | `Crop` | 202/202 | process_order.species_code → ref.species | text | UPPER(TRIM); must equal 1st token of Material Description |
| B | `Material \nDescription` | 202/202 | process_order.material_id → ref.material | bigint FK | TRIM + collapse spaces; parse tokens (§6.4); lookup/insert ref.material |
| C | `Prod. Order` | 202/202 | process_order.po_number (business key) | text | PO rule R-PO (§5.3) |
| D | `Output\nQty` | 202/202 | process_order.planned_output_qty | numeric(14,3) | as-is |
| E | `UOM` | 202/202 | process_order.uom_code | text enum | UPPER: KG \| KS |
| F | `Scheduled Finish Date (SAP)` | 202/202 | process_order.sap_finish_date | date | as-is (no time part in source) |
| G | `Notes:` | 202/202 | process_order.sap_notes | text | as-is; is_notes_truncated = (length = 40) |
| H | `Priority` | 50/202 | process_order.priority_rank | smallint | 1–9; blank → NULL |
| I | `PO Status` | 202/202 | process_order.sap_status | text enum | constant `NEW` (formula `="NEW"`) |
| J | `WorkCenter` | 202/202 | process_order.work_center_id → ref.work_center | bigint FK | lookup by work_center_code |
| K | `Pack Line` | 202/202 | not migrated | — | lookup result (formula); validate = ref.work_center.work_center_name |
| L | `Department` | 202/202 | not migrated | — | lookup result (formula); validate = ref.work_center.department |
| M | `Hours` | 0/202 | not migrated | — | formula, empty for all rows (Treatpack only) |
| N | `Capacity` | 0/202 | not migrated | — | formula, empty for all rows (Treatpack only) |

### 7.2 LSV line schedules → `ops.line_schedule_item`

**`line_1_schedule.csv`**: Pasco › `Line 1 Schedule` · header row 1 · data rows 2–477 (476)

| Col | Source header | Filled | Target | Type | Rule |
| --- | --- | --- | --- | --- | --- |
| A | `Run Order` | 92/476 | line_schedule_item.run_order / run_order_note | smallint / text | numeric → run_order; text (e.g. `FUMIGATED`) → run_order_note |
| B | `PO Status` | 476/476 | line_schedule_item.status_code | text enum | R-STATUS (§6.2) |
| C | `Scheduled Finish Date` | 476/476 | line_schedule_item.scheduled_finish_date | date | as-is |
| D | `Priority` | 425/476 | line_schedule_item.priority_rank / priority_note | smallint / text | R-PRIORITY (§6.2) |
| E | `PO Number` | 476/476 | line_schedule_item.process_order_id → process_order | bigint FK | R-PO; keep po_number_raw |
| F | `Crop Year` | 474/476 | lot.crop_year + lot.crop_year_suffix | smallint + text | R-CROPYEAR: `2023CL` → 2023 + `CL` |
| G | `Species` | 476/476 | process_order.species_code | text | UPPER(TRIM) |
| H | `Material Description` | 476/476 | process_order.material_id → ref.material | bigint FK | as SAP |
| I | `Lot Number` | 471/476 | line_schedule_item.lot_id → lot | bigint FK | R-LOT (§5.3) |
| J | `Input Weight (KG)` | 476/476 | line_schedule_item.input_kg | numeric(14,3) | as-is |
| K | `Excelis / GMO` | 230/476 | line_schedule_item.trait_family_code | text enum | R-TRAIT: EXCELIS \| GMO \| FRESH \| blank→NONE |
| L | `Comments` | 294/476 | line_schedule_item.comments | text | as-is |
| M | `Output Weight (KG)` | 453/476 | line_schedule_item.output_kg | numeric(14,3) | as-is |
| N | `Loss %` | 453/476 | not migrated | — | derived: 1 − output_kg / input_kg (recomputed in view; used as ETL check) |
| O | `PSL Cleanout` | 270/476 | line_schedule_item.psl_cleanout_value | numeric | `-` → NULL; meaning to confirm (Q-3) |
| P | `Duplicate Formula` | 8/476 | not migrated | — | helper column |
| Q | `Loss Helper` | 476/476 | not migrated | — | helper (Good/Bad flag) |
| R | `PO Finished?` | 476/476 | not migrated | — | derived from status_code; used as ETL check |
| S | `Warehouse Staging Link` | 476/476 | not migrated | — | constant 0 |

**`line_2_schedule.csv`**: Pasco › `Line 2 Schedule` · header row 1 · data rows 2–443 (442)

| Col | Source header | Filled | Target | Type | Rule |
| --- | --- | --- | --- | --- | --- |
| A | `Run Order` | 176/442 | line_schedule_item.run_order / run_order_note | smallint / text | numeric → run_order; text (e.g. `FUMIGATED`) → run_order_note |
| B | `PO Status` | 442/442 | line_schedule_item.status_code | text enum | R-STATUS (§6.2) |
| C | `Scheduled Finish Date` | 442/442 | line_schedule_item.scheduled_finish_date | date | as-is |
| D | `Priority` | 366/442 | line_schedule_item.priority_rank / priority_note | smallint / text | R-PRIORITY (§6.2) |
| E | `PO Number` | 442/442 | line_schedule_item.process_order_id → process_order | bigint FK | R-PO; keep po_number_raw |
| F | `Crop Year` | 438/442 | lot.crop_year + lot.crop_year_suffix | smallint + text | R-CROPYEAR: `2023CL` → 2023 + `CL` |
| G | `Species` | 442/442 | process_order.species_code | text | UPPER(TRIM) |
| H | `Material Description` | 442/442 | process_order.material_id → ref.material | bigint FK | as SAP |
| I | `Lot Number` | 432/442 | line_schedule_item.lot_id → lot | bigint FK | R-LOT (§5.3) |
| J | `Input Weight (KG)` | 442/442 | line_schedule_item.input_kg | numeric(14,3) | as-is |
| K | `Excelis / GMO` | 147/442 | line_schedule_item.trait_family_code | text enum | R-TRAIT: EXCELIS \| GMO \| FRESH \| blank→NONE |
| L | `Comments` | 432/442 | line_schedule_item.comments | text | as-is |
| M | `Output Weight (KG)` | 403/442 | line_schedule_item.output_kg | numeric(14,3) | as-is |
| N | `Loss %` | 403/442 | not migrated | — | derived: 1 − output_kg / input_kg (recomputed in view; used as ETL check) |
| O | `PSL Cleanout` | 98/442 | line_schedule_item.psl_cleanout_value | numeric | `-` → NULL; meaning to confirm (Q-3) |
| P | `Week Number` | 0/442 | not migrated | — | empty |
| Q | `Duplicate Formula` | 0/442 | not migrated | — | helper column |
| R | `Loss Helper` | 442/442 | not migrated | — | helper (Good/Bad flag) |
| S | `PO Finished?` | 442/442 | not migrated | — | derived from status_code; used as ETL check |

**`gravity_schedule.csv`**: Pasco › `Gravity Schedule` · header row 1 · data rows 2–918 (917)

| Col | Source header | Filled | Target | Type | Rule |
| --- | --- | --- | --- | --- | --- |
| A | `PO Status` | 917/917 | line_schedule_item.status_code | text enum | R-STATUS (§6.2) |
| B | `Run Order` | 441/917 | line_schedule_item.run_order / run_order_note | smallint / text | numeric → run_order; text (e.g. `FUMIGATED`) → run_order_note |
| C | `Scheduled Finish Date` | 909/917 | line_schedule_item.scheduled_finish_date | date | as-is |
| D | `Priority` | 127/917 | line_schedule_item.priority_rank / priority_note | smallint / text | R-PRIORITY (§6.2) |
| E | `PO Number` | 917/917 | line_schedule_item.process_order_id → process_order | bigint FK | R-PO; keep po_number_raw |
| F | `Crop Year` | 872/917 | lot.crop_year + lot.crop_year_suffix | smallint + text | R-CROPYEAR: `2023CL` → 2023 + `CL` |
| G | `SWCO/SWBS` | 917/917 | process_order.species_code | text | UPPER(TRIM) (`swco` → `SWCO`) |
| H | `Material Description` | 917/917 | process_order.material_id → ref.material | bigint FK | as SAP |
| I | `Dup Check` | 1/917 | not migrated | — | helper column |
| J | `Lot Number` | 912/917 | line_schedule_item.lot_id → lot | bigint FK | R-LOT (§5.3) |
| K | `Size` | 903/917 | line_schedule_item.size_fraction_code | text enum | R-SIZE (§6.2) |
| L | `Input Weight (KG)` | 917/917 | line_schedule_item.input_kg | numeric(14,3) | as-is |
| M | `Excelis/GMO` | 662/917 | line_schedule_item.trait_family_code | text enum | R-TRAIT |
| N | `Comments` | 911/917 | line_schedule_item.comments | text | as-is |
| O | `Duplicate Formula` | 0/917 | not migrated | — | helper column |
| P | `GM Finder` | 31/917 | not migrated | — | helper (TRUE when GMO) |

**`colorsort_schedule.csv`**: Pasco › `Colorsort Schedule` · header row 1 · data rows 2–407 (406)

| Col | Source header | Filled | Target | Type | Rule |
| --- | --- | --- | --- | --- | --- |
| A | `PO Status` | 406/406 | line_schedule_item.status_code | text enum | R-STATUS (§6.2) |
| B | `Equipment ID` | 168/406 | line_schedule_item.work_center_id (via ref.equipment_alias) | bigint FK | R-EQUIP (§6.2) |
| C | `Scheduled Finish Date` | 406/406 | line_schedule_item.scheduled_finish_date | date | as-is |
| D | `Priority` | 16/406 | line_schedule_item.priority_rank / priority_note | smallint / text | R-PRIORITY (§6.2) |
| E | `PO Number` | 406/406 | line_schedule_item.process_order_id → process_order | bigint FK | R-PO; keep po_number_raw |
| F | `Crop Year` | 367/406 | lot.crop_year + lot.crop_year_suffix | smallint + text | R-CROPYEAR: `2023CL` → 2023 + `CL` |
| G | `SWCO/SWBS` | 406/406 | process_order.species_code | text | UPPER(TRIM) (`swco` → `SWCO`) |
| H | `Material Description` | 406/406 | process_order.material_id → ref.material | bigint FK | as SAP |
| I | `Lot Number` | 403/406 | line_schedule_item.lot_id → lot | bigint FK | R-LOT (§5.3) |
| J | `Size` | 398/406 | line_schedule_item.size_fraction_code | text enum | R-SIZE (§6.2) |
| K | `Input Weight (KG)` | 406/406 | line_schedule_item.input_kg | numeric(14,3) | as-is |
| L | `Excelis/GMO` | 299/406 | line_schedule_item.trait_family_code | text enum | R-TRAIT |
| M | `Comments` | 401/406 | line_schedule_item.comments | text | as-is |
| N | `Duplicate Formula` | 0/406 | not migrated | — | helper column |

### 7.3 SSV line schedules (Phase 2) → `ops.line_schedule_item`

**`line_3_schedule.csv`**: Pasco › `Line 3 Schedule` · header row 1 · data rows 2–277 (276)

| Col | Source header | Filled | Target | Type | Rule |
| --- | --- | --- | --- | --- | --- |
| A | `Run Order` | 84/276 | line_schedule_item.run_order / run_order_note | smallint / text | numeric → run_order; text (e.g. `FUMIGATED`) → run_order_note |
| B | `PO Status` | 276/276 | line_schedule_item.status_code | text enum | R-STATUS (§6.2) |
| C | `Priority` | 82/276 | line_schedule_item.priority_rank / priority_note | smallint / text | R-PRIORITY (§6.2) |
| D | `PO Number` | 276/276 | line_schedule_item.process_order_id → process_order | bigint FK | R-PO; keep po_number_raw |
| E | `Species` | 276/276 | process_order.species_code | text | UPPER(TRIM) |
| F | `Material Description` | 276/276 | process_order.material_id → ref.material | bigint FK | as SAP |
| G | `Lot Number` | 216/276 | line_schedule_item.lot_id → lot | bigint FK | R-LOT (§5.3) |
| H | `Input Quantity` | 276/276 | line_schedule_item.input_qty | numeric(14,3) | as-is |
| I | `UoM` | 276/276 | line_schedule_item.uom_code | text enum | UPPER: KG \| KS (`ks` → `KS`) |
| J | `Scheduled Finish Date` | 274/276 | line_schedule_item.scheduled_finish_date | date | as-is |
| K | `Comments` | 271/276 | line_schedule_item.comments | text | as-is |
| L | `SAP Finish Date` | 23/276 | line_schedule_item.original_finish_date | date | as-is |
| M | `Delay in Days` | 23/276 | not migrated | — | derived: scheduled − original finish (days) |
| N | `PO Finished?` | 210/276 | not migrated | — | derived; contains `0` and `Complete` |

**`line_5_schedule.csv`**: Pasco › `Line 5 Schedule` · header row 1 · data rows 2–1067 (1066)

| Col | Source header | Filled | Target | Type | Rule |
| --- | --- | --- | --- | --- | --- |
| A | `Run Order` | 485/1066 | line_schedule_item.run_order / run_order_note | smallint / text | numeric → run_order; text (e.g. `FUMIGATED`) → run_order_note |
| B | `PO Status` | 1066/1066 | line_schedule_item.status_code | text enum | R-STATUS (§6.2) |
| C | `Priority` | 271/1066 | line_schedule_item.priority_rank / priority_note | smallint / text | R-PRIORITY (§6.2) |
| D | `PO Number` | 1066/1066 | line_schedule_item.process_order_id → process_order | bigint FK | R-PO; keep po_number_raw |
| E | `Species` | 1066/1066 | process_order.species_code | text | UPPER(TRIM) |
| F | `Material Description` | 1066/1066 | process_order.material_id → ref.material | bigint FK | as SAP |
| G | `Lot Number` | 1022/1066 | line_schedule_item.lot_id → lot | bigint FK | R-LOT (§5.3) |
| H | `Input Quantity` | 1065/1066 | line_schedule_item.input_qty | numeric(14,3) | as-is |
| I | `UoM` | 1066/1066 | line_schedule_item.uom_code | text enum | UPPER: KG \| KS (`ks` → `KS`) |
| J | `Scheduled Finish Date` | 1066/1066 | line_schedule_item.scheduled_finish_date | date | as-is |
| K | `Comments` | 1050/1066 | line_schedule_item.comments | text | as-is |
| L | `PO Finished?` | 889/1066 | not migrated | — | derived; contains `0` and `Complete` |
| M | `Original Scheduled  Finish Date` | 168/1066 | line_schedule_item.original_finish_date | date | as-is (header has 2 spaces) |
| N | `Delay in Days` | 168/1066 | not migrated | — | derived: scheduled − original finish (days) |

**`line_6_schedule.csv`**: Pasco › `Line 6 Schedule` · header row 1 · data rows 2–485 (484)

| Col | Source header | Filled | Target | Type | Rule |
| --- | --- | --- | --- | --- | --- |
| A | `Run Order` | 114/484 | line_schedule_item.run_order / run_order_note | smallint / text | numeric → run_order; text (e.g. `FUMIGATED`) → run_order_note |
| B | `PO Status` | 484/484 | line_schedule_item.status_code | text enum | R-STATUS (§6.2) |
| C | `Priority` | 67/484 | line_schedule_item.priority_rank / priority_note | smallint / text | R-PRIORITY (§6.2) |
| D | `PO Number` | 484/484 | line_schedule_item.process_order_id → process_order | bigint FK | R-PO; keep po_number_raw |
| E | `Species` | 484/484 | process_order.species_code | text | UPPER(TRIM) |
| F | `Material Description` | 484/484 | process_order.material_id → ref.material | bigint FK | as SAP |
| G | `Lot Number` | 463/484 | line_schedule_item.lot_id → lot | bigint FK | R-LOT (§5.3) |
| H | `Input Quantity` | 484/484 | line_schedule_item.input_qty | numeric(14,3) | as-is |
| I | `UoM` | 484/484 | line_schedule_item.uom_code | text enum | UPPER: KG \| KS (`ks` → `KS`) |
| J | `Scheduled Finish Date` | 484/484 | line_schedule_item.scheduled_finish_date | date | as-is |
| K | `Comments` | 482/484 | line_schedule_item.comments | text | as-is |
| L | `Original SAP Finish Date` | 137/484 | line_schedule_item.original_finish_date | date | as-is |
| M | `Day Count` | 137/484 | not migrated | — | derived: same as Delay in Days |

### 7.4 Conditioning logs → `ops.conditioning_run`

**`lsv_conditioning_logs.csv`**: Pasco › `LSV Conditioning Logs` · header row 1 · data rows 2–1900 (1899)

| Col | Source header | Filled | Target | Type | Rule |
| --- | --- | --- | --- | --- | --- |
| A | `PO Number` | 1899/1899 | conditioning_run.process_order_id + po_number_raw | bigint FK + text | R-PO; unmatched → process_order_id NULL + dq flag |
| B | `Equipment ID` | 1899/1899 | conditioning_run.work_center_id + equipment_raw | bigint FK + text | R-EQUIP |
| C | `Operator` | 1728/1899 | conditioning_run.operator_name | text | TRIM; personal data (§7 DQ-19) |
| D | `Date` | 1899/1899 | conditioning_run.run_date | date | as-is |
| E | `Crop Year` | 1899/1899 | lot.crop_year + crop_year_suffix | smallint + text | R-CROPYEAR |
| F | `Species` | 1899/1899 | conditioning_run.species_code | text | UPPER(TRIM) |
| G | `Variety Name` | 1899/1899 | conditioning_run.variety_code | text | UPPER(TRIM); joins ref.material.variety_code |
| H | `Lot Number` | 1899/1899 | conditioning_run.lot_id → lot | bigint FK | R-LOT |
| I | `Input KG` | 1899/1899 | conditioning_run.input_kg | numeric(14,3) | as-is |
| J | `Prep Time (Hours)` | 1899/1899 | conditioning_run.prep_h | numeric(6,2) | R-NUM (`..42` → NULL + flag) |
| K | `Run Time (Hours)` | 1899/1899 | conditioning_run.run_h | numeric(6,2) | R-NUM (`14..5` → NULL + flag) |
| L | `Cleandown Time (Hours)` | 1899/1899 | conditioning_run.cleandown_h | numeric(6,2) | R-NUM |
| M | `Output KGs` | 1899/1899 | conditioning_run.output_kg | numeric(14,3) | as-is |
| N | `Loss KG` | 1899/1899 | conditioning_run.loss_kg | numeric(14,3) | as-is; check = input − output; negative → flag |
| O | `Scrap Rate` | 1899/1899 | not migrated | — | derived: loss_kg / input_kg |
| P | `KG per hour` | 1899/1899 | not migrated | — | derived: input_kg / run_h (Excel errors in source) |
| Q | `KG per Total hour` | 1899/1899 | not migrated | — | derived: input_kg / (prep_h + run_h + cleandown_h) |
| R | `RAW KG per hour` | 1899/1899 | not migrated | — | derived (raw-weight basis) |
| S | `RAW KG per Total hour` | 1899/1899 | not migrated | — | derived (raw-weight basis) |
| T | `Week` | 1899/1899 | not migrated | — | constant `Week` |
| U | `Week Number` | 1899/1899 | not migrated | — | derived from run_date (ISO week) |
| V | `Year` | 1899/1899 | not migrated | — | derived from run_date |
| W | `Week Info` | 1899/1899 | not migrated | — | derived from run_date |
| X | `Size Fraction` | 771/1899 | conditioning_run.size_fraction_code | text enum | R-SIZE |

**`ssv_conditioning_logs.csv`**: Pasco › `SSV Conditioning Logs` · header row 1 · data rows 2–2231 (2230)

| Col | Source header | Filled | Target | Type | Rule |
| --- | --- | --- | --- | --- | --- |
| A | `PO Number` | 2230/2230 | conditioning_run.process_order_id + po_number_raw | bigint FK + text | R-PO; unmatched → process_order_id NULL + dq flag |
| B | `Equipment ID` | 2230/2230 | conditioning_run.work_center_id + equipment_raw | bigint FK + text | R-EQUIP |
| C | `Operator` | 2230/2230 | conditioning_run.operator_name | text | TRIM; personal data (§7 DQ-19) |
| D | `Date` | 2230/2230 | conditioning_run.run_date | date | as-is |
| E | `Species` | 2230/2230 | conditioning_run.species_code | text | UPPER(TRIM) |
| F | `Variety Name` | 2230/2230 | conditioning_run.variety_code | text | UPPER(TRIM); joins ref.material.variety_code |
| G | `Lot Number` | 2230/2230 | conditioning_run.lot_id → lot | bigint FK | R-LOT |
| H | `Input KG` | 2230/2230 | conditioning_run.input_kg | numeric(14,3) | as-is |
| I | `Prep Time (Hours)` | 2230/2230 | conditioning_run.prep_h | numeric(6,2) | R-NUM (`..42` → NULL + flag) |
| J | `Run Time (Hours)` | 2230/2230 | conditioning_run.run_h | numeric(6,2) | R-NUM (`14..5` → NULL + flag) |
| K | `Cleandown Time (Hours)` | 2230/2230 | conditioning_run.cleandown_h | numeric(6,2) | R-NUM |
| L | `Output KGs` | 2229/2230 | conditioning_run.output_kg | numeric(14,3) | as-is |
| M | `Loss KG` | 2230/2230 | conditioning_run.loss_kg | numeric(14,3) | as-is; check = input − output; negative → flag |
| N | `Loss %` | 2230/2230 | not migrated | — | derived: loss_kg / input_kg |
| O | `KG per hour` | 2230/2230 | not migrated | — | derived: input_kg / run_h (Excel errors in source) |
| P | `Defect Comments` | 852/2230 | conditioning_run.defect_comments | text | as-is |
| Q | `Year` | 2230/2230 | not migrated | — | derived from run_date |

### 7.5 Pass/fail log → `ops.quality_test`

**`lsv_pass_fail_log.csv`**: Pasco › `LSV Pass_Fail Log` · header row 1 · data rows 2–3143 (3142)

| Col | Source header | Filled | Target | Type | Rule |
| --- | --- | --- | --- | --- | --- |
| A | `PO Number` | 3142/3142 | quality_test.process_order_id + po_number_raw | bigint FK + text | R-PO |
| B | `Date` | 3142/3142 | quality_test.test_date | date | as-is |
| C | `Equiment ID` | 3142/3142 | quality_test.work_center_id + equipment_raw | bigint FK + text | R-EQUIP (header typo `Equiment`) |
| D | `Crop Year` | 3142/3142 | lot.crop_year + crop_year_suffix | smallint + text | R-CROPYEAR |
| E | `Specie` | 3142/3142 | quality_test.species_code | text | UPPER(TRIM) (header typo `Specie`) |
| F | `Variety` | 3142/3142 | quality_test.variety_code | text | UPPER(TRIM) |
| G | `Lot Number` | 3142/3142 | quality_test.lot_id → lot | bigint FK | R-LOT |
| H | `Size Fraction` | 2801/3142 | quality_test.size_fraction_code | text enum | R-SIZE |
| I | `KGs` | 3142/3142 | quality_test.batch_kg | numeric(14,3) | as-is |
| J | `Output Batch` | 3142/3142 | quality_test.output_batch_number | bigint | as-is; not unique (§5.4) |
| K | `Pass/Fail` | 3105/3142 | quality_test.result_code | text enum | PASS \| FAIL \| blank → PENDING |
| L | `Failed for` | 799/3142 | quality_test.fail_reason_code | text enum | R-FAIL (§6.2) |
| M | `Raw Germ` | 766/3142 | quality_test.raw_germ_fraction | numeric(5,4) | R-NUM; `NA`/`None` → NULL; 0–1 |
| N | `Ready Germ` | 1544/3142 | quality_test.ready_germ_fraction | numeric(5,4) | R-NUM; 0–1 |
| O | `Germ Difference` | 489/3142 | not migrated | — | derived: ready − raw (`#INVALID OPERATION` in source) |
| P | `Raw Vigor` | 665/3142 | quality_test.raw_vigor_fraction | numeric(5,4) | R-NUM; 0–1 |
| Q | `Ready Vigor` | 1411/3142 | quality_test.ready_vigor_fraction | numeric(5,4) | R-NUM; 0–1 |
| R | `Vigor Difference` | 244/3142 | not migrated | — | derived: ready − raw |
| S | `Comments` | 894/3142 | quality_test.comments | text | as-is |

### 7.6 Routing and reference → `ops.process_order_work_center · ref.work_center`

**`components.csv`**: Worksheet › `Components` · header row 2 · data rows 3–216 (214)

| Col | Source header | Filled | Target | Type | Rule |
| --- | --- | --- | --- | --- | --- |
| A | `Process Order` | 214/214 | process_order_work_center.process_order_id | bigint FK | R-PO |
| B | `Resource` | 214/214 | process_order_work_center.work_center_id | bigint FK | lookup by work_center_code |

**`resource_info.csv`**: Worksheet › `Resource Info` · header row 1 · data rows 2–32 (31)

| Col | Source header | Filled | Target | Type | Rule |
| --- | --- | --- | --- | --- | --- |
| A | `Work Center` | 31/31 | ref.work_center.work_center_code (business key) | text | UPPER(TRIM) |
| B | `Pack Line` | 31/31 | ref.work_center.work_center_name | text | TRIM (not unique: `SSV S60` ×2) |
| C | `Department` | 31/31 | ref.work_center.department | text | TRIM |

---

## 8. Data quality catalog

Row numbers are Excel rows, which are also CSV record numbers. Each issue is stored on the target row as a code in `dq_flags`. **As built (2026-09-30):** the counts that `backend/database/etl/build_model.py` computes and reconciles are in [uc1-data-model.md §3.1](../../../../backend/data-model/uc1-data-model.md). They are the authoritative ones: DQ-02, -03, -06, -07, -08, -12 and -23 differ from the counts below. **Severity:** 🔴 blocks a join or key · 🟠 wrong or missing value · 🟡 cosmetic / standardization.

| ID | Sev | Issue | Where (count) | ETL action |
| --- | --- | --- | --- | --- |
| DQ-01 | 🟠 | Excel error text in numeric cells (**26 cells**) | LSV log: `KG per hour`, `KG per Total hour`, `RAW KG per hour`, `RAW KG per Total hour` (4 each: `#DIVIDE BY ZERO` 3 + `#INVALID OPERATION` 1, the same rows 898, 904, 905, 1670); SSV log `KG per hour` (`#INVALID OPERATION` 2); pass/fail `Germ Difference` (`#INVALID OPERATION` 8) | Derived columns, not migrated; recompute |
| DQ-02 | 🟠 | Malformed numbers | LSV log `Run Time (Hours)` = `14..5` (1); SSV log `Prep Time (Hours)` = `..42` (1) | NULL + flag; don't guess |
| DQ-03 | 🔴 | Suspect PO numbers (typo/truncation) | LSV log: `100184897` (row 2), `30006015` (606), `30098665` (840), `200007268` (907); SSV log: `10020117755` (215), `1.16`, `1000216-922`; Line 6: `3001007703` (305) | `po_number` NULL, keep `po_number_raw`, match manually via the lot |
| DQ-04 | 🔴 | Placeholder PO values | `Off System`/`OFF SYSTEM`/`OFF-SYSTEM`: Line 1 (8), Line 2 (1), Line 3 (3); `BAYER 1–4`: LSV log (4, rows 898–905) | `is_off_system = true`, `po_number` NULL |
| DQ-05 | 🟠 | Full duplicate rows | LSV log 7 (rows 293–295, 357–358, 1005–1006); pass/fail 2 (1281–1282); SSV log 6 (153/167, 1586/1592, 1821/1824) | Load all + flag; decision = Q-5 |
| DQ-06 | 🟠 | Same PO twice in one schedule tab | Line 5 `300101284` (852, 854); Line 6 `1002256377` (318, 341) | Load both + flag |
| DQ-07 | 🟡 | PO with a leading zero | SSV log 95; Line 5 3 (e.g. `0300097772`) | Strip the zero, then R-PO |
| DQ-08 | 🔴 | Lot/batch number in the PO column (`MANUALLY ADDED SHIPMENT`) | Line 3 21, Line 5 11, Line 6 9, SSV log 28 (`150…`/`151…`) | Value → `lot_number`; `is_manual_shipment = true` |
| DQ-09 | 🟡 | Inconsistent case/labels | Trait `EXCELIS`/`Excelis`, `FRESH`/`Fresh`; species `swco`/`swbs`; fail reason `Cob`/`COB`, `Off-Type`/`OffType`; UoM `ks`; size `mf`/`lr`/`Mr`, `MF-H` | §6.2 enums |
| DQ-10 | 🟡 | Text instead of empty in numeric columns | Pass/fail germ/vigor: `NA` (Raw Germ 28, Ready Germ 497, Raw Vigor 236, Ready Vigor 639), `None` (Raw Germ 8); `PSL Cleanout` `-` (Line 1 12) | NULL |
| DQ-11 | 🟡 | Invalid size values | `/` (1), `12963` (1), `HEAVY` (2), screen sizes `16`, `16C`, `18C` | NULL + note |
| DQ-12 | 🟡 | Material description off-grammar | 24 of 1,118 distinct descriptions (lower case, trailing `(…)`, truncated, camelina `CAME`) | `is_parsed = false` |
| DQ-13 | 🟠 | Negative loss (output > input) | SSV log 1 (row 3: 7.54 in → 9.02 out). Loss = input − output holds for all other rows | Keep + flag |
| DQ-14 | 🟡 | SAP notes cut at 40 characters | `Excel SAP data` `Notes:` 20 of 202 | `is_notes_truncated = true` |
| DQ-15 | 🟠 | Overdue "open" POs | `Excel SAP data`: 103 of 202 have an SAP finish date before 2026-09-28 (earliest 2025-10-15) | Keep; this is the **at-risk signal** for UC1 |
| DQ-16 | 🟠 | Status conflict SAP vs schedule | 3 of the 15 `LSVLN1` POs are `NEW` in SAP but `COMPLETE` in `Line 1 Schedule` | Schedule status wins for the queue; flag both |
| DQ-17 | 🟡 | Free text in `Priority` / `Run Order` | Line 2 3 values; SSV lines about 100 distinct; run order in every schedule | §6.2 R-PRIORITY, §6.3 |
| DQ-18 | 🟠 | QA result incomplete or contradictory | Blank `Pass/Fail` 37; `Fail` with no reason 25; `Pass` with a reason 12 | `PENDING`; keep reason as-is + flag |
| DQ-19 | 🟡 | Personal data | `Operator` (LSV 18 names, 171 blank; SSV 9 names); names in `Priority`/`Comments` (`Vanessa`, `Liz`, `Jesse`, `Juhi`) | Keep for the demo; pseudonymize before any shared or production use |
| DQ-20 | 🟠 | Values computed from an external workbook | `Excel SAP data` `WorkCenter`/`Pack Line`/`Department` (VLOOKUP to `Plant Schedules.xlsx`) | Validate against `components.csv` + `resource_info.csv` |
| DQ-21 | 🟡 | Mixed crop-year formats | `2023` vs `2023CL` (int and text in one column) | R-CROPYEAR |
| DQ-22 | 🟠 | Equipment naming drift | 12 LSV spellings (`Line 1 Gravity`, `Colorsorter(VMEK)`, `LINE 3(NORTH STAR)`, …); `Handpick` has no work center | R-EQUIP alias table |
| DQ-23 | 🟠 | Log POs missing from every schedule and from SAP | LSV log 10 of 1,886; pass/fail 2 of 1,857; SSV log 624 of 2,202 (SSV schedules start 2024-07, logs 2024-01) | Load with `process_order_id` NULL (the PO row is created from the log) |
| DQ-24 | 🟡 | Helper/derived columns mixed with data | `Loss Helper`, `Duplicate Formula`, `Dup Check`, `GM Finder`, `Warehouse Staging Link`, `Week*`, rates | Not migrated (§7) |

**Join health (good news):** 453 of 470 Line 1 POs have a conditioning log; 1,850 of 1,888 logged LSV POs have QA rows; all 12 open Line 1 POs (7 NEW · 4 RELEASED · 1 ONLINE) are in the SAP extract.

---

## 9. Core data model

> **Implemented (v3):** the target layers are now `silver` (this section's `ref.*` and `ops.*` tables) and `gold` (the `plan.*` tables, plus `changeover_rule` and `reason_code`). See [uc1-data-model.md §5](../../../../backend/data-model/uc1-data-model.md). `etl.load` is covered by `raw.load_batch`.

Extends [`uc1-data-model.md`](../../../../backend/data-model/uc1-data-model.md) §5 with the key standard (§5) and two refinements found while profiling:

- `process_order` gets a **surrogate PK**, because the PO number isn't clean (DQ-03/04/08).
- **`line_schedule_item`** is a new table, because POs appear on several lines.

### 9.1 Entities, grain and keys

| Schema.table | Grain (one row per…) | PK | Business key (UNIQUE) | Main FKs | Sources |
| --- | --- | --- | --- | --- | --- |
| `ref.species` | species code | `species_id` | `species_code` | — | all `Crop`/`Species` columns |
| `ref.material` | material description | `material_id` | `material_description` (upper, trimmed) | `species_id` | all `Material Description` columns |
| `ref.work_center` | work center | `work_center_id` | `work_center_code` | — | `resource_info.csv` (31) + `LSVHANDPICK` (proposed) |
| `ref.equipment_alias` | source equipment spelling (+ source tab) | `equipment_alias_id` | (`source_csv`, `alias`) | `work_center_id` | §6.2 R-EQUIP |
| `ref.changeover_rule` | work center × transition type | `changeover_rule_id` | (`work_center_id`, `transition_code`) | `work_center_id` | derived from logs (data model §4.3) |
| `ops.lot` | seed lot | `lot_id` | `lot_number` | `species_id` | all `Lot Number` columns + `150…` values in PO columns |
| **`ops.process_order`** | **PO (the batch)** | `process_order_id` | `po_number` (R-PO; NULL for placeholders, partial unique index) | `material_id`, `lot_id`, `work_center_id` (SAP) | `excel_sap_data.csv` first, then schedules, then logs |
| `ops.process_order_source` | PO × source row | `process_order_source_id` | (`source_csv`, `source_row_number`) | `process_order_id` | every row that created or updated a PO |
| `ops.process_order_work_center` | PO × routed work center | `process_order_work_center_id` | (`process_order_id`, `work_center_id`) | both | `components.csv` |
| **`ops.line_schedule_item`** | **PO on one work-center schedule** | `line_schedule_item_id` | (`process_order_id`, `work_center_id`) where PO not NULL; duplicates DQ-06 allowed via flag | `process_order_id`, `work_center_id`, `lot_id` | 7 `*_schedule.csv` files |
| `ops.conditioning_run` | one logged run | `conditioning_run_id` | *none natural*: (`source_csv`, `source_row_number`) | `process_order_id` (nullable), `work_center_id`, `lot_id` | `lsv_/ssv_conditioning_logs.csv` |
| `ops.quality_test` | one output-batch test | `quality_test_id` | *none natural*: (`source_csv`, `source_row_number`); `output_batch_number` indexed, not unique | `process_order_id`, `lot_id`, `work_center_id` | `lsv_pass_fail_log.csv` |
| `ops.customer_order` | customer order line (**synthetic**) | `customer_order_id` | `order_number` | `material_id` | seed file (not in the extracts) |
| `ops.order_allocation` | order × PO | `order_allocation_id` | (`customer_order_id`, `process_order_id`) | both | seed / heuristic |
| `plan.*` | runtime plans, entries, reasons, events, decisions | `<table>_id` | see data model §5.3 | `process_order_id`, `work_center_id` | written by the Data API |
| `etl.load` | one ETL execution | `load_id` | — | — | `source_file_sha256`, started/finished, row counts, DQ counts |

Every `ops` row also carries `source_csv`, `source_row_number`, `source_file_sha256`, `load_id` and `dq_flags` (§5.3).

### 9.2 Relationships

```text
ref.species 1─N ref.material 1─N ops.process_order N─1 ops.lot N─1 ref.species
                                      │ 1
          ┌───────────────────────────┼─────────────────────────────┬──────────────────────┐
          │ N                         │ N                           │ N                    │ N
ops.line_schedule_item      ops.conditioning_run           ops.quality_test     ops.order_allocation N─1 ops.customer_order
          │ N─1                       │ N─1                         │ N─1
          └──────────────► ref.work_center ◄── ref.equipment_alias
                                  │ 1
                                  N
                     plan.schedule_plan 1─N plan.schedule_entry 1─N plan.entry_reason
                                  ▲ plan.plan_event        plan.plan_decision
```

### 9.3 Load order (respects the FKs)

1. `etl.load` (hash the source files)
2. `raw.*` (all 32 CSVs, verbatim)
3. `ref.work_center` → `ref.equipment_alias` → `ref.species` → `ref.material`
4. `ops.lot`
5. `ops.process_order`: SAP first (authoritative attributes), then schedules, then logs (they only add missing POs) → `ops.process_order_source`
6. `ops.process_order_work_center`, `ops.line_schedule_item`
7. `ops.conditioning_run`, `ops.quality_test`
8. seeds: `ops.customer_order`, `ops.order_allocation`, `ref.changeover_rule`
9. reconciliation checks (below)

### 9.4 Reconciliation checks (must pass after every load)

| Check | Expected |
| --- | --- |
| `raw` row counts = data rows in §4 | exact match per CSV |
| `ops.process_order` rows from SAP | 202 |
| `Worksheet` slices vs `excel_sap_data` by `WorkCenter` | 15 / 40 / 22 / 16 / 42 / 24 / 43 |
| `ops.line_schedule_item` rows | 476 + 442 + 917 + 406 + 276 + 1,066 + 484 = 4,067 |
| `ops.conditioning_run` rows | 1,899 (LSV) + 2,230 (SSV) = 4,129 |
| `ops.quality_test` rows | 3,142 |
| Open Line 1 queue (`LSVLN1`, status not `COMPLETE`) | 12 POs |
| Every `ops` row traces to a `raw` row | 100 % (`source_csv`, `source_row_number`) |
| Each DQ flag count = §8 | exact match |

---

## 10. Open questions (for Syngenta)

| ID | Question |
| --- | --- |
| Q-1 | Meaning of the material state tokens (`RDY`, `RDX`, `RDF`, `RDH`, `CLX`, `CLD`, `PMD`) and type tokens (`CRS`, `CRN`, `CRT`, `SDD`, `SDL`, `SNP`, …) |
| Q-2 | What does the `CL` suffix on crop year mean (`2023CL`)? |
| Q-3 | What is `PSL Cleanout` (values like `0.161`, `14.5`)? Same unit in Line 1 and Line 2? |
| Q-4 | Size fractions: confirm `L/M` × `R/F`, the `H`/`L` suffixes, and `U`/`UN`/`US`/`S` |
| Q-5 | Are fully duplicated log rows double entries (drop) or real repeat runs (keep)? |
| Q-6 | Equipment mapping: is `VMEK` the LSV colorsorter? Does `Handpick` need its own work center? Is `LINE 3(NORTH STAR)` SSV Line 3? |
| Q-7 | What does a starred run order mean (`*1`, `**`)? Tentative position? |
| Q-8 | Which source is authoritative for PO status when SAP (`NEW`) and the line schedule (`COMPLETE`) disagree (DQ-16)? |
| Q-9 | What are the `BAYER 1–4` runs (toll processing for a third party)? Should they be in the capacity baseline? |
| Q-10 | Should `Operator` names be kept, or pseudonymized for the hackathon deliverable? |
