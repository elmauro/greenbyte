# Analysis — Nav label Pasco conditioning

## Impact

| Area | Change |
| --- | --- |
| i18n | `nav.demoPlant`, `hero.ctaDemoPlant` in `en.ts` / `es.ts` |
| Docs | `frontend/README.md` main demo routes table |

## Approach

- Single source: i18n keys already wired in `SiteHeader` and `Home.tsx`.
- Align CTA with nav for consistency.
- Keep “UC1” in internal eyebrows (`plantMvp.eyebrow`) — out of scope.

## Validation plan

- `npm run build` in `frontend/`
- Manual: sign in → header shows new label; home CTA text updated in EN/ES

## Risks

- None — copy only.
