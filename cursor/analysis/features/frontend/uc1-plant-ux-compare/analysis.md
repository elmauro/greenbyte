# Analysis — UC1 Plant UX compare page

## Feature

- Name: UC1 Plant UX compare page
- Slug: uc1-plant-ux-compare
- Ticket/story: GREENBYTE-004 (local)
- Analysis date: 2026-09-30
- Stack scope: frontend

## SOURCE SCOPE

- Problem: External UX prototype had stronger scheduler flows; production GreenByte demo must keep existing visual system and BFF contract.
- Current behavior: `/demo/plant` uses `PlantBaselineDashboard` + `usePlantDemoQueue` (BFF/MSW poll, accept).
- Reference UX: `pixel-perfect-pixel` `Line1Workspace.tsx` (local only — behavior/copy, not styles).
- Out of scope: Cognito integration; ERP writes; scenario switcher replacing ingest.

## TARGET SCOPE

- Frontend:
  - Route `/demo/plant/ux` with demo session gate (`plantDemoSessionAuth.ts`).
  - `PlantBaselineDashboard` `experience="ux"` for enhanced flows without changing baseline default.
  - Phase 2: queue filters, approval history (localStorage), “What changed”, mobile nav.
- Backend: no contract changes.

## Risks

- Demo credentials are hackathon-only; override via `VITE_DEMO_PLANT_*`.

## Validation

- `npm run build` + `npm run lint` in `frontend/`.
- Manual: login, ingest event, bell → schedule → accept → queue badge.
