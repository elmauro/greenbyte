# Implementation Notes — UC1 scheduler UX test cases

## Feature

- Name: UC1 scheduler UX test cases
- Slug: uc1-scheduler-ux-test-cases
- Ticket/story: GREENBYTE-009
- Implementation date: 2026-10-02
- Branch/PR: feature/greenbyte-009 (no pull request)

---

## Summary

- Implemented:
  - UX matrix mapped to the UC1 scope doc, plus DATA-R01..R03, INV-01..03, and MAN-01 sequential-ingest scenario — source: `user-story.md`
  - Cypress spec for the read-only scheduler flows — source: `analysis.md`
  - Runner that forces the in-process mock — source: `analysis.md`
- Not implemented:
  - Accept, ingest, explain submit, remote poll, and HOLD adjust automation — reason: those either POST or need a HOLD row the calm baseline does not have
  - Product behavior changes — reason: existing selectors were enough
  - GitHub issue sync — reason: `cursor/scripts/github-story.config.json` is absent

---

## Key Decisions

- Matrix path `docs/hackathon/uc1-scheduler-ux-test-cases.md` — reason: hackathon docs are where the scope lives — evidence: `docs/hackathon/uc1-mvp-scope.md` — approved/assumed: accepted
- Cypress uses the in-process mock on a free port — reason: a server already on 51730 might be the live BFF — evidence: `frontend/scripts/run-scheduler-ux-e2e.mjs` — approved/assumed: accepted
- Validation plan lists shell commands as plain lines — reason: backtick text in that section is executed as an extra command — evidence: `cursor/scripts/run-feature-gates.mjs` — approved/assumed: accepted

---

## SOURCE SCOPE

- Requirements implemented:
  - One matrix with id, route, precondition, steps, expected result, and automated or manual — source: `user-story.md`
  - Safe Cypress for sign-in, lines, Scheduling, corner chat, calm bell, position 1, tour, and the data-feed note — source: `user-story.md`
- Requirements deferred:
  - Live Accept and ingest — reason: shared plan

---

## TARGET SCOPE

- Backend changes:
  - none
- Frontend changes:
  - `frontend/cypress/e2e/uc1-scheduler-ux.cy.ts` — new spec
  - `frontend/scripts/run-scheduler-ux-e2e.mjs` — starts Vite with `VITE_USE_MSW=false` and an empty `VITE_API_BASE_APP`, then runs `cypress run --spec cypress/e2e/uc1-scheduler-ux.cy.ts`
- Infrastructure / config changes:
  - `cursor/scripts/run-feature-gates.mjs` now also runs a plain indented extra-command line, not only backtick text
- Docs changes:
  - `docs/hackathon/uc1-scheduler-ux-test-cases.md`
  - Pointer from `docs/hackathon/uc1-mvp-scope.md`

---

## FLOW

- Shipped flow:
  1. Reviewer reads the matrix — source: `docs/hackathon/uc1-scheduler-ux-test-cases.md`
  2. Reviewer runs the runner — source: `frontend/scripts/run-scheduler-ux-e2e.mjs`
  3. Manual rows stay in the matrix for POST and HOLD — source: same doc
- Deviations from user story:
  - none

---

## GAPS

- Known limitations:
  - Line 2 on the in-process mock returns "Could not load this line." The spec still checks the URL.
  - The spec does not press Ask, so it does not observe the explain JSON body.
- Follow-up:
  - none in this story

---

## RISKS

- Residual risks:
  - Running Cypress with `npm run test:e2e` uses whatever Vite env the machine already has. Use the runner in this story when the check must stay off the live BFF.
- Monitoring / rollback notes:
  - No runtime change to the scheduler.

---

## Documentation Sync

- [x] Manifest updated
- [x] Scope doc points at the matrix
- [x] No API contract change

---

## Notes

- Selectors used: aria labels already on the line control, bell, and corner button; `data-copilot-chat`, `data-copilot-open`, `data-bell-root`, `data-queue-index`
- No `data-testid` added
- Last updated: 2026-10-02
