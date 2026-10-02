# Test checklist — How it works reference

## Automated Checks

- [x] `npm run lint --prefix frontend` — PASS 2026-10-02 (eslint, existing hook warnings only)
- [x] `npx tsc -b --pretty false` in `frontend/` — PASS 2026-10-02

## Smoke — feature (T2)

- [x] Headless Edge on `http://localhost:51730` — PASS 2026-10-02
  - Header shows How it works and does not show UC1 UI↔API
  - Architecture is the selected menu item on `/demo/how-it-works` and shows Syngenta briefs
  - UI and API shows `GET /demo/plant/lines/line-1/queue?locale=en`, the no-body note, and Request / Response
  - `/demo/plant/flow?step=03` lands on `/demo/how-it-works?step=03&section=api` with `POST /demo/plant/ingest/sap-priority-change` and PO `1002307551`
  - `/demo/architecture` lands on `/demo/how-it-works`
  - Spanish locale: menu Arquitectura / UI y API, headings Petición / Respuesta, and the no-body note

## Manual (optional) (T3)

- Cypress spec `frontend/cypress/e2e/how-it-works.cy.ts` covers the same path. It was not executed here because the Cypress 14.5.4 binary is not installed in this environment.

## Review / Close

- Review: **pass**
- Sign-off: validation complete 2026-10-02
