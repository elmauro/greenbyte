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

## Rush — SAP priority / schedule signal (stub)

Simulates a **priority change** on PO `1002307551` (Pasco demo).

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

**Response:** `PlantEventResponse` with `source: "sap_priority_change"`, `eventType: "rush"`.

---

## QA fail — LSV pass/fail log row (stub)

Simulates **`Pass/Fail = Fail`** for PO `1001884747` (Pasco Fail / Dent, Line 1).

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

**Response:** `PlantEventResponse` with `source: "pass_fail_log"`, `eventType: "qa_fail"`.

---

## Data API (PostgreSQL gold) — same routes, real open Line 1 POs

When the BFF calls the Data API, the same ingest routes map to `gold.ingest_sap_priority_change(...)` and `gold.ingest_pass_fail(...)` ([uc1-data-model.md §7](../../backend/data-model/uc1-data-model.md)). The Data API only accepts POs that are on the line's **open** queue, so the stub anchors above won't validate: `1002307551` is routed to LSVLN2, and `1001884747` has been complete since 2023. Proposed payloads:

```json
{ "lineId": "line-1", "po": "1002295402", "priority": 2, "scheduledFinish": "2026-10-03" }
```

```json
{ "lineId": "line-1", "po": "1002307552", "passFail": "Fail", "failedFor": "Dent", "equipmentId": "Line 1" }
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
