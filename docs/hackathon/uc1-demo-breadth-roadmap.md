# UC1 demo breadth — beyond fixed replans and Line 1 only

**Context:** [uc1-syngenta-assumptions.md](./uc1-syngenta-assumptions.md) §3.1 · [uc1-mvp-scope.md](./uc1-mvp-scope.md) §3.1  
**Question:** Must the demo grow to cover **multiple replan stories** and **multi-line** Pasco data?

---

## Short answer

| Gap | Required for Syngenta **minimum** demo? | Worth expanding **before** demo day? |
| --- | --- | --- |
| **Only two fixed replans** (one rush PO, one QA PO) | **No** — brief requires showing rush **and** QA **once**, with explain + accept | **Yes (high ROI)** — cheap via ingest + docs; aligns narrative with “many fail types / rush shapes” |
| **Line 1 only** in UI | **No** — brief does not mandate multi-line UI | **Optional (lower ROI)** — keep B+ on L1; mention L2/SSV in architecture slide / ETL backlog |

**Demo day:** B+ on **one line** + **two ingest paths** still **passes** the brief. **Breadth** reduces judge questions about “is this only hardcoded?” — prioritize **replans**, defer **multi-line UI** to tier C unless Camilo exposes `GET /lines/line-2/queue`.

---

## Priority 1 — Multiple replan stories (same line)

Syngenta allows **several** fail reasons and **rush** as new urgency **or** reprioritization. Today code hardcodes PO `1002307551` (rush) and `1001884747` (QA); ingest handlers **reject** other POs.

### Target behavior

1. **Ingest body selects PO** when that PO exists on the active line queue (PLANNED, not already HOLD).
2. **Rush:** move that PO to position 1 (or documented rule); explanation cites payload `priority` / `scheduledFinish`.
3. **QA fail:** HOLD + tail for payload PO; explanation cites `failedFor` (Dent, Discolored, …).
4. **Default script** unchanged (same two POs for repeatability); **alternate script** documented below.

### Pasco-backed alternate scenarios (Line 1)

| Script | Ingest | PO (in mock queue) | Pasco basis |
| --- | --- | --- | --- |
| **A (default)** | `sap-priority-change` | `1002307551` | SAP priority 2 (demo on L1) |
| **B** | `sap-priority-change` | e.g. `1002174855` or `1002295415` | Another high-kg LSVLN1 NEW row |
| **A (default)** | `pass-fail-log` Fail | `1001884747` | Pass/fail log Fail / **Dent** |
| **B** | `pass-fail-log` Fail | `1001883359` (add to baseline if missing) | Pass/fail log Fail / **Discolored** |
| **C (stretch)** | SAP refresh simulation | **New PO** appended to queue head | Brief “surprise rush batch” — needs `POST` refresh or seed swap, not only reorder |

### Engineering checklist

- [x] `applyEvent` / `plantDemoServer`: `focusPo`, `failedFor`, dynamic explain builder.
- [x] Ingest handlers: validate PO **in queue** (rush/QA); **sap-queue-refresh** for new PO.
- [x] Dynamic `explanation` bullets (PO, failedFor, customer order proxies).
- [x] [uc1-demo-operator-ingest.md](./uc1-demo-operator-ingest.md): scripts A, B, and C.
- [x] Alternate QA PO **1001883359** in `pascoLine1Baseline`.

---

## Priority 2 — Multi-line (optional for hackathon)

Pasco xlsx: Line 2, Gravity, Colorsort, SSV 3/5/6. Syngenta UC1 persona = **a scheduler**; one line in the room is acceptable.

### If expanding later

| Tier | Deliverable |
| --- | --- |
| **Narrative** | Architecture page / tour: “Data model loads all lines; demo focuses L1” |
| **C — UI** | Line switcher + `GET /lines/{id}/queue` per line |
| **Data** | Camilo ETL: `ops.line_schedule_item` keyed by line; BFF routes `line-2`, … |

Not blocking demo day if judges see **honest scope** in §3.1 assumptions doc.

---

## Demo script recommendation (judges)

1. **Calm queue** — full L1 list (scroll queue, scroll Gantt).
2. **Rush A** — default ingest `1002307551` → accept.
3. **Reset** (or continue if stateful demo).
4. **QA A** — default Fail Dent `1001884747` → accept.
5. **Optional “breadth” beat:** mention scripts B or second fail type without live run if time is short.

**100% Syngenta wording (three gaps to say out loud):** [uc1-judge-wording-gaps.md](./uc1-judge-wording-gaps.md) — SAP refresh rush, customer orders, COISPI-active queue vs mock.

---

## References

- Operator curl: [uc1-demo-operator-ingest.md](./uc1-demo-operator-ingest.md)
- Mock provenance: [uc1-plant-demo-mock-data.md](./uc1-plant-demo-mock-data.md)
- Backend handoff: [UC1-SYNGENTA-DEMO-CONTEXT.md](../../backend/docs/api/UC1-SYNGENTA-DEMO-CONTEXT.md)
