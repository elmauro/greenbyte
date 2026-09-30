# User Story — UC1 frontend MSW and BFF connection modes

## Title

- Name: UC1 frontend MSW and BFF connection modes
- Slug: uc1-msw-bff-dev-modes
- Ticket/story: GREENBYTE-002
- Backlog ID: n/a
- Change type: feat
- Stack scope: frontend

---

## Suggested sizing

- Story points: 3
- Rationale: Services + env modes only; UC1 UI already exists; aligns with loyalty-app-vite pattern.

---

## Goal

- As a **frontend developer (Mauricio)**
- I want **local dev to use MSW over the same BFF paths as production**
- So that **Camilo and David can ship Data/Agent behind core-api later without rewriting React**

---

## SOURCE SCOPE

- Current behavior included:
  - UC1 demo calls `plantDemoApi` — evidence: `frontend/src/services/plantDemoApi.ts`
  - Empty `VITE_API_BASE_APP` → in-process `plantDemoServer` — evidence: same file
  - MSW handlers exist but dev default did not enable MSW — evidence: `.env.example` `VITE_USE_MSW=false`
- Current behavior excluded:
  - Live BFF Lambda — reason: Mauricio/Camilo/David not wired yet
- Source docs:
  - `backend/docs/api/UC1-SYNGENTA-DEMO-CONTEXT.md` — BFF contract
  - `docs/hackathon/uc1-ui-backend-flow.md` — UI ↔ API map

---

## TARGET SCOPE

- Frontend target:
  - service: `apiConfig.ts`, `plantDemoApi.ts` — MSW | in-process | live BFF
  - env: `.env.development` — `VITE_USE_MSW=true`
  - docs: `frontend/docs/development/api-mocks-and-bff.md`
  - UI hint: `/demo/plant` footer by connection mode
- Out of scope:
  - New UC1 screens — reason: already shipped in prior work
  - Breeding UC4 mocks — reason: separate story

---

## FLOW

1. Developer runs `npm run dev` — MSW intercepts `/demo/plant/*` — evidence: `enableMocking.ts`, handlers
2. Static deploy (no MSW) — in-process mock — evidence: `plantDemoApi` when no base URL
3. Hackathon week — set `VITE_API_BASE_APP` — axios hits core-api — evidence: `apiConfig.ts`

---

## Acceptance Criteria

1. Default local dev uses MSW for all UC1 BFF paths — validation: manual + build
2. `plantDemoApi` uses axios when MSW or live BFF; in-process only for static mode — validation: code review
3. Documented three modes and env vars — validation: `frontend/docs/development/api-mocks-and-bff.md`
4. `/demo/plant` shows distinct footer note for MSW vs in-process vs BFF — validation: manual
5. `npm run build` passes — validation: frontend

---

## GAPS

- Deferred acceptance:
  - Cypress with `VITE_USE_MSW=true` in CI — reason: optional; existing e2e may need env pass-through
- Unknowns:
  - Exact API Gateway URL — evidence: TBD at deploy

---

## RISKS

- Product / contract risks:
  - MSW and `plantDemoServer` drift from BFF — mitigation: shared types + backend JSON examples
- Validation focus:
  - Rush/QA/explain still work under MSW — expected: same as in-process

---

## Notes

- Reference pattern: loyalty-app-vite (`VITE_USE_MSW` + empty base URL)
- Last updated: 2026-09-29
