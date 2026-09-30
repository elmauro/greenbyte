# Feature Manifest — UC1 data model medallion (raw silver gold)

## Feature

- Name: UC1 data model medallion (raw silver gold)
- Slug: uc1-data-model-medallion
- Ticket/story: GREENBYTE-005
- Backlog ID: n/a
- Change type: feat
- Owner: greenbyte-hackathon (Data API — Camilo)
- Last updated: 2026-09-30
- Stack scope: backend

## Goal

- Build the UC1 entity-relational model in PostgreSQL as raw → silver → gold, with gold serving the whole use case (queue, replan, reasons, ingest, accept, reset, Agent context).

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
- Current behavior: only `raw` loaded; `ref`/`ops`/`plan` designed but not built — evidence: `backend/data-model/uc1-data-model.md` v2 §8
- Out of scope: Data API HTTP endpoints, BFF switch from DynamoDB, Agent API, SSV-specific heuristics

---

## TARGET SCOPE

- Backend: `backend/database/{migrations,etl,seeds,tests}`
- Docs: `backend/data-model/*`, `backend/database/README.md`, `docs/hackathon/uc1-system-blueprint.md`, `docs/hackathon/uc1-demo-operator-ingest.md`, `observations.md` pointers

---

## Validation plan

- Run tests: yes
- Extra commands:
  - `python3 backend/database/etl/build_model.py --dry-run`
- Manual checks:
  - `build_model.py`, `--checks-only`, `--scenario` against dev RDS (credentials via `~/.pgpass`)

---

## Decisions

- Medallion layers `raw` / `silver` / `gold`; gold holds derived reference (changeover rules, reason codes) and runtime plans.
- Demo anchors proposed: rush `1002295402`, QA fail `1002307552` (real open Line 1 POs).
