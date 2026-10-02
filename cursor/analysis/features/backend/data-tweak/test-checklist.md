# Test Checklist — Data tweak (GREENBYTE-017)

## Automated Checks

| Check | Result |
| --- | --- |
| `build_model.py --dry-run` (files and step order) | [x] pass (2026-10-02, validation gate) |
| `cd backend && npm test` (Jest; unit fixtures do not read the database) | [x] pass (2026-10-02, validation gate) |
| `build_model.py` full build: reconciliation + gold v4 checks | [ ] pending (dev RDS, after sign-off) |
| `--validate` 0 FAIL | [ ] pending |
| `--scenario` passes | [ ] pending |

## Database checks after the build

- [ ] `SELECT gold.cfg('as_of_date'), gold.cfg('plan_start_at');` → `2026-10-02`, `2026-10-02 06:00:00 America/Los_Angeles`
- [ ] Every shifted row = raw + 7: `silver.line_schedule_item.scheduled_finish_date - silver.to_date(raw value) = 7` (and the same for `sap_finish_date`)
- [ ] DQ-15 count still 103 (reconciliation)
- [ ] `gold.queue_response('line-1')`: dates around demo day, at least one tight or at-risk order
- [ ] Row counts per table unchanged vs before the build

Review: pending
