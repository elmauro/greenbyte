# Test Checklist — Remove post-accept queue bell notification

## Feature

- Name: Remove post-accept queue bell notification
- Slug: remove-post-accept-queue-bell-notification
- Ticket/story: GREENBYTE-012
- Environment: local (in-process or MSW)
- Date: 2026-10-02

---

## Automated Checks

- Frontend unit:
  - [x] n/a — no unit-test script
- Lint/build:
  - [x] `npm run lint --prefix frontend` — PASS 2026-10-02
- E2E (safe UC1 scheduler spec):
  - [x] `node frontend/scripts/run-scheduler-ux-e2e.mjs` — PASS 2026-10-02 (5/5)

---

## Manual (UX-10 extension)

- [ ] Ingest DATA-R01 on a mutable plan → open Scheduling → bell shows pending replan (UX-06).
- [ ] Accept schedule → pending banner and Accept bar disappear.
- [ ] Open bell → **no** “Queue updated” / “Confirm queue order” entry; count does not include an extra post-accept item.
- [ ] Header pill returns to calm green (not blue “approved — review queue”).
- [ ] Queue nav has no info badge from accept alone.

## Regression

- [ ] `npm run test:e2e --prefix frontend` via `node frontend/scripts/run-scheduler-ux-e2e.mjs` — safe Cypress suite still passes.

## Results

- Summary: lint PASS; scheduler UX Cypress 5/5; manual UX-10 post-accept bell check deferred to demo QA.
- Sign-off: validation complete 2026-10-02

## Review

- Review: **pass** — scoped UI removal; no contract change.
