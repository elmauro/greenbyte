# User Story — How it works reference

## Title

- Name: How it works reference
- Slug: how-it-works-reference
- Ticket/story: GREENBYTE-007
- Backlog ID: n/a
- Change type: feat
- Stack scope: frontend

---

## Suggested sizing

- Story points (Fibonacci: 1, 2, 3, 5, 8, 13): 3
- Indicative only; re-estimate during planning.
- Rationale: frontend layout and copy only; existing architecture and flow pages stay, with redirects.

---

## Goal

- As a scheduler or reviewer opening the signed-in demo
- I want Architecture and the UI-to-API map under one How it works page, with a request and response example on each API step
- So that the header stays a product menu and the contract is readable without hunting a side panel

---

## SOURCE SCOPE

- Current behavior included:
  - Header lists UC1 UI↔API and Architecture as peers of Program Timeline — evidence: `frontend/src/components/layout/SiteHeader.tsx`
  - Flow map shows the HTTP contract in a narrow dark column beside the preview — evidence: `frontend/src/pages/demo/PlantUc1FlowGallery.tsx`, `frontend/src/components/plant/flow/PlantFlowApiPanel.tsx`
  - GET steps omit a request example — evidence: `frontend/src/content/plantFlowSteps.ts` (steps 01, 02, 05 have no `request`)
- Current behavior excluded:
  - Removing UC1 Pasco from the header — reason: out of scope; it is the classic operating screen
  - Changing BFF routes or JSON shapes — reason: out of scope
- Source docs:
  - `docs/hackathon/uc1-ui-backend-flow.md` — role: live map currently points at `/demo/plant/flow`
  - `frontend/docs/development/getting-started.md` — role: route table

---

## TARGET SCOPE

- Backend target (`backend/`):
  - API / function: unchanged
  - service / layer: unchanged
  - data / infra: unchanged
- Frontend target (`frontend/`):
  - page / route: `/demo/how-it-works` with `section=architecture|api`; `/demo/architecture` and `/demo/plant/flow` redirect
  - component: left section menu; flow step leads with request and response
  - service / type: unchanged
- Infrastructure target (`infrastructure/`):
  - module / capability: unchanged
  - env / IAM: unchanged
- Out of scope:
  - UC1 Pasco header item — reason: classic screen, not this reference page
  - New API examples that are not already in the flow snapshots — reason: do not invent contracts

---

## FLOW

1. Signed-in user opens How it works from the header — expected target: Architecture section selected — evidence/source: `SiteHeader.tsx`
2. User chooses UI and API in the left menu — expected target: flow steps, URL `section=api` — evidence/source: `HowItWorksPage`
3. User picks a step — expected target: when-sentence, example request, response JSON, then the screen preview — evidence/source: `PlantFlowApiPanel.tsx`

---

## Acceptance Criteria

1. The signed-in header shows one How it works link in place of the separate UI↔API and Architecture links — validation: manual
2. How it works has two menu options, Architecture and UI and API, and Architecture is selected when `section` is absent — validation: manual
3. Each UI and API step shows the method and a concrete path, a request body or an explicit no-body note, and the response JSON above the preview — validation: manual
4. `/demo/architecture` opens Architecture, and `/demo/plant/flow?step=` opens that step under UI and API — validation: manual
5. English and Spanish labels exist for the new menu and request/response headings — validation: frontend

---

## GAPS

- Deferred acceptance:
  - Classic view link inside How it works — reason: not part of this story
- Open questions:
  - none
