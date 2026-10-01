# UC1 demo — operator ingest (no UI buttons)

The scheduler UI at `/demo/plant` **does not** trigger rush or QA replans. Events land when **upstream data** is posted to BFF ingest routes (today: manual Postman/curl; target: Data API after ETL).

**Base URL (dev):** `https://wg7eopv9wl.execute-api.us-east-1.amazonaws.com`  
**Local MSW:** same paths on `VITE_API_BASE_APP` with MSW enabled.

Poll: the UI refreshes queue every ~5s when connected via BFF or MSW.

---

## Reset baseline (between runs)

```http
POST /demo/plant/reset
Content-Type: application/json

{ "lineId": "line-1" }
```

---

## Rush — urgency on a lot already in the queue

Changes **priority** and/or **scheduled finish** on an open PO. When the API has `PGHOST` set, this calls `gold.ingest_sap_priority_change`. The row stays the same PO. The new rank and date land in `silver.process_order_change`, and `gold.v_open_queue` shows them on the next read. The database function also builds a new plan.

```http
POST /demo/plant/ingest/sap-priority-change
Content-Type: application/json

{
  "lineId": "line-1",
  "locale": "en",
  "po": "1002307551",
  "priority": 2,
  "scheduledFinish": "2026-07-06 09:00"
}
```

**Response (database connected):** the JSON from `gold.ingest_sap_priority_change` (`eventType`, `planVersion`, `queue`, `diff`). Without `PGHOST`, the stub still returns the in-memory replan.

**Alternate rush PO (script B):** same body with `"po": "1002174855"` (must exist in queue).

---

## Rush — new PO on a COISPI refresh

Inserts one **new** open PO and builds a recommended plan for that line. When the API has `PGHOST` set, the row is written to `silver.process_order` and `silver.line_schedule_item`, then `gold.replan` runs with event type `queue_refresh`. `species` is required (4-letter code). A PO that already exists returns 409.

```http
POST /demo/plant/ingest/sap-queue-refresh
Content-Type: application/json

{
  "lineId": "line-1",
  "locale": "en",
  "po": "1002408120",
  "species": "SWCO",
  "kg": 6200,
  "scheduledFinish": "2026-07-07 08:00",
  "priority": 2
}
```

**Response (database connected):** the JSON from `gold.event_response` (`eventType` `queue_refresh`, `source` `etl_refresh`, `planVersion`, `queue`, `diff`). Without `PGHOST`, the stub still returns the in-memory replan.

---

## QA fail — LSV pass/fail log row

Records **`Pass/Fail = Fail`** on a PO already in process. When the API has `PGHOST` set, this calls `gold.ingest_pass_fail`. The row lands in `silver.quality_test` (same table as `lsv_pass_fail_log.csv`). `gold.v_po_quality_status` then shows the fail, and the line gets a new proposed plan. The PO must already be on that line's open queue.

```http
POST /demo/plant/ingest/pass-fail-log
Content-Type: application/json

{
  "lineId": "line-1",
  "locale": "en",
  "po": "1001884747",
  "passFail": "Fail",
  "failedFor": "Dent",
  "equipmentId": "Line 1"
}
```

**Response (database connected):** the JSON from `gold.ingest_pass_fail` (`eventType` `qa_fail`, `source` `pass_fail_log`, `planVersion`, `queue`, `diff`). Without `PGHOST`, the stub still returns the in-memory replan.

**Alternate QA (script B — Discolored):**

```json
{
  "lineId": "line-1",
  "locale": "en",
  "po": "1001883359",
  "passFail": "Fail",
  "failedFor": "Discolored",
  "equipmentId": "Line 1"
}
```

---

## Accept (scheduler UI or API)

```http
POST /demo/plant/schedule/accept
Content-Type: application/json

{ "lineId": "line-1" }
```

---

## Legacy (avoid for live demo narrative)

`POST /demo/plant/events` with `{ "type": "rush" | "qa_fail" }` remains for backward compatibility; prefer **ingest** routes above.

---

## Related

- [uc1-system-blueprint.md](./uc1-system-blueprint.md) — architecture and decisions  
- [uc1-syngenta-assumptions.md](./uc1-syngenta-assumptions.md) — Pasco data sources  
- [UC1-SYNGENTA-DEMO-CONTEXT.md](../../backend/docs/api/UC1-SYNGENTA-DEMO-CONTEXT.md) — BFF contract
