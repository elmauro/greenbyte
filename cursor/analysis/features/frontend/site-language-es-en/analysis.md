# Analysis — Site language support (Spanish and English)

## Recommendation

Use a **lightweight React context** with static TypeScript message catalogs (`en.ts`, `es.ts`) — no `react-i18next` dependency for this single landing scope.

## Options considered

| Option | Pros | Cons | Decision |
| --- | --- | --- | --- |
| react-i18next | Mature, pluralization | Extra dependency for one page | Defer |
| Context + TS catalogs | Zero deps, type-safe keys, fits Vite/React stack | Manual key maintenance | **Selected** |
| URL prefixes (`/es`) | SEO-friendly | Out of story scope | Defer |

## Implementation outline

1. `frontend/src/i18n/` — `LocaleProvider`, `useLocale`, `messages/en.ts`, `messages/es.ts`
2. Persist locale in `localStorage` key `greenbyte-locale`; default `en`
3. Set `document.documentElement.lang` on locale change
4. `LanguageSwitcher` in `SiteHeader` (desktop + mobile) with `data-testid` for E2E
5. Refactor `Home.tsx`, `SiteHeader.tsx`, `SiteFooter.tsx` to consume messages
6. **Cypress** E2E (user-requested): install Cypress + `start-server-and-test`; spec covers default EN, switch to ES, persistence after reload

## Files to touch

- `frontend/src/i18n/*` (new)
- `frontend/src/components/layout/SiteHeader.tsx`
- `frontend/src/components/layout/SiteFooter.tsx`
- `frontend/src/pages/Home/Home.tsx`
- `frontend/src/main.tsx`
- `frontend/index.html` (static meta stays EN; optional `lang` via provider)
- `frontend/package.json` — scripts + devDeps
- `frontend/cypress.config.ts`, `frontend/cypress/e2e/language.cy.ts` (new)

## Risks

- Missing strings → mixed locale UI; mitigate with shared message type enforced by TypeScript
- Mobile menu + switcher layout; keep switcher in top bar visible on mobile

## Validation plan (confirmed)

- Run tests: yes
- Frontend tests: no (no Vitest in preset)
- Extra commands:
  - `cd frontend && npm run lint`
  - `cd frontend && npm run build`
  - `cd frontend && npm run test:e2e`
