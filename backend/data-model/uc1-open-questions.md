# UC1 — Open questions for Syngenta (data model and use case)

**Owner:** Data API (Camilo) · **Date:** 2026-09-30 · **Evidence:** built model on the dev database (`silver` / `gold`, load_id 1)
**Related:** [uc1-data-model.md](./uc1-data-model.md) · [observations.md](../../Hackathon%202026%20-%20Use%20Cases/Hackathon%202026-UseCases/UC1%20-%20Plant%20Capacity%20Utilization/data_sources/observations.md) §8 (DQ catalog) and §10 (Q-1…Q-10) · [uc1-system-blueprint.md](../../docs/hackathon/uc1-system-blueprint.md)

This is the single list of questions to raise with Syngenta. It merges observations Q-1…Q-10 and the model questions (uc1-data-model §9, 1–7) with the questions found while building and testing the model. Each question states:
- the **evidence** in the extract,
- what the model **assumes today** (so the demo runs),
- the **impact** if the assumption is wrong.

Priority:
- **A:** changes the UC1 ranking or the demo story.
- **B:** changes the data model or the numbers.
- **C:** data hygiene or labels.

Row numbers are Excel rows. Former IDs are shown as *(was …)*.

---

## A. Scheduling rules — they change the ranked queue and the demo

| ID | Question | Evidence in the data | Model assumes today | Impact if wrong |
| --- | --- | --- | --- | --- |
| **SQ-01** | **Is fumigation a constraint on the run order?** Can a batch marked `Needs fumi!!` or `Not fumi` run before it is fumigated, and how long does fumigation take? | `Run Order` of the 12 open Line 1 POs holds fumigation status, not a position: 5 `FUMIGATED`, 2 `Not fumi`, 1 `Needs fumi!!` (e.g. `1002266889`). The running PO `1002267630` is `Not fumi`. 505 text run-order values across the schedules | Kept as `run_order_note`; **ignored by the ranking** | A batch that can't run yet may be placed first. The likely fix is a hard `NOT_READY` rule plus a release time |
| **SQ-02** | **Which date is the commitment the scheduler protects:** the SAP `Scheduled Finish Date` or the line schedule's `Scheduled Finish Date`? | For the 15 SAP POs on LSVLN1 they disagree, e.g. `1002295402` SAP 2026-12-30 vs schedule 2026-10-10; `1002266889` SAP 2026-08-31 vs schedule 2026-10-07 | Due date = earliest of the schedule finish and the (synthetic) customer need-by. SAP date shown for reference | Wrong at-risk flags and wrong urgency order |
| **SQ-03** | **Are overdue "open" SAP dates maintained?** 103 of 202 open SAP POs have a finish date before 2026-09-28 (earliest 2025-10-15). Are they late, or are the dates just not updated? | DQ-15 | Treated as the at-risk signal | If the dates are stale, the "at risk" story is noise |
| **SQ-04** | **What does `Priority` mean:** a customer tier, or the scheduler's manual rank? Is 1 the highest? Why does Line 5 go up to 18? What do `2A`, `DESK` and `6VMEK` (Line 2) mean? *(was model 2)* | SAP and schedule priority are identical for all 15 LSVLN1 POs (1–9). Line 2: `2A` ×11, `DESK` ×5, `6VMEK` ×1. About 100 free-text values on SSV lines (`RUSH`, `Hold Vanessa`, …) | Integer 1 = highest; text kept as a note; `RUSH` in the text sets `is_rush` | Ranking weight on the wrong signal |
| **SQ-05** | **What makes a batch a "rush" in practice:** a priority change in SAP, a `RUSH` note, a customer escalation, or a new PO? Who can declare it? | No "rush" column; `RUSH` only appears as free text in priority/comments | A priority raise from ingest = rush; the rush goes right after the running batch | The demo trigger may not match how Pasco works |
| **SQ-06** | **Which statuses may be resequenced?** Is `RELEASED` / `STAGED` material already committed (frozen), or can the plan move it? Only `ONLINE` is truly fixed? | Open LSV queues: Line 1 = 1 ONLINE, 4 RELEASED, 7 NEW; Gravity = 2 ONLINE, 9 RELEASED, 1 STAGED, 5 NEW | Only ONLINE is pinned (position 1); RELEASED/STAGED/NEW are all movable | Plans that move staged batches aren't executable |
| **SQ-07** | **Is the seed in the plant?** 5 of the 12 open Line 1 POs have no lot number yet (all NEW). Does "no lot" mean the raw seed hasn't arrived, so the PO can't run? Is there an arrival or receipt date? | Line 1 open POs without a lot: `1002295415`, `1002307552`, `1002302915`, `1002302916`, `1002295402` | All open POs are assumed in plant and runnable | The rush and QA anchors (`1002295402`, `1002307552`) might not be runnable |
| **SQ-08** | **Does a QA fail on one output batch or size fraction hold the whole PO, or only that fraction?** *(was model 3)* | 598 of 1,857 tested POs have a Fail; **188 of them also have passing batches**. Fails spread across fractions (LR 145, LF 126, MR 131, MF 153, UN 78) | Any FAIL holds the whole PO | Over-holding: the line loses work that could run |
| **SQ-09** | **What happens after a Fail: rework on the same PO, or a new rework/repair PO (`240…` / `300…`) that enters the queue?** | Of 375 lots with a Fail, **265 later have a run under a `240…`/`300…` PO** | Fail → HOLD on the same PO; no new PO is created | The narrative says "a Fail is not a new PO". The data suggests a Fail usually becomes a new rework PO, which is a queue event |
| **SQ-10** | **Is the plant calendar 24/7?** What are the shifts, planned downtime and weekend pattern? | Line 1 logs: median 26.5 h of prep+run+clean per logged date (p90 53 h); runs on every weekday, Sundays about half as often (40 vs 60–80) | Continuous clock from 2026-09-28 06:00 Pasco time | Every planned finish time, and so every at-risk flag, shifts |
| **SQ-11** | **Changeover rules:** is the derived cost realistic, and does moving between Excelis, GMO and Fresh need a full cleanout (`PSL Cleanout`)? Why would a **species change** cost less than a **variety change within the species**? *(was model 1 + 7)* | Line 1 medians: same variety 2.0 h, same species / other variety 3.5 h, species change 2.5 h (n = 187 / 213 / 60). All 12 open Line 1 POs have no trait (`NONE`) | Derived rule hours; no trait penalty | Grouping reasons and timings are wrong |
| **SQ-12** | **Throughput basis for planning:** input kg/h or output (ready) kg/h? *(was model 6)* | Line 1: input 1,377 kg/h (matches the dashboard card, 1,378) vs output 1,114 kg/h (the `KG per hour` column) | Duration = input kg / input kg/h, per species when ≥ 5 runs | Durations off by about 19 % (the scrap rate) |
| **SQ-13** | **Can a batch switch lines** (Line 1 ↔ Line 2) when the plan needs it, or is routing fixed by SAP? For POs on several work centers (Gravity → Colorsort), is there a required order? | 28 POs appear on more than one LSV work center; comments like `DESK MOVED TO LINE 2`, `MOVE TO LINE 1` | Replan is per line; no cross-line moves or routing sequence | A realistic replan may need alternate lines |
| **SQ-14** | **Open customer orders:** can Syngenta share a sample (order, customer, material, qty, need-by date, priority tier, link to PO)? The brief requires them and the extract has none | No customer or demand data in any tab | 16 **synthetic** orders (`SYN-CO-*`) for the 12 open Line 1 POs | "Protect the customer window" reasons are illustrative only |
| **SQ-15** | **What does the scheduler do with the recommendation?** Accepted plans today go to Smartsheet / Data Shuttle by hand. Should the demo export an order for them to paste, and should overrides be recorded? | `Schedule Updating` tab describes the SAP → Excel → Data Shuttle loop | Accept = audit row only; no write-back | Defines "done" for the human-in-the-loop step |

## B. Data model correctness — keys, statuses, duplicates

| ID | Question | Evidence in the data | Model assumes today | Impact if wrong |
| --- | --- | --- | --- | --- |
| **SQ-16** | **Fully duplicated log rows: double entry (drop) or real repeat runs (keep)?** *(was Q-5 — the duplicate-lines note)* | 15 rows identical in every column. LSV log: `1002035876` ×3 (rows 293–295, Line 2, 2024-10-21), `300094614` ×2 (357–358), `2400007367` ×2 (1005–1006). SSV log: `1001998943` (153 & 167), `1002205052` (1586 & 1592), `300101465` (1821 & 1824) — the SSV copies are **not adjacent**. Pass/fail: `2400006472` batch `20017367` ×2 (1281–1282) | Loaded and flagged DQ-05; **counted** in throughput and changeover | If they're double entries, run counts, kg and hours are inflated. The fix is to drop them in silver (one-line change) |
| **SQ-17** | **Same PO twice on one line schedule: duplicate or a real second run?** | Line 5 `300101284` (rows 852, 854: same qty, finish one day apart); Line 5 `0300098954` = `300098954` (rows 758, 763: 444.183 vs 440); Line 6 `1002256377` (rows 318, 341: **different lots**, finishes 2026-04-13 vs 05-13) | First row is the schedule item; later rows kept with `is_duplicate` (DQ-06) | Line 6 looks like a genuine re-run, which would change the key to (PO, WC, lot) |
| **SQ-18** | **Output batch numbers shared across POs or repeated:** is `Output Batch` unique per physical batch? | 8 batch numbers repeat, e.g. `20792449` on POs `1002165487` and `1002164405` (both Fail); `20942669` twice on `1002188277` | Not a key; indexed only | Can't use the batch as the QA identity for holds |
| **SQ-19** | **Which source is authoritative for PO status when SAP and the line schedule disagree?** *(was Q-8)* | DQ-16: 15 POs are `NEW` in SAP but `COMPLETE` on the schedule (LSVLN1 3 — `1002181889`, `1002174855`, `1002150398` —, Gravity 5, Line 2 3, Line 6 3, Line 5 1) | Schedule status wins | Completed POs could reappear in the queue, or open ones vanish |
| **SQ-20** | **Suspect PO numbers:** can Syngenta confirm the correct PO for 16 values (typos or truncations)? And is the 9-digit `10002xxxx` family (Seed Health) valid? | `100184897` (lot `23-MZ1713X1` → `1001848979`?), `30006015`, `30098665`, `200007268`, `3001007703`, `10020117755`, `1.16`, `1000216-922`, `100213003`, `100214940`, `100219495`, `100225371`, `102253598`, `15093699`, `3000101300`, `3001022122` | Kept with `po_number_status = SUSPECT`, no PO link | Those runs drop out of the per-PO history |
| **SQ-21** | **Lot numbers in the PO column** (`MANUALLY ADDED SHIPMENT`, `150…`/`151…`): what are these rows? Should they belong to a real PO? | 41 schedule rows (Line 3 21, Line 5 11, Line 6 9) + 29 SSV log rows | Treated as lot, not PO (DQ-08) | The shipments are invisible in the PO queue |
| **SQ-22** | **`BAYER 1–4` and `Off System` runs:** toll processing for a third party? Should they count in the capacity baseline? *(was Q-9)* | 4 BAYER runs (80 t on LSV lines, rows 898–905); 12 `Off System` schedule rows | Kept in throughput (they are real line hours) | Capacity baseline skewed by non-SAP work |
| **SQ-23** | **Equipment mapping:** is `VMEK` the LSV colorsorter? Does `Handpick` need its own work center? Is `LINE 3(NORTH STAR)` SSV Line 3? *(was Q-6)* | `Handpick` 112 runs, `VMEK` 99, `Colorsorter(VMEK)` 1, `LINE 3(NORTH STAR)` 1 | VMEK → LSVCLSRT; Handpick → proposed `LSVHANDPICK`; North Star → SSVLN3 (all unconfirmed) | Capacity attributed to the wrong work center |
| **SQ-24** | **Older history:** can Syngenta share SSV schedules before 2024-07 and the SAP history for completed POs? | SSV logs start 2024-01, SSV schedules 2024-07; **543 POs exist only in the logs** (DQ-23) | Those POs are created from the log with no material or SAP data | Incomplete history for SSV (Phase 2) |
| **SQ-25** | **QA result rules:** what does a Fail with no reason mean, and a Pass with a reason? Is there a germination or vigor threshold for pass? | 25 Fail without `Failed for`; 12 Pass with a reason; 37 blank results. Germ doesn't explain fails (Fail median ready germ 0.963) but some passes are very low (min 0.10) | Blank → PENDING; reasons kept as-is (DQ-18); germ/vigor informational only | The QA hold may trigger on the wrong rows |
| **SQ-26** | **SSV units:** for POs in `KS` (thousand seeds), how is run duration planned? Logs are in kg | 191 schedule rows in `KS` | No duration for KS rows (SSV is Phase 2) | Blocks SSV scheduling |
| **SQ-27** | **Transcribed sources:** can we get the original exports behind the workbook images (SAP COISPI screenshot, Data Shuttle UI, throughput cards, packaging rates)? | 8 CSVs were typed from images (219 rows), so they can't be verified cell by cell | Used only for cross-checks | — |

## C. Codes and labels — data hygiene

| ID | Question | Evidence | Model assumes today |
| --- | --- | --- | --- |
| **SQ-28** | Meaning of material **state** tokens (`RDY`, `RDX`, `RDF`, `RDH`, `CLX`, `CLD`, `PMD`) and **type** tokens (`CRS`, `CRN`, `CRT`, `SDD`, `SDL`, `SNP`, …). Is `RAW → RDY` the conditioning transformation? *(was Q-1)* | 1,115 materials; 13 off-grammar (camelina, `SWTO DEVOTION`, `WACO … SDLRDY …`) | Parsed; codes kept verbatim |
| **SQ-29** | What does the `CL` suffix on crop year mean (`2023CL`)? *(was Q-2)* | `2023CL`…`2026CL` across schedules and logs | `crop_year` + `crop_year_suffix` |
| **SQ-30** | What is `PSL Cleanout`, and is the unit the same on Line 1 and Line 2? *(was Q-3)* | Line 1 median 0.27 (0.12–39); Line 2 median 16.1 (10–29.9): looks like different units | Stored as a number; not used |
| **SQ-31** | Size fractions: confirm `L/M` × `R/F`, the `H`/`L` suffixes, `U`/`UN`/`US`/`S`, and the screen sizes `16`, `16C`, `18C` *(was Q-4)* | 24 codes + invalid `/`, `12963`, `HEAVY` (DQ-11) | Normalized list; invalid → NULL |
| **SQ-32** | What does a **starred run order** mean (`*1`, `*10`, `**`)? Tentative position? *(was Q-7)* | 55 starred values | Kept as a note; not a position |
| **SQ-33** | May we keep **operator names** and the names in priority/comments, or must they be pseudonymized? *(was Q-10)* | 18 LSV + 9 SSV operators; names in comments (`Vanessa`, `Jesse`, …) | Kept for the demo; pseudonymize before sharing |
| **SQ-34** | `WorkCenter` / `Pack Line` / `Department` in `Excel SAP data` are VLOOKUPs to `Plant Schedules.xlsx` (SharePoint). Can we get that workbook, or confirm the routing tab is authoritative? | DQ-20 | `components.csv` routing preferred when they differ |

---

## Suggested order for the Syngenta session

1. **Before demo day (blocks the UC1 story):** SQ-01 fumigation, SQ-07 seed in plant, SQ-02 due date, SQ-08 / SQ-09 QA fail scope and rework, SQ-06 frozen statuses, SQ-05 rush, SQ-16 duplicates.
2. **Numbers on screen:** SQ-10 calendar, SQ-11 changeover, SQ-12 throughput basis, SQ-04 priority, SQ-03 stale dates.
3. **Data asks (files):** SQ-14 customer orders, SQ-24 history, SQ-27 original exports, SQ-34 `Plant Schedules.xlsx`, SQ-20 suspect POs.
4. **Everything else** can be answered by email.

Answers go into the model as follows:
- rules → `gold.config` / `gold.changeover_rule` (`rule_source = SME`) / `gold.replan`;
- keys and duplicates → silver transforms;
- labels → the observations mapping.

Rerun `backend/database/etl/build_model.py`; the reconciliation counts will show the change.
