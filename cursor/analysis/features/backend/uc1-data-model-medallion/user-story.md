# User Story — UC1 data model medallion (raw silver gold)

- Name: UC1 data model medallion (raw silver gold)
- Ticket/story: GREENBYTE-005

## As a

Data API owner (Camilo), with the Agent API (David) and the BFF (Mauricio) as consumers

## I want

The UC1 entity-relational model built in PostgreSQL as a raw → silver → gold medallion, where gold serves every use-case need: open queue, capacity, changeover, QA holds, versioned plans with reasons, ingest of upstream signals, accept, reset and Agent grounding

## So that

The demo storyline (calm queue → rush or QA fail lands → replan with reasons → scheduler accepts → reset) runs on the real Pasco extracts instead of a stub, and every explanation cites stable ids (PO, lot, quality test, order).

## Acceptance criteria

- [x] `silver` typed and conformed from `raw`, with the R-* rules, lineage (`source_csv`, `source_row_number`, sha256, `load_id`) and DQ flags on every fact row.
- [x] `gold` views (throughput, changeover, QA status, open queue, plan queue/diff, order risk, DQ summary) and runtime tables (plan event, plan, entry, reason, decision).
- [x] `raw.ingest_event` + gold ingest functions for the two BFF ingest routes; ingest refuses POs that aren't on the line's open queue.
- [x] Heuristic v1 replan writes immutable plan versions with machine reasons; JSON matches `plantDemoTypes.ts`.
- [x] Reconciliation (observations §9.4 + DQ counts) passes inside the build transaction.
- [x] Storyline test passes on real open Line 1 POs (rolled back).
- [x] Docs: data model v3 with Mermaid ER diagram; database README; blueprint / operator-ingest anchors proposal.
