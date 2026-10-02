# User Story — Data tweak

- Name: Data tweak
- Slug: data-tweak
- Ticket/story: GREENBYTE-017
- Backlog ID: n/a
- Change type: feat
- Stack scope: backend
- Owner: Data API (Camilo)
- Branch: feature/data-tweak

## Story

As the demo presenter, I want the open orders' delivery dates to sit around demo day (2026-10-02) instead of the extract date (2026-09-28), so the live demo shows realistic, current delivery dates with a few tight orders, without breaking any key relation.

## Acceptance criteria

1. The plan horizon (`gold.config` `as_of_date` / `plan_start_at`) starts on 2026-10-02 06:00 America/Los_Angeles.
2. The schedule finish, original finish and SAP finish dates in silver are the source dates + 7 days, on all lines. Gold reads them unchanged.
3. raw and the source CSVs are not modified. Every shifted value equals the source value + 7 days.
4. No primary, business or foreign key changes. Reconciliation, the gold v4 checks and `--validate` pass with 0 FAIL.
5. History dates (`run_date`, `test_date`), audit timestamps and live ingest dates are not shifted. DQ-15 stays at 103 (source dates).
6. The change, its rationale and its effects are recorded in `observations.md` (R-DATE-SHIFT), `gold-data-model.md` §8, `WORKING-PLAN.md` §7 and `source-to-target-mapping.md`.
