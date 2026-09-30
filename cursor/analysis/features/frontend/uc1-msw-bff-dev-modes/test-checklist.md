# Test Checklist — UC1 frontend MSW and BFF connection modes

## Feature

- Name: UC1 frontend MSW and BFF connection modes
- Slug: uc1-msw-bff-dev-modes
- Ticket/story: GREENBYTE-002
- Tester: agent
- Date: 2026-09-29
- Environment: local

---

## Automated Checks

- Lint/build:
  - [x] `npm run lint` — pass (2026-09-29)
  - [x] `npm run build` — pass (2026-09-29)

---

## Smoke — feature (T2)

- [x] `cd frontend && npm run lint` — PASS 2026-09-29
- [x] `cd frontend && npm run build` — PASS 2026-09-29

---

## Manual (recommended)

- [ ] `npm run dev` — open `/demo/plant` — footer mentions MSW
- [ ] Simulate rush + QA + explain batch — no console errors
- [ ] Optional: `VITE_USE_MSW=false` + empty base — footer in-process (preview build)

---

## Review

Review: **pass**

- Scope matches story; MSW/BFF/in-process separation is documented and typed.
- No secrets committed; env examples only.

---

## Notes

- E2E with MSW env not re-run this session; manifest lists optional follow-up.
