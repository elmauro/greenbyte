# UC1 gold schema — scheduling engine and plant UI

What the Pasco scheduler screen reads, and the extra tables the semantic engine still needs.

The screen is `/demo/plant`. The browser talks only to the BFF. The BFF reads `gold` through functions that already exist (`event_response`, `agent_context`, `accept_plan`, `replan`). Explanations are built from that JSON. They are not stored in a table.

Two groups:

| Group | Status | Role |
| --- | --- | --- |
| Plan, reasons, events, decisions | Already in RDS | Feed the queue, the Gantt, accept, and the copilot input |
| Facts, fact links, policy | Not created yet | Let the engine read notes and rank against a named objective |

---

## Already in `gold` — this is what serves the UI

### `gold.schedule_plan`

One proposed or accepted run order for one line.

A new plan is written every time the line is re-ranked. The previous plan stays, so the screen can show what moved. `plan_version` is the number the UI calls `planVersion`. `status` is `PROPOSED` until a person accepts it.

| Column | Meaning |
| --- | --- |
| `schedule_plan_id` | Id |
| `work_center_id` | Which line (Line 1, Line 2, …) |
| `plan_version` | 1, 2, 3… per line |
| `parent_plan_id` | The plan this one replaced |
| `status` | `PROPOSED`, `ACCEPTED`, or `SUPERSEDED` |
| `plan_event_id` | The rush, QA fail, or refresh that caused it. Empty on the morning baseline |
| `horizon_start` | When the timeline starts |
| `created_at`, `created_by` | When and by which job |

**Add when the policy table exists:** `policy_id`, so a plan records which ranking rules produced it.

### `gold.schedule_entry`

One production order in one plan, at one position.

This is the queue row. Position 1 is the first order to run. Times come from the line's historical speed (kg per hour) plus the changeover from the order before it.

| Column | Meaning |
| --- | --- |
| `schedule_entry_id` | Id |
| `schedule_plan_id` | Which plan |
| `position` | 1-based place in the run order |
| `process_order_id` | The production order |
| `line_schedule_item_id` | The sheet row it came from |
| `entry_status` | `PLANNED` or `HOLD` on the screen |
| `planned_start_at`, `planned_end_at` | Timeline start and finish |
| `est_run_h`, `est_changeover_h` | Hours to run, and hours lost switching to this order |
| `due_date`, `slack_days`, `is_at_risk` | Due date, how early or late, and the at-risk flag |
| `previous_position` | Where this order sat on the parent plan. Drives the move badges |

### `gold.entry_reason`

Why that order is in that position. One row per reason, in order.

The copilot does not invent these. It paraphrases them. `params` holds the numbers (priority, slack days, fail reason, customer order id).

| Column | Meaning |
| --- | --- |
| `entry_reason_id` | Id |
| `schedule_entry_id` | Which queue row |
| `seq` | Order of the reasons on that row |
| `reason_code_id` | Which kind of reason |
| `params` | JSON facts for that reason |

### `gold.reason_code`

The allowed reason kinds, plus a sentence template.

`gold.render_reason` fills the template from `params`. That sentence is `reasonShort` on the queue row, and the text inside `gold.agent_context` for the model.

| Column | Meaning |
| --- | --- |
| `reason_code_id` | Id |
| `reason_code` | Stable code, e.g. `DUE_DATE_RISK`, `QA_HOLD`, `SAME_VARIETY_GROUP` |
| `category` | Group, e.g. urgency, changeover, hard hold |
| `description` | What the code means |
| `template` | Sentence with placeholders |

### `gold.plan_event`

The thing that triggered a re-plan: a SAP priority change, a new order on refresh, or a failed test.

| Column | Meaning |
| --- | --- |
| `plan_event_id` | Id |
| `work_center_id` | Which line |
| `event_type` | e.g. `RUSH`, `QA_FAIL`, `QUEUE_REFRESH` |
| `source` | Where it came from (`sap_priority_change`, `pass_fail_log`, …) |
| `process_order_id` | The order it is about, when there is one |
| `ingest_event_id` | Link back to `raw.ingest_event` |
| `payload` | The raw signal (priority, fail reason, finish date) |
| `created_at`, `created_by` | When and who |

### `gold.plan_decision`

A person accepting, overriding, or rejecting a plan. Accept does not write to SAP.

| Column | Meaning |
| --- | --- |
| `plan_decision_id` | Id |
| `schedule_plan_id` | Which plan |
| `decision` | `ACCEPT`, `OVERRIDE`, or `REJECT` |
| `override_detail` | What the person changed, if they did not take the recommendation as-is |
| `decided_by`, `decided_at`, `comment` | Who, when, and any note |

### `gold.changeover_rule`

Hours lost when the next order is the same variety, the same species, or a different species. Derived from the conditioning logs. The sequencer uses this to place finish times. The screen shows the result as `est_changeover_h` and in the impact line, not this table directly.

| Column | Meaning |
| --- | --- |
| `changeover_rule_id` | Id |
| `work_center_id` | Which line |
| `transition_code` | `SAME_VARIETY`, `SAME_SPECIES`, or `SPECIES_CHANGE` |
| `prep_h`, `cleandown_h`, `hours` | Setup, clean, and the total used for planning |
| `rule_source` | `DERIVED` until a plant expert confirms it |
| `derived_n` | How many historical runs the median came from |

### `gold.config`

A few demo-wide settings: the date the extract represents, the plan start, the plant time zone, and the heuristic name.

| Column | Meaning |
| --- | --- |
| `config_key` | Name |
| `value` | Value |
| `description` | What it is for |

### Views the screen and the sequencer use

These are not tables. They are the reads.

| View | Plain purpose |
| --- | --- |
| `gold.v_latest_plan` | The plan to show for each line |
| `gold.v_plan_queue` | Queue rows with species, lot, finish, risk, and the short reason |
| `gold.v_plan_diff` | Moves, holds, adds, and removes versus the parent plan |
| `gold.v_open_queue` | Open orders on the sheet when no plan exists yet |
| `gold.v_throughput` | kg per hour by line and species. This is the line capacity used to estimate finish times |
| `gold.v_order_risk` | Synthetic customer orders versus the planned finish. This is the lateness side of the objective |
| `gold.v_po_quality_status` | Whether an order has passed, failed, or has not been tested |

### Functions that already shape the API

| Function | Plain purpose |
| --- | --- |
| `gold.event_response(plan_id)` | The queue JSON the BFF maps onto the screen. No explanation text |
| `gold.agent_context(plan_id, locale)` | The packet for the model: queue, reasons, diff, and the ids it is allowed to cite |
| `gold.batch_detail(po)` | One order, for the sales "explain my batch" question |
| `gold.replan` / `gold.ingest_*` / `gold.accept_plan` | Write the next plan, record the trigger, or accept |

The copilot text (`alertBanner`, `summary`, `bullets`) is produced from `agent_context` by the Agent API (Bedrock). Until that API is live, the BFF fills the same fields from templates. Either way the text is returned on the HTTP response. It is not a `gold` table.

---

## Still to create — the semantic engine

Three tables. They do not replace the plan tables. They tell the sequencer which notes to trust and which trade-off to optimize, then let a reason point at the note it used.

### `gold.semantic_fact`

One reading of one free-text note: "Needs fumi!!", "RUSH", a fail comment, a SAP note.

The note stays as evidence. The fact is the typed meaning (not ready, hold, rush, deadline, or nothing). A note is read once per model version. The hash makes the second call a no-op. A person can confirm or reject a low-confidence reading. The sequencer only uses rows that are confirmed or automatic and above the policy's confidence floor.

```sql
CREATE TABLE gold.semantic_fact (
  semantic_fact_id  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  process_order_id  bigint REFERENCES silver.process_order (process_order_id),
  work_center_id    bigint REFERENCES silver.work_center (work_center_id),
  source_table      text   NOT NULL,
  source_row_id     bigint NOT NULL,
  source_column     text   NOT NULL,
  note_text         text   NOT NULL,
  note_hash         char(64) NOT NULL,
  fact_type         text   NOT NULL CHECK (fact_type IN
                      ('NOT_READY','HOLD','RELEASE','RUSH','DEADLINE','INFO','NONE')),
  fact_value        jsonb,
  applies_to        text   NOT NULL DEFAULT 'UNKNOWN' CHECK (applies_to IN
                      ('PO','LOT','EQUIPMENT','LINE','UNKNOWN')),
  confidence        numeric(4,3) CHECK (confidence BETWEEN 0 AND 1),
  model_provider    text   NOT NULL CHECK (model_provider IN ('JEV','BEDROCK','HUMAN')),
  model_id          text   NOT NULL,
  prompt_version    text   NOT NULL,
  status            text   NOT NULL DEFAULT 'AUTO' CHECK (status IN
                      ('AUTO','NEEDS_CONFIRMATION','CONFIRMED','REJECTED')),
  reviewed_by       text,
  reviewed_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT
    (note_hash, process_order_id, fact_type, model_id, prompt_version)
);

CREATE INDEX semantic_fact_po_status_idx
  ON gold.semantic_fact (process_order_id, status);
```

`process_order_id` is nullable so a note about a machine or a lot can still be stored.

### `gold.entry_reason_fact`

Joins a reason on a queue row to the facts that justified it. This is how an explanation cites the note, not only the PO number.

```sql
CREATE TABLE gold.entry_reason_fact (
  entry_reason_id   bigint NOT NULL
    REFERENCES gold.entry_reason (entry_reason_id) ON DELETE CASCADE,
  semantic_fact_id  bigint NOT NULL
    REFERENCES gold.semantic_fact (semantic_fact_id),
  PRIMARY KEY (entry_reason_id, semantic_fact_id)
);
```

### `gold.policy`

The ranking rules for a line, versioned.

Hard cases stay in code: the order already running stays first, and held, failed, lab, and not-ready orders leave the runnable list. This table is only the soft part: in what order to care about late customer orders, changeover hours, the priority number, and a rush. Each criterion says whether the plant confirmed it or it is still our assumption. `hours_per_day` turns run hours into a finish date. The default of 24 is an assumption until the plant gives the shift pattern.

One active policy per line. A row with no work center is the default for every line. Old versions stay, so an old plan still points at the rules that built it.

```sql
CREATE TABLE gold.policy (
  policy_id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  work_center_id       bigint REFERENCES silver.work_center (work_center_id),
  policy_version       integer NOT NULL,
  status               text NOT NULL DEFAULT 'DRAFT'
                         CHECK (status IN ('DRAFT','ACTIVE','RETIRED')),
  criteria             jsonb NOT NULL CHECK (jsonb_typeof(criteria) = 'array'),
  fact_min_confidence  numeric(4,3) NOT NULL DEFAULT 0.700,
  hours_per_day        numeric(4,1) NOT NULL DEFAULT 24.0,
  notes                text,
  created_by           text NOT NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (work_center_id, policy_version)
);

CREATE UNIQUE INDEX policy_one_active_idx
  ON gold.policy (COALESCE(work_center_id, 0))
  WHERE status = 'ACTIVE';

ALTER TABLE gold.schedule_plan
  ADD COLUMN policy_id bigint REFERENCES gold.policy (policy_id);
```

`criteria` is an ordered list. Earlier entries win.

```json
[
  {"code": "CUSTOMER_LATENESS", "weight": 1.0, "basis": "ASSUMPTION"},
  {"code": "CHANGEOVER_HOURS",  "weight": 0.5, "basis": "ASSUMPTION"},
  {"code": "PRIORITY",          "weight": 0.3, "basis": "ASSUMPTION"},
  {"code": "RUSH",              "weight": 2.0, "basis": "ASSUMPTION"}
]
```

`CUSTOMER_LATENESS` and `CHANGEOVER_HOURS` are the two outcomes named in the UC1 brief: customer orders ship on time, and the line loses as little time as possible to variety changes. The brief says not to present the result as a mathematically optimal schedule. The plan still reports both numbers before and after, as the impact.

---

## How a screen load uses this

1. `v_latest_plan` picks the plan for the line.
2. `event_response` returns the queue, finishes, risk flags, short reasons, and the diff. That paints the table and the Gantt.
3. If the plan is still `PROPOSED`, `agent_context` is sent to the model. The model returns the copilot text. The BFF attaches it as `pendingExplanation`.
4. Accept calls `accept_plan`, which writes `plan_decision` and marks the plan `ACCEPTED`. The copilot text is then cleared.

A rush or a failed test writes `plan_event`, reads trusted `semantic_fact` rows and the active `policy`, and `replan` writes the next `schedule_plan`, its entries, its reasons, and the `entry_reason_fact` links.
