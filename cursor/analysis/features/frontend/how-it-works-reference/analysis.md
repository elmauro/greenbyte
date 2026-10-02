# Analysis — How it works reference

## Feature

- Name: How it works reference
- Slug: how-it-works-reference
- Ticket/story: GREENBYTE-007
- Analysis date: 2026-10-02
- Stack scope: frontend

---

## SOURCE SCOPE

- Problem / opportunity:
  - Architecture and the UI-to-API map sit in the product header beside Program Timeline. The flow map already has JSON, but the request is easy to miss and GET steps show no send example.
- Current behavior:
  - `SiteHeader` demo items are UC1 Pasco, Program Timeline, UC1 UI↔API, Architecture — evidence: `frontend/src/components/layout/SiteHeader.tsx`
  - Flow gallery pairs a live preview with `PlantFlowApiPanel` in a narrow column — evidence: `frontend/src/pages/demo/PlantUc1FlowGallery.tsx`
  - Request bodies exist for POST steps in `PLANT_FLOW_STEPS`; GET queue steps only have a path template — evidence: `frontend/src/content/plantFlowSteps.ts`
  - `plantDemoApi.getQueue` calls `GET /demo/plant/lines/${lineId}/queue` with optional `locale` — evidence: `frontend/src/services/plantDemoApi.ts`
- Source files or docs reviewed:
  - `frontend/src/pages/demo/HackathonArchitecturePage.tsx` — role: architecture content — evidence: page body
  - `frontend/src/routes/paths.ts` — role: `/demo/architecture`, `/demo/plant/flow`
  - `docs/hackathon/uc1-ui-backend-flow.md` — role: live map URL
- Out of scope:
  - UC1 Pasco header removal — reason: classic operating screen
  - BFF or snapshot changes — reason: examples must match the current flow snapshots
- Unknowns:
  - none — evidence checked: flow steps and `plantDemoApi.ts`

---

## TARGET SCOPE

- Backend impact (`backend/`):
  - APIs / functions: none
  - services / layers: none
  - data / DynamoDB / PostgreSQL: none
  - API docs / business rules: point live URLs at `/demo/how-it-works` where a doc is the entry pointer
  - tests: none
- Frontend impact (`frontend/`):
  - pages / components: `HowItWorksPage`, header item, embedded architecture and flow bodies, contract-first `PlantFlowApiPanel`
  - services / types: none
  - mocks / E2E / unit tests: none; frontend has no unit test script
  - docs: `frontend/docs/development/getting-started.md` route table
- Infrastructure impact (`infrastructure/`):
  - modules / capabilities: none
  - env / IAM / deploy: none
  - docs: none

---

## FLOW

1. Header How it works opens `/demo/how-it-works` with Architecture selected.
2. Left menu sets `section=architecture` or `section=api` in one search-param update. Switching to Architecture drops `step`.
3. UI and API keeps the existing step query. Old `/demo/plant/flow?step=` redirects with `section=api` preserved.
4. Each step renders trigger, example request line, body or no-body note, response JSON, field map, then the preview.

---

## Acceptance criteria

1. One How it works header link — source: user-story AC1
2. Two-section menu, Architecture default — source: user-story AC2
3. Request and response lead each API step — source: user-story AC3
4. Legacy routes redirect — source: user-story AC4
5. en and es copy — source: user-story AC5

---

## Risks

- Nested `site-container-demo` if the embedded pages keep their own intro band. Embedded mode drops `SiteLayout` and the intro container.
- Flow `setSearchParams` must keep `section` or the menu selection resets when a step changes.
