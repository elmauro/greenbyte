# UC1 Plant Scheduling — Story version (for the whole team)

**Technical detail:** [uc1-system-blueprint.md](./uc1-system-blueprint.md)  
**Live demo (Postman):** [uc1-demo-operator-ingest.md](./uc1-demo-operator-ingest.md)

This page explains the **same process** as the blueprint, in plain language — for product, Syngenta stakeholders, and engineers who want the “movie plot” first.

---

## The setting

Imagine **Pasco**, a seed conditioning plant. **Line 1** has a **to-do list of production orders (POs)** — who runs when, in what order, with what due dates.

That list does **not** appear by magic in our app. In real life it comes from **SAP** (which orders are active on the line) and from **Excel sheets** planners already use. Quality tests write results in a **pass/fail log** (did this batch pass inspection or fail for dent, discoloration, etc.).

GreenByte’s demo **does not plug into live SAP**. We use the same **ideas** and Pasco-style sample data.

### SAP and the quality log — in this project

| Name | In the real plant | In our hackathon |
| --- | --- | --- |
| **SAP** | The **ERP system** (production orders, priority, dates). Not a spreadsheet. | We **do not connect** to live SAP. Planners export reports from SAP and paste them into **Pasco’s Excel workbook** (e.g. **Line 1 Schedule**, **Excel SAP data**). That Excel is our stand-in for “what SAP knows.” |
| **Quality log** (pass/fail log) | Lab/plant records **Pass** or **Fail** per batch (PO, line, reason: Dent, etc.). | Same workbook: sheet **`LSV Pass_Fail Log`**. A new **Fail** row means “QA failed” — not a new PO in the queue. |

Demo today: we **pretend a row landed** via ingest API (Postman), not by opening Excel in the browser.

---

## Act 1 — Calm morning

The **scheduler** opens the web app and sees a **stable queue**: batches in order, no alerts.

Nothing happens on the screen until **something changes in the real world** (or in demo: someone sends new data into the system).

---

## Act 2 — Something changes upstream

Two kinds of surprises Syngenta cares about:

### A) “We need this batch sooner” (rush)

- Maybe **SAP** shows a **higher priority** or a **tighter customer date**.
- Or a **new urgent PO** shows up when the schedule is refreshed from SAP.

**What the plant needs:** a **new run order** and a **clear reason** why each batch moved.

### B) “This batch failed QA” (not a new PO)

- A row appears in the **pass/fail log**: **Fail**, with a reason (e.g. Dent).
- The batch was **already on the schedule**; the test result **lands on top** of existing work.

**What the plant needs:** put that batch on **hold**, keep the line moving with the rest, and explain what changed.

---

## Act 3 — The system proposes a new plan

When new data arrives:

1. **Data side (Camilo’s world)** — Notice the change (new SAP snapshot, new fail row), apply **rules** (capacity, species changeover, hold failed batch), produce a **new ordered list** and a **structured list of moves** (“PO X moved from 3 to 1”, “PO Y is HOLD”).

2. **AI side (David’s world)** — Turn that **facts-only package** into **plain language** for the scheduler: banner, short summary, bullet reasons. The AI must **not invent** PO numbers or dates that are not in the data.

3. **Middle layer (BFF)** — Delivers one clean package to the web app and records when the human **accepts**.

In the **hackathon demo today**, ingest endpoints **play the role** of “new data landed” (Postman/curl). The scheduler UI **does not** have “pretend rush” buttons anymore — it **waits and refreshes**, like a real screen would.

---

## Act 4 — The scheduler decides

The app notifies: **“Scheduling needs review.”**

The scheduler opens **Scheduling** (timeline + what changed) and **AI Copilot** (explanation).

They can:

- **Accept** — “I’m OK with this plan for now.” Logged in the demo; **no automatic write to ERP/SAP**.
- **Ask about a batch** (sales-style Q&A) — read-only; does not change the queue.
- **Manual tweak (future)** — drag or edit order; then accept again.

After accept, they’re nudged to check the **Queue** section (order and dates updated).

---

## Act 5 — Tomorrow

**Reset** (demo only) clears back to a calm baseline for the next presentation.

In production, the loop repeats: **SAP refresh** and **new test results** keep arriving; the system keeps proposing; humans keep validating.

---

## Who owns what (simple)

| Person | Role in the story |
| --- | --- |
| **Camilo** | Owns **truth from data**: loads Pasco/SAP-style tables, detects “something changed”, computes the **new queue + moves**. |
| **David** | Owns **the voice**: explains the diff in human language, grounded in Camilo’s JSON. |
| **Mauricio / UI** | Owns **what the scheduler sees**: queue, timeline, notifications, accept — calls only the BFF. |

---

## One sentence for Syngenta

When **new plant data** or a **failed test** lands, GreenByte **re-orders the line**, **explains why**, and lets the **scheduler accept** — without silently pushing changes into ERP.
