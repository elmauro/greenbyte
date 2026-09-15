# Implementation Notes — Site language support (Spanish and English)

## Summary

Added a lightweight i18n layer with React context, English/Spanish message catalogs, a header language switcher (desktop + mobile), and Cypress E2E coverage.

## Changes

| Area | Path | Notes |
| --- | --- | --- |
| i18n core | `frontend/src/i18n/LocaleContext.tsx` | Context, `localStorage` persistence, `document.lang` |
| Messages | `frontend/src/i18n/messages/en.ts`, `es.ts` | Typed catalogs; `es` satisfies `Messages` from `en` |
| Switcher | `frontend/src/components/layout/LanguageSwitcher.tsx` | EN/ES toggle with `data-testid="lang-en|es"` |
| Header | `frontend/src/components/layout/SiteHeader.tsx` | Translated nav + switcher |
| Footer | `frontend/src/components/layout/SiteFooter.tsx` | Translated copy |
| Home | `frontend/src/pages/Home/Home.tsx` | All landing sections use messages |
| Bootstrap | `frontend/src/main.tsx` | Wraps app in `LocaleProvider` |
| E2E | `frontend/cypress/e2e/language.cy.ts`, `frontend/cypress.config.mjs` | Default EN, switch ES, reload persistence |
| Scripts | `frontend/package.json` | `test:e2e`, `cypress:run`; devDeps: cypress, start-server-and-test |

## Storage

- Key: `greenbyte-locale`
- Values: `en` | `es`
- Default: `en` when missing or invalid

## Out of scope (unchanged)

- URL locale prefixes, backend i18n, hreflang, browser language auto-detect
