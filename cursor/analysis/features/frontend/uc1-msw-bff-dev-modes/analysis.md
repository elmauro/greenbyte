# Analysis — UC1 frontend MSW and BFF connection modes

## Feature

- Name: UC1 frontend MSW and BFF connection modes
- Slug: uc1-msw-bff-dev-modes
- Ticket/story: GREENBYTE-002
- Analysis date: 2026-09-29
- Stack scope: frontend

---

## SOURCE SCOPE

- Problem / opportunity:
  - Team needs to develop UI against **HTTP contract** while Data/Agent APIs are not ready.
- Current behavior:
  - In-process `plantDemoServer` when `VITE_API_BASE_APP` empty — bypasses MSW in normal dev.
  - MSW only if `VITE_USE_MSW=true` manually — evidence: `enableMocking.ts`
- Source files reviewed:
  - `frontend/src/services/plantDemoApi.ts` — dual path remote vs in-process
  - `frontend/src/mocks/handlers/plantDemoHandlers.ts` — BFF-shaped routes
  - `C:\Projects\loyalty-app-ui-vite\loyalty-app-vite\src\services\apiConfig.ts` — reference pattern
- Out of scope:
  - Backend OpenAPI publish — separate Mauricio story
- Unknowns:
  - Production BFF URL — checked: not in repo yet

---

## TARGET SCOPE

- Frontend impact:
  - `apiConfig.ts`: `useMsw` forces `apiBaseApp ''` for same-origin MSW
  - `plantDemoApi.ts`: `useHttp` = MSW or live BFF; three `connectionMode` values
  - `.env.development`: MSW on by default
  - `PlantLineMvp.tsx`: footer copy per mode
  - `frontend/docs/development/api-mocks-and-bff.md`
- Infrastructure: none

---

## FLOW

| Step | Current / input | Target behavior | Change type | Evidence |
|------|-----------------|-----------------|-------------|----------|
| 1 | Dev, MSW off | Dev, MSW on via `.env.development` | new | `.env.development` |
| 2 | plantDemoApi skips HTTP if no base URL | HTTP if MSW **or** base URL set | extend | `plantDemoApi.ts` |
| 3 | Single footer message | MSW / in-process / BFF messages | extend | i18n + `PlantLineMvp` |

---

## OPTIONS CONSIDERED

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| A. MSW default dev (loyalty pattern) | Real HTTP stack; easy swap to BFF | Requires service worker | **Chosen** |
| B. Keep in-process only in dev | Simpler | Hides axios/MSW bugs until deploy | Rejected |
| C. Vite proxy to future BFF | No MSW | Needs live API early | Deferred |

---

## RECOMMENDATION

Implement **Option A**; keep in-process for static S3 builds without MSW.

---

## Context trace

| Read | Why |
|------|-----|
| `cursor/projects/frontend/project-context.md` | Stack rules |
| `backend/docs/api/UC1-SYNGENTA-DEMO-CONTEXT.md` | BFF routes |
| loyalty `apiConfig.ts` | Env pattern |
