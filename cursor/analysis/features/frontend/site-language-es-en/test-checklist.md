# Test Checklist — Site language support (Spanish and English)

## Feature

- Name: Site language support (Spanish and English)
- Slug: site-language-es-en
- Ticket/story: GREENBYTE-001
- Tester: agent
- Date: 2026-09-14
- Environment: local

---

## SOURCE SCOPE

- Acceptance criteria to validate:
  - ES/EN control in header (desktop + mobile) — source: user-story
  - All in-scope landing copy translates — source: user-story
  - Language persists on refresh — source: user-story
  - Default EN when no preference — source: user-story
  - No layout/nav regression — source: user-story

---

## TARGET SCOPE

- Frontend areas to validate:
  - `frontend/src/i18n/` — LocaleProvider, message catalogs
  - `frontend/src/components/layout/LanguageSwitcher.tsx` — switcher
  - `frontend/src/pages/Home/Home.tsx`, layout components — translated copy
  - `frontend/cypress/e2e/language.cy.ts` — E2E coverage

---

## FLOW

### Happy Path

- [x] Scenario: Switch EN → ES on landing
  - Steps: Open `/`, click ES, verify hero and nav in Spanish
  - Expected result: Spanish copy visible; `document.lang` is `es`
  - Evidence: `language.cy.ts` — switches to Spanish

### Validations

- [x] Scenario: Default locale
  - Steps: Clear storage, visit `/`
  - Expected result: English hero; EN button pressed
  - Evidence: `language.cy.ts` — defaults to English

- [x] Scenario: Persistence
  - Steps: Switch to ES, reload
  - Expected result: Spanish remains selected
  - Evidence: `language.cy.ts` — persists Spanish after reload

---

## Automated Checks

- E2E:
  - [x] `npm run test:e2e` — result: pass (3/3)
- Lint/build:
  - [x] `npm run lint` — result: pass (0 errors)
  - [x] `npm run build` — result: pass

---

## Smoke — feature (T2)

- [x] `cd frontend && npm run lint` — PASS 2026-09-14
- [x] `cd frontend && npm run build` — PASS 2026-09-14
- [x] `cd frontend && npm run test:e2e` — PASS 2026-09-14

---

## Results

- Summary:
  - passed: 3 E2E specs, lint, build
  - failed: 0
  - blocked: 0
- Sign-off: agent / 2026-09-14

---

## Review / Close

- Review: **pass**
- Close blockers: none
