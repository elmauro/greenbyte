# Analysis — UC1 manual schedule adjust

## Feature

- Name: UC1 manual schedule adjust
- Slug: uc1-manual-schedule-adjust
- Ticket/story: GREENBYTE-006
- Stack scope: frontend

## Finding

The scheduler button existed as copy only. Scope docs called it disabled or display-only. The gold schema already allows `plan_event.event_type = 'manual_adjust'` and `source = 'ui_manual'` (`backend/database/migrations/005_gold_runtime.sql`), and there is no `gold.adjust_plan` function and no BFF route.

A database write would need a new backend story, a core-api deploy, and a decision about whether Accept stores the human sequence. The demo can show the correction without that: keep a client order for the current line and plan version, and reapply it on every queue snapshot.

## Decision

- Client overlay only — reason: the screen must respond during the demo without a new endpoint — status: accepted
- Lock the running batch (first non-HOLD) and leave HOLD rows after the runnable sequence — reason: same constraints as the heuristic replan — status: accepted
- Label a moved row "Moved by the scheduler" and restore the server reason when it returns to its baseline position — reason: the Gantt callout must stay honest — status: accepted
- Do not send the overlay to `gold.accept_plan` — reason: Accept still records the server plan; the human order is not a new plan version — status: accepted

## Risks

- A refresh that clears `sessionStorage` drops the overlay — impact: low — the plan from the BFF is unchanged
- Accept can leave the screen on the human order while the stored decision is the server plan — impact: medium — called out in the UI copy and in the story gaps
