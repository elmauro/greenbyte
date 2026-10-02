# UC1 — Lean gold handoff for the semantic planner

**For:** Camilo · **From:** David

No new tables. No new columns. No new functions. Two inserts and one branch in `gold.replan`. Everything else is JSON the planner writes and gold stores.

The planner owns the order, the times, lateness, the calendar, cleanouts, repair ideas, and overrides. Gold only saves the result and keeps serving `event_response` and `agent_context` as they are today.

---

> **Dates (2026-10-02, GREENBYTE-017):** the demo clock (`gold.cfg('plan_start_at')`) is now 2026-10-02 06:00 America/Los_Angeles. `sap_finish_date` and the schedule finish dates in silver are the source dates + 7 days. The JSON examples below are illustrative. See [gold-data-model §8](../../backend/database/etl/gold-model/gold-data-model.md).

## 1. Insert a config row

`gold.config.value` is text. Store this JSON under the key `planner_rules`. The planner reads it with `gold.cfg('planner_rules')`. Downtime and overrides are not in this document; they ride along on the plan payload in section 3.

```json
{
  "season": "HARVEST",
  "timeZone": "America/Los_Angeles",
  "calendar": {
    "LSVLN1": { "weekdays": [1, 2, 3, 4, 5, 6], "start": "00:00", "end": "24:00" },
    "LSVLN2": { "weekdays": [1, 2, 3, 4, 5, 6], "start": "00:00", "end": "24:00" }
  },
  "cleanoutTriggers": ["SPECIES_CHANGE", "BEFORE_EXCELIS", "AFTER_GMO"],
  "forbiddenSequence": { "from": "GMO", "to": "CERTIFIED_NON_GMO" },
  "repairRoutes": {
    "DENT": "COLORSORT",
    "DISCOLORED": "COLORSORT",
    "FM": "GRAVITY",
    "AP": "GRAVITY"
  }
}
```

Weekdays are ISO (1 = Monday, 6 = Saturday). Cleanout length stays the line's existing `SPECIES_CHANGE` hours in `gold.changeover_rule`. Unmapped fail reasons are left for the planner to show as unknown.

## 2. Insert policy version 2

Retire the current `ACTIVE` policy. Insert one row, `work_center_id` NULL, `policy_version` 2, `status` `ACTIVE`, `ranking_mode` `LEXICOGRAPHIC`, `fact_min_confidence` 0.700:

```json
[
  {"code": "PRIORITY", "basis": "CONFIRMED"},
  {"code": "SPECIES_GROUP", "basis": "CONFIRMED"},
  {"code": "SAP_FINISH", "basis": "CONFIRMED"}
]
```

`policy_order_by` does not need to understand these codes. The new path does not call it. Leave the heuristic branch on its current sort.

## 3. One branch in `gold.replan`

Same signature: `replan(p_line text, p_plan_event_id bigint)`.

When `plan_event.payload` has an `entries` array, skip the sort and insert those rows. When it does not, keep today's heuristic.

Supplied path:

1. If this `plan_event_id` already has a `schedule_plan`, return that id.
2. Supersede older plans for the line and insert the next version with `created_by = 'planner-v2'` and the active policy id.
3. Insert one `schedule_entry` per element. Copy the fields straight onto the columns that already exist: `line_schedule_item_id`, `process_order_id`, `position`, `entry_status`, `planned_start_at`, `planned_end_at`, `est_run_h`, `est_changeover_h`, `due_date`, `slack_days`, `is_at_risk`, `previous_position`.
4. Call `add_reason` for each item in `reasons`. The planner only sends reason codes that already exist, with the params those codes already require.
5. Leave the rest of `payload` stored on the event. Do not strip it and do not interpret it.

`due_date` on the entry is the SAP finish date. `v_open_queue.due_date` can stay as it is.

A line swap is just an entry written onto the other line's plan. `replan` is still called once per line. Do not check that the schedule item's work center matches the plan.

Example entry:

```json
{
  "lineScheduleItemId": 84012,
  "processOrderId": 1204,
  "position": 3,
  "entryStatus": "PLANNED",
  "plannedStartAt": "2026-10-02T14:00:00-07:00",
  "plannedEndAt": "2026-10-03T02:30:00-07:00",
  "estRunH": 11.5,
  "estChangeoverH": 2.5,
  "dueDate": "2026-10-04",
  "slackDays": 1,
  "isAtRisk": false,
  "previousPosition": 5,
  "reasons": [
    { "seq": 1, "code": "PRIORITY", "params": { "priority_rank": 2, "priority_source": "SAP" }, "factIds": [] }
  ]
}
```

`HOLD` rows use `entryStatus: "HOLD"` and null times.

The same payload may also carry JSON the planner needs on the next run. Gold stores it and does not branch on it:

```json
{
  "entries": [],
  "impact": { "newlyLate": ["1002307551"], "weeklyLoad": [] },
  "proposals": [{ "parentPo": "1002301004", "route": "COLORSORT", "status": "PROPOSED" }],
  "downtime": [{ "lineId": "line-2", "startsAt": "2026-10-03T06:00:00-07:00", "endsAt": "2026-10-03T18:00:00-07:00", "reason": "BREAKDOWN" }],
  "overrides": [{ "po": "1002307551", "type": "LINE_SWAP", "workCenterCode": "LSVLN1", "active": true }]
}
```

`process_ingest_event` can keep calling `replan` immediately. Until `entries` is present, the heuristic still runs. The Data API writes `entries` onto the event payload and then calls `replan` for the planner path. A second call with the same event id returns the plan already saved.

---

## Out of scope for this change

Do not change `process_ingest_event`, `event_response`, `agent_context`, `record_note_reading`, or the pass/fail error that fires when a PO is not on the open queue. Repair proposals for a finished order live in `payload.proposals` until a real repair PO shows up in the queue. JEV readings use `reader = 'BEDROCK'` and `model_id = 'typesafe/jev-1.13'`.

Ship the two inserts and the `replan` branch as a migration under `backend/database/` and apply it to the demo database.
