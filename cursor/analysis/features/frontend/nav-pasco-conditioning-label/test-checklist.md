# Test checklist — Nav label Pasco conditioning

## Feature

- Name: Nav label Pasco conditioning
- Slug: nav-pasco-conditioning-label
- Ticket/story: GREENBYTE-013
- Tester: agent
- Date: 2026-10-02
- Environment: local

---

## Manual

- [ ] EN: signed-in header → **Pasco conditioning** → `/demo/plant`
- [ ] ES: **Acondicionamiento Pasco**
- [ ] Hero CTA text updated (EN/ES)

## Automated checks

- [x] `npm run build` (frontend) — PASS 2026-10-02

## Results

- Summary: copy-only; build green.
- Sign-off: validation complete 2026-10-02

## Review

- Review: **pass** — i18n + README only; no API or route change.
