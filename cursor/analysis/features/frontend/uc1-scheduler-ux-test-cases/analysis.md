# Analysis — UC1 scheduler UX test cases

## Feature

- Name: UC1 scheduler UX test cases
- Slug: uc1-scheduler-ux-test-cases
- Ticket/story: GREENBYTE-009
- Analysis date: 2026-10-02
- Stack scope: frontend

---

## SOURCE SCOPE

- Problem / opportunity:
  - There is no single UX test list for the UC1 Pasco scheduler. Scope lives in a product doc. Older checklists are partial and still have open boxes. Cypress does not drive the scheduler routes.
- Current behavior:
  - `/demo/plant`, `/demo/plant/ux`, and `/demo/plant/tour` redirect to `/demo/sign-in` until sessionStorage holds `greenbyte-plant-ux-session-v1` — evidence: `frontend/src/components/demo/DemoSessionGuard.tsx`
  - The UX workspace reads `line` and `section` from the query string. Line choices are `line-1` and `line-2` — evidence: `frontend/src/components/plant/PlantLineUx.tsx`, `frontend/src/demo/plant/plantLines.ts`
  - The calm dashboard, bell, Scheduling timeline, what-changed rail, and corner chat are on the UX experience — evidence: `frontend/src/components/plant/PlantBaselineDashboard.tsx`, `frontend/src/components/plant/PlantScheduleCopilot.tsx`
  - The bell shows a notice only when a pending event should surface. Placeholder order text is scrubbed — evidence: `frontend/src/hooks/usePlantLineNotices.ts`, `frontend/src/demo/plant/plantEventUtils.ts`
  - Accept posts `/demo/plant/schedule/accept`. Ingest is not a scheduler button. Explain posts `{ po, question, locale }` — evidence: `frontend/src/services/plantDemoApi.ts`
  - Queue poll every 5 seconds runs only in MSW or live BFF mode — evidence: `frontend/src/hooks/usePlantDemoQueue.ts`
  - The in-process mock serves `line-1` only and starts calm — evidence: `frontend/src/demo/plant/plantDemoServer.ts`
  - Position 1 has no move-up control and is labeled Running. HOLD rows have no move controls — evidence: `frontend/src/components/plant/PlantProgramGantt.tsx`
  - The calm in-process queue has no HOLD rows — evidence: `frontend/src/demo/plant/pascoLine1Baseline.ts`
  - Guided tour still renders at `/demo/plant/tour` — evidence: `frontend/src/pages/demo/PlantCapacityTour.tsx`
  - How it works already has `frontend/cypress/e2e/how-it-works.cy.ts`
- Source files or docs reviewed:
  - `docs/hackathon/uc1-mvp-scope.md` — role: scope — evidence: section 4.1 UI blocks and section 5 manual adjust plus explain-my-batch
  - `frontend/src/i18n/messages/en.ts` — role: copy — evidence: plantMvp strings
  - `frontend/package.json` and `frontend/cypress.config.mjs` — role: how Cypress starts — evidence: `test:e2e` on port 51730, `supportFile: false`
  - `cursor/company/future-work/STORY-REGISTRY.md` — role: next id — evidence: GREENBYTE-009 was free; no `cursor/scripts/github-story.config.json`
- Out of scope:
  - How it works assertions — reason: existing spec
  - Product behavior, SQL, and IAM — reason: tests only
  - Live Accept and ingest — reason: shared plan
- Unknowns:
  - Current pending event on the deployed plan — evidence checked: not required, because the spec does not call that host

---

## TARGET SCOPE

- Backend impact (`backend/`):
  - APIs / functions: none
  - services / layers: none
  - data / DynamoDB / PostgreSQL: none
  - API docs / business rules: none
  - tests: none
- Frontend impact (`frontend/`):
  - pages / routes: covered by the matrix and one Cypress spec
  - components: no behavior change; existing aria labels and data attributes are enough
  - services / types: none
  - mocks / E2E / unit tests: new `frontend/cypress/e2e/uc1-scheduler-ux.cy.ts` and a runner that forces the in-process mock
  - docs: `docs/hackathon/uc1-scheduler-ux-test-cases.md` plus a pointer from the scope doc
- Infrastructure / config impact:
  - none

---

## FLOW

| Step | Current / input | Target behavior | Change type | Evidence |
|------|-----------------|-----------------|-------------|----------|
| 1 | Scope doc is not a test matrix | One case list with id, route, precondition, steps, expected result, automated or manual | new | `docs/hackathon/uc1-mvp-scope.md` |
| 2 | Cypress does not open the scheduler | Spec signs in via sessionStorage and checks read-only UX | new | `frontend/cypress/e2e/how-it-works.cy.ts` |
| 3 | Accept and ingest change the shared plan when the live base URL is set | Those cases stay manual; the runner clears the API base and turns MSW off | defer | `frontend/src/services/apiConfig.ts` |
| 4 | How it works already has a spec | Matrix points at that spec and does not duplicate it | reuse | `frontend/cypress/e2e/how-it-works.cy.ts` |

---

## OPTIONS CONSIDERED

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| A | Cypress against the live BFF for every block, including Accept | Mutates the shared demo plan | reject |
| B | Cypress with MSW | Safe for GET, but Accept and ingest handlers still change the in-browser server, and line-2 is unknown to that server | reject |
| C | Cypress with the in-process mock (MSW off, empty API base) for read-only flows; manual rows for POST and for HOLD | No network call to API Gateway; calm bell and line URL are deterministic | accept |

---

## RECOMMENDATION

- Recommended approach:
  - Publish the matrix under `docs/hackathon/`. Automate only flows that read the page. Force the in-process mock in the Cypress runner. Mark Accept, ingest, explain submit, remote poll, and HOLD adjust as manual.
- Implementation order:
  1. Write the matrix — stack/layer: docs — dependency: scope doc section 4.1 and 5
  2. Add the Cypress spec and runner — stack/layer: frontend — dependency: English copy in `en.ts`
  3. Point the scope doc at the matrix — stack/layer: docs — dependency: the new doc
- Reuse requirements:
  - Session bootstrap already used by How it works — evidence: `frontend/cypress/e2e/how-it-works.cy.ts`
  - Line control, bell, and chat already expose aria labels — evidence: `PlantSelect`, `PlantBaselineDashboard`, `PlantCopilotChatDock`

---

## GAPS

- Missing behavior:
  - No scheduler Cypress spec — target: frontend — decision: implement
  - No single UX matrix — target: docs — decision: implement
- Partial behavior:
  - Older feature checklists mention the UX route and manual adjust — delta: they are not a scope-mapped matrix and several boxes are still open — decision: defer those files; the new matrix is the list
- Assumptions:
  - `/demo/plant/ux` is the scheduler the demo uses day to day — validation needed: routes in `AppRoutes.tsx` (confirmed)
- Deferred items:
  - Automating Accept — reason: POST changes plan state on the live BFF
  - Automating HOLD reorder — reason: the calm baseline has no HOLD rows

---

## RISKS

- Risk register:
  - Cypress inherits a developer `.env.local` that points at API Gateway — impact: high — mitigation: the runner sets `VITE_USE_MSW` to false and `VITE_API_BASE_APP` to empty before Vite starts, and the spec destroys any request whose URL contains execute-api
- Dependencies:
  - English copy in `en.ts` — owner/status: current UI
- Validation focus:
  - Lint and the scheduler spec — source: acceptance criteria 1 and 2

---

## OPEN QUESTIONS

- None before implementation. GitHub sync is skipped because `cursor/scripts/github-story.config.json` is absent.
