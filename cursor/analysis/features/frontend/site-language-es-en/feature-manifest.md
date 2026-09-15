# Feature Manifest — Site language support (Spanish and English)

> Use Feature name in the title. Use Feature slug only in the `Slug:` field and folder path.

## Feature

- Name: Site language support (Spanish and English)
- Slug: site-language-es-en
- Ticket/story: GREENBYTE-001
- Backlog ID: n/a — product backlog ID; does not replace Ticket/story
- Owner: greenbyte-hackathon
- Last updated: 2026-09-14
- Stack scope: frontend

## Goal

- Let public-site visitors switch between Spanish and English on the GreenByte landing experience.

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
  - `user-story.md` — present — bilingual user-facing copy requested; docs remain English
  - `analysis.md` — present — lightweight React context + TS catalogs; Cypress E2E
- Current behavior in scope:
  - English-only hardcoded strings in landing + layout — replaced with i18n catalogs
- Out of scope:
  - Backend APIs, auth flows, infrastructure — reason: frontend landing only

---

## TARGET SCOPE

- Frontend: `frontend/src/i18n/` context + `en`/`es` messages; `LanguageSwitcher` in header; landing + layout wired
- E2E: `frontend/cypress/e2e/language.cy.ts` — default EN, switch ES, persistence
- Out of scope: URL-based locales, CMS, backend

---

## Validation plan

- Run tests: yes
- Frontend tests: no
- Backend tests: n/a
- Infrastructure validate: n/a
- Manual checks:
  - Toggle ES/EN on desktop and mobile
  - Refresh page — language persists
  - Spot-check all landing sections in both languages
- Extra commands:
  - `cd frontend && npm run lint`
  - `cd frontend && npm run build`
  - `cd frontend && npm run test:e2e`

---

## Decisions

- Default locale: `en`
- Persistence: `localStorage` key `greenbyte-locale`
- i18n approach: React context + typed message catalogs (no react-i18next)
- Documentation language: English (story explicitly allows bilingual **user-facing** web copy)

---

## Next steps

- n/a — story shipped (GREENBYTE-001). Optional follow-up: URL-based locales (`/es/`), hreflang, or backend i18n (out of MVP scope).
