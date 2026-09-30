# Feature Manifest — UC1 frontend MSW and BFF connection modes

## Feature

- Name: UC1 frontend MSW and BFF connection modes
- Slug: uc1-msw-bff-dev-modes
- Ticket/story: GREENBYTE-002
- Backlog ID: n/a
- Change type: feat
- Owner: greenbyte-hackathon
- Last updated: 2026-09-29
- Stack scope: frontend

## Goal

- Standardize UC1 local development on MSW + axios (BFF contract), with a clear switch to live core-api when ready.

---

## Status

- User Story: done
- Analysis: done
- Implementation: done
- Testing: done
- Review: done
- Current stage: done

---

## SOURCE SCOPE

- Problem / opportunity status: clear
- Source documents:
  - `user-story.md` — present
  - `analysis.md` — present
- Current behavior in scope:
  - UC1 plant demo via `plantDemoApi` — evidence: `/demo/plant`
- Out of scope:
  - UC4 breeding mocks — reason: not UC1

---

## TARGET SCOPE

- Frontend:
  - `src/services/apiConfig.ts`, `plantDemoApi.ts`, `enableMocking.ts`
  - `.env.development`, `.env.example`
  - `docs/development/api-mocks-and-bff.md`
  - i18n `apiNoteMsw` / updated notes; `PlantLineMvp.tsx`

---

## Validation plan

- Run tests: yes
- Frontend tests: no (unit)
- Backend tests: n/a
- Infrastructure validate: n/a
- Manual checks:
  - `npm run dev` — `/demo/plant` rush/QA/explain work; footer says MSW
  - Build without MSW — production build succeeds
- Extra commands:
  - `cd frontend && npm run lint`
  - `cd frontend && npm run build`

---

## Decisions

- Default dev: `VITE_USE_MSW=true` (`.env.development`)
- Live BFF: `VITE_USE_MSW=false` + `VITE_API_BASE_APP`
- Static S3: MSW off + empty base → in-process (unchanged)

---

## Next steps

- When core-api URL exists: document in `.env.local` example in team wiki; no code change expected.
