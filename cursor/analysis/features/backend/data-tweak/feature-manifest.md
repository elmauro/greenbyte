# Feature Manifest — Data tweak

## Feature

- Name: Data tweak
- Slug: data-tweak
- Ticket/story: GREENBYTE-017
- Backlog ID: n/a
- Change type: feat
- Owner: greenbyte-hackathon (Data API — Camilo)
- Last updated: 2026-10-02
- Stack scope: backend

## Goal

- Put the demo's commitment dates and plan clock on demo day (R-DATE-SHIFT): clock 2026-10-02, commitment dates + 7 days, keys untouched.

---

## Status

- User Story: done
- Analysis: done
- Implementation: done; applied to the dev RDS 2026-10-02
- Testing: done (dry-run, Jest, full build: reconciliation 61/61, gold v4 13/13)
- Review: pending
- Current stage: review

---

## SOURCE SCOPE

- Problem / opportunity status: clear
- Current behavior: plan horizon 2026-09-28 (extract date); open finish dates partly before demo day — evidence: `seeds/gold_config.sql`, CSV profile in analysis.md
- Out of scope: frontend MSW mocks and BFF fallback dates (follow-up), Agent API

---

## TARGET SCOPE

- Backend: `backend/database/etl/transforms/silver/{00_rules,20_process_order,30_facts}.sql`, `backend/database/seeds/gold_config.sql`
- Docs: `observations.md` §6.1 / §8, `backend/database/etl/gold-model/{gold-data-model,WORKING-PLAN,source-to-target-mapping}.md`, `backend/database/README.md`, `docs/hackathon/uc1-gold-planner-handoff.md`

---

## Validation plan

- Run tests: yes
- Backend tests: yes
- Frontend tests: n/a
- Infrastructure validate: n/a
- Extra commands:
  - `python3 backend/database/etl/build_model.py --dry-run`
- Manual checks:
  - `build_model.py`, `--checks-only`, `--validate`, `--scenario`, `--reset-demo line-1` / `line-2` against the dev RDS (after team sign-off)

---

## Decisions

- DT-1…DT-6 in `backend/database/etl/gold-model/WORKING-PLAN.md` §7 (option C, +7 days, all lines, shift in silver).
