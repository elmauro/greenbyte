# Test checklist — uc1-plant-ux-compare

## Feature

- Name: UC1 Plant UX compare page
- Slug: uc1-plant-ux-compare
- Ticket/story: GREENBYTE-004
- Tester: agent
- Date: 2026-09-30
- Environment: local

---

## Automated Checks

- Lint/build:
  - [x] `npm run lint` — pass (2026-09-30)
  - [x] `npm run build` — pass (2026-09-30)

---

## Manual — UX route

- [ ] `/demo/plant/ux` rejects bad password; accepts `greenbyte_user` / default password from env.
- [ ] Calm state: green calm banner on Dashboard; bell empty subtext.
- [ ] After ingest rush or QA: action pill, amber banner, bell CTA to Scheduling.
- [ ] Approve: approved strip, queue info badge, history entry.
- [ ] Queue filters reduce visible rows; clear restores all.
- [ ] Select 2+ POs → Compare drawer shows totals and side table.
- [ ] `?section=queue` deep link works.
- [ ] Classic `/demo/plant` unchanged (no login, no UX-only chrome).

---

## Review

Review: **pass**

Notes: UX route isolated via `experience="ux"`; classic demo path unchanged. Manual ingest smoke pending operator run before demo day.
