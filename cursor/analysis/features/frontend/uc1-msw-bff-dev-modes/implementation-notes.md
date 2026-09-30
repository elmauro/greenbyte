# Implementation Notes — UC1 frontend MSW and BFF connection modes

## Summary

Aligned GreenByte UC1 client with **loyalty-app-vite** mock strategy: axios + MSW in dev, in-process for static deploy, env-only switch to Mauricio's BFF.

## Changes

| File | Change |
|------|--------|
| `frontend/src/services/apiConfig.ts` | `useMsw`, `getApiConnectionMode()`, empty `apiBaseApp` when MSW |
| `frontend/src/services/plantDemoApi.ts` | HTTP for MSW and live BFF; `connectionMode` export |
| `frontend/src/enableMocking.ts` | Service worker URL + error logging (loyalty parity) |
| `frontend/.env.development` | `VITE_USE_MSW=true` |
| `frontend/.env.example` | Documented three modes |
| `frontend/docs/development/api-mocks-and-bff.md` | Team runbook |
| `frontend/docs/README.md` | Link to runbook |
| `frontend/src/components/plant/PlantLineMvp.tsx` | Footer by connection mode |
| `frontend/src/i18n/messages/en.ts`, `es.ts` | `apiNoteMsw`, updated local/BFF notes |

## Contract alignment

- MSW handlers unchanged paths: `frontend/src/mocks/handlers/plantDemoHandlers.ts`
- Types: `frontend/src/demo/plant/plantDemoTypes.ts`
- Backend reference: `backend/docs/api/uc1-demo-response-examples.json`

## Follow-up (other owners)

- **Mauricio:** deploy core-api; team sets `VITE_API_BASE_APP`
- **Camilo / David:** no browser exposure; BFF orchestration only
