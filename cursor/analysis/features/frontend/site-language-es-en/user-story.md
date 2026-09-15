# User Story — Site language support (Spanish and English)

> Use Feature name in the title. Use Feature slug only in the `Slug:` field and folder path.

## Title

- Name: Site language support (Spanish and English)
- Slug: site-language-es-en
- Ticket/story: GREENBYTE-001
- Backlog ID: n/a
- Stack scope: frontend

---

## Suggested sizing

- Story points (Fibonacci: 1, 2, 3, 5, 8, 13): 5
- Indicative only; re-estimate during planning.
- Rationale: frontend-only i18n for marketing landing; translation files + switcher + persistence; no backend contract.

---

## Goal

- As a **visitor to greenbyte-ag.com**
- I want to **read the public site in Spanish or English**
- So that **I can understand GreenByte in my preferred language**

---

## SOURCE SCOPE

- Current behavior included:
  - All marketing copy is hardcoded in English in `frontend/src/pages/Home/Home.tsx`, `SiteHeader.tsx`, `SiteFooter.tsx` — evidence: component source
  - Single-locale `index.html` meta description in English — evidence: `frontend/index.html`
- Current behavior excluded:
  - Backend API localization — reason: out of scope (static landing)
  - CMS or runtime translation service — reason: MVP uses static JSON/TS dictionaries
- Source docs:
  - `.cursor/rules/documentation-english.mdc` — project docs stay English; **user-facing web copy may be bilingual for this story**

---

## TARGET SCOPE

- Backend target (`backend/`):
  - n/a
- Frontend target (`frontend/`):
  - page / route: `Home` landing and shared layout (header, footer)
  - component: language switcher (ES | EN) in header
  - service / type: i18n context or hook; locale message files (`en`, `es`)
- Infrastructure target (`infrastructure/`):
  - n/a
- Out of scope:
  - Full app/router i18n for future authenticated areas — reason: only public landing in MVP
  - SEO hreflang / locale URL prefixes (`/es/…`) — reason: defer unless analysis recommends otherwise
  - Auto-detect locale from `Accept-Language` only (without manual override) — reason: switcher + persistence required

---

## FLOW

1. Visitor opens the site — expected target: content renders in last selected language or default **English** — evidence/source: locale init
2. Visitor selects **ES** or **EN** in the header — expected target: all in-scope strings update without full page reload — evidence/source: React i18n state
3. Visitor returns later (same browser) — expected target: preferred language is restored — evidence/source: `localStorage` (or equivalent)

---

## Acceptance Criteria

1. A visible **language control** (ES / EN) appears in the site header on desktop and mobile — validation: manual
2. Switching language updates **all in-scope landing copy** (hero, intro, nav labels, footer, section headings, news titles where present) — validation: manual
3. Selected language **persists** across page refresh in the same browser — validation: manual
4. Default language is **English** when no preference is stored — validation: manual
5. Spanish strings are grammatically correct and match the meaning of the English source (no placeholder/lorem text) — validation: manual
6. No regression to layout or navigation (anchors, mobile menu still work) — validation: manual
7. Feature package docs and code comments remain **English** per project documentation rules — validation: review

---

## GAPS

- Deferred acceptance:
  - hreflang tags and locale-specific URLs — reason: post-MVP SEO pass
  - Browser language auto-detection on first visit — reason: confirm with product; default EN is acceptable for hackathon demo
- Unknowns:
  - Whether Syngenta partner disclaimer must differ by locale — evidence checked: same legal line likely OK in both languages; confirm in analysis

---

## RISKS

- Product / contract risks:
  - Mixed EN/ES if some strings are missed during extraction — mitigation: checklist of components + manual QA both locales
- Validation focus:
  - Mobile menu + language switch together — expected result: both usable without overlap or broken state

---

## Notes

- Environment / flags: none required for MVP
- Test data: n/a
- Related docs: `cursor/projects/frontend/project-context.md`
- Last updated: 2026-09-14
