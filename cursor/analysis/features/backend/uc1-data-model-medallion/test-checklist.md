# Test Checklist — UC1 data model medallion (raw silver gold)

## Feature

- Name: UC1 data model medallion (raw silver gold)
- Slug: uc1-data-model-medallion
- Ticket/story: GREENBYTE-005
- Tester: agent
- Date: 2026-09-30
- Environment: dev RDS `greenbyte` (PostgreSQL 16.13)

---

## Automated Checks

- Database:
  - [x] `python3 backend/database/etl/build_model.py --dry-run` — 19 steps listed (2026-09-30)
  - [x] `build_model.py` — committed in 5.9 s; reconciliation 61/61 (2026-09-30)
  - [x] `build_model.py --checks-only` — 61/61 (2026-09-30)
  - [x] `build_model.py --scenario` — demo scenario passed, rolled back (2026-09-30)
  - [x] Rebuild twice — identical counts (idempotent) (2026-09-30)
  - [x] Ingest replay across a rebuild — rush event re-applied as v2 (rolled-back session) (2026-09-30)

---

## Manual

- [ ] Data API / BFF calls gold functions on dev (after the Data API endpoints exist)
- [ ] `/demo/plant` shows the gold queue after an operator ingest

---

## Review

Review: **pass**

- All counts reconcile with observations §9.4; DQ differences explained in uc1-data-model §3.1.
- No BFF/frontend code changed; anchors proposal documented for the BFF owner.

---
