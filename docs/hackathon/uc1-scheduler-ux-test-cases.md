# UC1 scheduler UX test cases

**Story:** GREENBYTE-009  
**Scope:** [uc1-mvp-scope.md](./uc1-mvp-scope.md) demo-day blocks (section 4.1) and the shipped stretch items in section 5 (manual adjust, explain my batch)  
**Scheduler routes:** `/demo/plant` (line workspace and data-feed note) · `/demo/plant/ux` (scheduler the demo uses) · `/demo/plant/tour` (guided story)  
**Sign-in:** `/demo/sign-in`. The session key is `greenbyte-plant-ux-session-v1`.

This is the UX test matrix. It is not a second copy of the scope doc.

## How to run the automated rows

Frontend lint:

```text
npm run lint --prefix frontend
```

Scheduler Cypress (in-process mock only). From the repo root:

```text
node frontend/scripts/run-scheduler-ux-e2e.mjs
```

That script turns MSW off, clears the API base, starts Vite on a free port (so it does not attach to a dev server already on 51730), then runs:

```text
cypress run --spec cypress/e2e/uc1-scheduler-ux.cy.ts
```

The spec signs in by writing the session key. It does not type the demo password. It does not click Accept, does not post ingest, and does not submit an explain question. Any request whose host contains `execute-api` fails the spec.

How it works is out of scope here. That page is already covered by `frontend/cypress/e2e/how-it-works.cy.ts`.

## Why some rows stay manual

| Row | Why it is manual |
| --- | --- |
| UX-05 Poll | The safe spec uses the in-process mock. That mode does not poll. Polling is a GET every 5 seconds only when the app is on MSW or the live BFF. |
| UX-06b Bell after a real event | Showing the notice requires a pending replan. Creating one is an ingest POST. |
| UX-09 Explain submit | Ask posts `{ po, question, locale }` to `/demo/plant/batches/explain`. The spec opens the chat and does not send that body. |
| UX-10 Accept | Accept posts `/demo/plant/schedule/accept` and records the plan. On the live BFF that changes the shared demo plan. |
| UX-11 Ingest | The scheduler has no ingest button. The operator POST writes the shared plan when it hits the live BFF. See DATA-R01..R03. |
| UX-13 HOLD adjust | The calm in-process queue has no HOLD row, so the lock cannot be seen there. See DATA-R03 and INV-02. |
| MAN-01 | Sequential ingests | Requires two POSTs and Accept on a mutable plan; Cypress must not run this against the shared live BFF. |

## Summary

| Id | What | Mode |
| --- | --- | --- |
| UX-01 | Sign-in gate | Automated |
| UX-02 | Calm queue on the UX workspace | Automated |
| UX-03 | Line 1 and Line 2 URL | Automated |
| UX-04 | Data-feed note on `/demo/plant` | Automated |
| UX-05 | Queue poll | Manual |
| UX-06 | Bell, including no placeholder order | Automated when calm; manual after a real event |
| UX-07 | Scheduling timeline | Automated |
| UX-08 | What-changed rail and corner chat | Automated (chat opens; no question sent) |
| UX-09 | Explain-my-batch request shape | Manual |
| UX-10 | Accept | Manual |
| UX-11 | Ingest | Manual |
| UX-12 | Position 1 stays first | Automated |
| UX-13 | HOLD stays on hold | Manual |
| UX-14 | Guided tour | Automated |
| UX-15 | How it works | Out of scope; existing spec |
| DATA-R01 | Rush on an existing PO (`sap-priority-change`) | Manual |
| DATA-R02 | Rush via new PO (`sap-queue-refresh`) | Manual |
| DATA-R03 | QA fail (`pass-fail-log`) | Manual |
| INV-01 | Running PO stays at queue index 0 | Automated (UX-12) + manual after ingest |
| INV-02 | HOLD rows stay at the tail | Manual |
| INV-03 | One `PROPOSED` plan per line | Manual |
| MAN-01 | Sequential ingests → one bell → Accept latest `planVersion` | Manual |

---

## Data replay rows (operator ingest)

These rows describe **what upstream data must do** when an operator posts to the BFF. They are not scheduler buttons. Payload shapes and paths are in [uc1-demo-operator-ingest.md](./uc1-demo-operator-ingest.md). UX cases that **observe** the UI after ingest link here.

| Id | Ingest route | Internal event | UX observers |
| --- | --- | --- | --- |
| DATA-R01 | `POST /demo/plant/ingest/sap-priority-change` | rush / repriority on an **existing** open PO | UX-05, UX-06 (pending), UX-07, UX-08, UX-10, UX-11 |
| DATA-R02 | `POST /demo/plant/ingest/sap-queue-refresh` | `queue_refresh` — **new** PO on the line | UX-05, UX-06 (pending), UX-07, UX-10, UX-11 |
| DATA-R03 | `POST /demo/plant/ingest/pass-fail-log` | `qa_fail` — Fail on a PO already on the line | UX-05, UX-06 (pending), UX-07, UX-12, UX-13, UX-10, UX-11 |

## Plan invariants (gold / BFF)

These are **expectations on the proposed plan** after replay, not copy checks on the calm baseline. The in-process Cypress mock does not run PostgreSQL gold functions; verify invariants on MSW, local BFF with `PGHOST`, or the shared dev API on a plan you are allowed to change.

| Id | Invariant | UX observers |
| --- | --- | --- |
| INV-01 | The **running** batch (position 1 / index 0) is never reordered behind a waiting PO | UX-12; after DATA-R01 or DATA-R03 see MAN-01 |
| INV-02 | POs in **HOLD** after a QA fail sit at the **tail** of the active list (not in the running slot) | UX-13; after DATA-R03 |
| INV-03 | Each line has **at most one** `schedule_plan` in status `PROPOSED`; a newer ingest supersedes the prior proposal until Accept | UX-06, UX-07, UX-10; MAN-01 |

---

## DATA-R01 — Rush on an existing PO

- Id: DATA-R01
- Route: operator `POST /demo/plant/ingest/sap-priority-change` (not a scheduler control)
- Precondition: target `lineId` (usually `line-1`). PO is on that line's **open** queue. Use the operator doc sample or an open PO from the live queue when on Data API.
- Steps:
  1. Post priority and/or scheduled finish change for one PO (example anchor `1002307551` in stub mode).
  2. Open `/demo/plant/ux` and wait for poll or refresh.
- Expected result: response includes `eventType` consistent with rush, a new `planVersion`, `queue`, and `diff`. The UI enters pending review (bell, Scheduling rail). **INV-01:** index 0 remains the running PO. Related UX: UX-11, UX-06 pending, UX-10.
- Automated or manual: Manual. Cypress must not post ingest.

## DATA-R02 — Rush via new PO (COISPI refresh)

- Id: DATA-R02
- Route: operator `POST /demo/plant/ingest/sap-queue-refresh`
- Precondition: PO does **not** already exist on the line (409 if duplicate). `species` and other fields per operator doc.
- Steps:
  1. Post a new open PO for `line-1` (example in operator doc).
  2. Open `/demo/plant/ux` and wait for poll or refresh.
- Expected result: `eventType` `queue_refresh`, new row in queue, new `planVersion`. UI pending review. **INV-01** still applies to whoever is running at index 0. Related UX: UX-11, UX-06 pending, UX-10.
- Automated or manual: Manual

## DATA-R03 — QA fail

- Id: DATA-R03
- Route: operator `POST /demo/plant/ingest/pass-fail-log`
- Precondition: PO is on the line's open queue. Body includes `passFail: "Fail"` and `failedFor`.
- Steps:
  1. Post fail for a queued PO (example anchor `1001884747` in stub mode).
  2. Open `/demo/plant/ux?section=scheduling` after poll.
- Expected result: `eventType` `qa_fail`; affected PO shows **HOLD** / on hold. **INV-02:** hold row at tail. **INV-01:** running slot unchanged. Related UX: UX-11, UX-13, UX-06 pending, UX-10.
- Automated or manual: Manual

---

## INV-01 — Running PO stays first

- Id: INV-01
- Route: `/demo/plant/ux?section=scheduling`
- Precondition: queue loaded after any of DATA-R01..R03 or on calm baseline.
- Steps:
  1. Read the first timeline row (`data-queue-index` 0).
- Expected result: labeled **Running**; no move-up control. Replan must not swap another PO into that slot. Same check as UX-12.
- Automated or manual: Automated on calm baseline (UX-12). Manual after real ingest.

## INV-02 — HOLD at tail

- Id: INV-02
- Route: `/demo/plant/ux?section=scheduling`
- Precondition: queue includes at least one HOLD row (typically after DATA-R03).
- Steps:
  1. Find HOLD rows and compare order to runnable rows.
- Expected result: HOLD batches are last in the vertical timeline (tail). They are not in position 1. Aligns with UX-13 move restrictions.
- Automated or manual: Manual

## INV-03 — One PROPOSED plan per line

- Id: INV-03
- Route: BFF/Data API (inspect JSON) and `/demo/plant/ux`
- Precondition: MSW, local BFF, or dev API with gold connected.
- Steps:
  1. Trigger DATA-R01 (or any ingest) and note `planVersion` in the response.
  2. Before Accept, trigger a second ingest on the same line.
  3. Read queue payload or DB: only the **latest** proposal should be `PROPOSED`; earlier ones are superseded.
- Expected result: UI shows **one** pending replan story (bell / rail tied to latest event). Accept (UX-10) should send the latest `planVersion` when the client includes it.
- Automated or manual: Manual

---

## MAN-01 — Sequential ingests, one bell, Accept latest plan

- Id: MAN-01
- Route: operator ingest (two posts) then `/demo/plant/ux` and Accept bar
- Precondition: a line and plan you are **allowed** to mutate (local or dedicated demo session). Not the Cypress in-process run. Signed in.
- Steps:
  1. Start from calm or an accepted baseline on `line-1`.
  2. Post **DATA-R01** (`sap-priority-change`) for an open PO. Do **not** click Accept.
  3. Within a short window (before Accept), post **DATA-R03** (`pass-fail-log` Fail) for a different open PO on the same line — or post **DATA-R02** if you need refresh instead of QA; the goal is **two ingests without Accept between them**.
  4. Open `/demo/plant/ux`, wait for poll (~5s on BFF/MSW).
  5. Open the bell once.
  6. Open Scheduling; read the what-changed rail.
  7. Click **Accept schedule** once.
- Expected result:
  - **One** bell notice cycle for the **latest** pending replan (not two competing Accept bars forever). Copy names the line and a real PO or approved fallback string (UX-06 pending rules).
  - Queue reflects **both** data changes in the final proposed plan (rush order **and** HOLD tail per INV-01..INV-02).
  - **INV-03:** Accept records human sign-off on the **latest** `planVersion` only; prior proposal superseded.
  - POST `/demo/plant/schedule/accept` succeeds once; no SAP write (UX-10).
- Related: DATA-R01, DATA-R03 (or R02), INV-01..INV-03, UX-05, UX-06, UX-07, UX-10, UX-11.
- Automated or manual: Manual

---

## UX-01 — Sign-in gate

- Id: UX-01
- Route: `/demo/plant/ux` and `/demo/plant` (also `/demo/plant/tour`)
- Precondition: sessionStorage has no `greenbyte-plant-ux-session-v1`
- Steps:
  1. Open `/demo/plant/ux`.
  2. Open `/demo/plant` in a fresh session with the same empty key.
- Expected result: both URLs land on `/demo/sign-in` with a `returnTo` query. The heading is "Sign in to Line 1 UX preview". A wrong password shows "Invalid username or password." This matrix does not print the demo password.
- Automated or manual: Automated for the redirect. The wrong-password check is manual so the password stays out of the spec.

## UX-02 — Calm queue

- Id: UX-02
- Route: `/demo/plant/ux`
- Precondition: signed in (session username `greenbyte_user`). No pending replan on the queue the page is reading. The automated run uses the in-process calm baseline.
- Steps:
  1. Open `/demo/plant/ux`.
  2. Wait until the queue finishes loading.
- Expected result: the dashboard shows "Calm and stable" and "Running smoothly". There is no "Action required" pill. Scope block: calm state (`PlantBaselineDashboard`, GET queue).
- Automated or manual: Automated

## UX-03 — Line select

- Id: UX-03
- Route: `/demo/plant/ux`
- Precondition: same as UX-02. Viewport wide enough to show the line control labeled "Conditioning line" (the desktop nav is the `lg` layout).
- Steps:
  1. Open the line control and choose Line 2.
  2. Open it again and choose Line 1.
- Expected result: the query string includes `line=line-2`, then `line=line-1`. Labels are "Line 2" and "Line 1". The in-process mock only serves line-1, so Line 2 may show "Could not load this line." The URL change is still the check. A live line-2 queue, when the BFF has rows, is a manual follow-up and must stay a GET.
- Automated or manual: Automated for the URL. Manual if you need to confirm a live line-2 payload.

## UX-04 — Data-feed note

- Id: UX-04
- Route: `/demo/plant`
- Precondition: signed in. Calm queue.
- Steps:
  1. Open `/demo/plant`.
- Expected result: the page shows "Events come from data — not from this screen" and the calm badge "Calm & stable". The note lists the ingest paths and says the UI polls. There is no rush or QA button on this screen. Scope block: data-feed note.
- Automated or manual: Automated

## UX-05 — Queue poll

- Id: UX-05
- Route: `/demo/plant/ux` (the classic page uses the same hook)
- Precondition: signed in. App mode is MSW or live BFF (`getApiConnectionMode` is not in-process). Do not click Accept. Do not post ingest.
- Steps:
  1. Open the network log.
  2. Stay on the page for at least 6 seconds.
- Expected result: `GET /demo/plant/lines/{lineId}/queue` repeats about every 5 seconds. The UX workspace also loads the other line for the bell. No POST appears. The in-process mock used by Cypress does not poll; that is why this row is manual.
- Automated or manual: Manual

## UX-06 — Notifications / bell

- Id: UX-06
- Route: `/demo/plant/ux`
- Precondition: signed in.
- Steps:
  1. On a calm queue, open the bell (aria label starts with "Notifications,").
  2. After a real pending replan only (see UX-11 and DATA-R01..R03), open the bell again. Do this on a plan you are allowed to change, not by posting from Cypress to the live BFF.
- Expected result:
  - Calm: the menu says "No new notifications" and "You're caught up on Line 1" (or Line 2 if that line is selected). The menu does not contain "Moved PO —" or "PO —".
  - Pending real event: the bell count is at least 1 and the row names the line plus "Review updated schedule", with a summary that includes a real order number or the fixed fallback "Priority change — customer window" / "Quality failure — batch on hold". A dash standing in for the order number is a failure.
  - Scope block: notifications to Scheduling and copilot only when `lastEvent` is a real pending event.
- Automated or manual: Automated for the calm menu and the placeholder check. Manual for the pending-event menu.

## UX-07 — Scheduling timeline

- Id: UX-07
- Route: `/demo/plant/ux?section=scheduling`
- Precondition: signed in on Line 1 with a loaded queue.
- Steps:
  1. Choose Scheduling in the line nav.
- Expected result: the query string includes `section=scheduling`. The heading is "Program timeline". The what-changed rail is the side panel (`data-copilot-open`), not the corner chat. On a calm queue the rail says "No schedule change is waiting."
- Automated or manual: Automated

## UX-08 — Copilot what-changed vs corner Q&A

- Id: UX-08
- Route: `/demo/plant/ux?section=scheduling`
- Precondition: signed in. Session key `greenbyte-schedule-copilot-chat-open-v1` is not set to open.
- Steps:
  1. Open Scheduling.
  2. Confirm the corner chat panel is absent (`data-copilot-chat` is not `open`).
  3. Click the corner button whose label is "Ask about this batch…".
  4. Do not press Ask and do not use a quick prompt.
- Expected result: the chat panel opens and shows "Copilot" plus "Ask about this order. The answer uses the current queue and does not change the plan." The what-changed rail stays the timeline side panel. The chat does not open from the Scheduling tab alone. No `POST /demo/plant/batches/explain` is sent.
- Automated or manual: Automated

## UX-09 — Explain my batch request shape

- Id: UX-09
- Route: `/demo/plant/ux` corner chat (same client as the sales explain block)
- Precondition: signed in, chat open, an order selected in "This order". Use a local mock or a session that is allowed to call explain. Do not point this check at the shared live plan if the agent call is expensive or shared; the shape check itself is a POST.
- Steps:
  1. Choose a PO that is on the queue.
  2. Send one of the quick prompts ("Why is it waiting?", "When does it ship?", "What would move it up?") or a short question, then press Ask.
- Expected result: the browser posts `POST /demo/plant/batches/explain` with JSON `{ po, question, locale }`. `po` is the selected order, `question` is the text that was sent, `locale` is `en` or `es`. The queue order does not change. The answer area shows either the reply or "The answer did not come back. Ask again in a moment." Scope block: explain my batch. UI shape is `plantDemoApi.postBatchExplain`.
- Automated or manual: Manual. The Cypress spec stops before Ask so it cannot see this body.

## UX-10 — Accept

- Id: UX-10
- Route: `/demo/plant/ux` (Accept bar appears only while a replan is pending)
- Precondition: a real pending event on a plan you are allowed to accept. Not the Cypress run.
- Steps:
  1. Open Scheduling and read the what-changed rail.
  2. Click "Accept schedule".
- Expected result: the button posts `POST /demo/plant/schedule/accept` with `{ lineId }`. The page records acceptance ("Accepted" / "Human acceptance recorded on the proposed plan. No write to SAP."). Nothing is written to SAP. Scope block: Accept.
- Automated or manual: Manual. Cypress must not click Accept against the live BFF (`https://wg7eopv9wl.execute-api.us-east-1.amazonaws.com` when that base URL is set).

## UX-11 — Ingest

- Id: UX-11
- Route: not a scheduler control. Operator or Data API posts to the BFF. The data-feed note on `/demo/plant` lists the paths.
- Precondition: a target plan you are allowed to change.
- Steps:
  1. Post one ingest replay row: **DATA-R01** (`sap-priority-change`), **DATA-R02** (`sap-queue-refresh`), or **DATA-R03** (`pass-fail-log`) for `line-1` or `line-2`, using [uc1-demo-operator-ingest.md](./uc1-demo-operator-ingest.md).
  2. Return to `/demo/plant/ux` and wait for the poll or refresh.
- Expected result: the bell and Scheduling show the new plan (UX-06 pending case). Plan shape should respect **INV-01..INV-03** where applicable. The scheduler screen itself never sends these posts. For two ingests without Accept, use **MAN-01**.
- Automated or manual: Manual. Cypress must not post ingest.

## UX-12 — Manual adjust, position 1

- Id: UX-12
- Route: `/demo/plant/ux?section=scheduling`
- Precondition: signed in, Line 1 queue loaded. Vertical timeline. This does not call the server; the order is kept in session storage for the plan version.
- Steps:
  1. Open Scheduling.
  2. Look at the first timeline row (`data-queue-index` 0).
- Expected result: that row is labeled "Running" and has no "Move up" control. Scope stretch: the running batch stays first (`GREENBYTE-006`).
- Automated or manual: Automated on the calm baseline (read only; the spec does not press Move down).

## UX-13 — Manual adjust, HOLD

- Id: UX-13
- Route: `/demo/plant/ux?section=scheduling`
- Precondition: the queue on screen contains at least one row with status HOLD (after a QA ingest you are allowed to run, or a fixture that already has HOLD). The calm in-process baseline has no HOLD row.
- Steps:
  1. Open Scheduling, vertical layout.
  2. Find a row with "On hold".
  3. Try to move a runnable row onto that HOLD row, and try to move the HOLD row.
- Expected result: the HOLD row has no move arrows and is not a drag target. Runnable rows cannot swap into the hold area. HOLD rows stay on hold. Nothing is written to PostgreSQL or SAP.
- Automated or manual: Manual

## UX-14 — Guided tour

- Id: UX-14
- Route: `/demo/plant/tour`
- Precondition: signed in. The route is still registered.
- Steps:
  1. Open `/demo/plant/tour`.
- Expected result: the heading is "Pasco conditioning — guided demo" and the first step title "1. The normal queue" is visible. The tour is read-only snapshots. It does not post ingest or Accept.
- Automated or manual: Automated

## UX-15 — How it works

- Id: UX-15
- Route: `/demo/how-it-works`
- Precondition: none for this matrix
- Steps:
  1. Run `frontend/cypress/e2e/how-it-works.cy.ts` when you need that page checked.
- Expected result: not retested here. The scheduler matrix only points at that spec.
- Automated or manual: Out of scope for this matrix. Already automated in the How it works spec.

---

## Scope map

| Scope block in uc1-mvp-scope.md | Cases |
| --- | --- |
| Session in front of the demo routes | UX-01 |
| Data-feed note; no rush/QA buttons | UX-04, UX-11, DATA-R01..R03 |
| Calm queue, GET queue, poll | UX-02, UX-03, UX-05 |
| Notifications, then Scheduling and copilot | UX-06, UX-07, UX-08, MAN-01 |
| Explain my batch | UX-08, UX-09 |
| Accept, no SAP write | UX-10, MAN-01, INV-03 |
| Manual adjust (section 5) | UX-12, UX-13, INV-01, INV-02 |
| Operator ingest / replay (data lands → replan) | DATA-R01..R03, UX-11, MAN-01 |
| Tour route | UX-14 |
| How it works / API map | UX-15 |
