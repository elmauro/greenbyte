# Test Checklist — `<feature-name>`

> Use Feature name in the title. Use Feature slug only in the `Slug:` field and folder path.

## Feature

- Name: `<feature-name>`
- Slug: `<feature-slug>`
- Ticket/story:
- Tester:
- Date:
- Environment: local | dev | staging | prod-like

---

## SOURCE SCOPE

- Acceptance criteria to validate:
  - `<criterion>` — source: `<user-story>`
- Source behaviors excluded:
  - `<behavior>` — reason:

---

## TARGET SCOPE

- Backend areas to validate:
  - `<API/function/service/layer>` — evidence: `<implementation-notes / path>`
- Frontend areas to validate:
  - `<page/component/service/mock/test>` — evidence: `<implementation-notes / path>`
- Infrastructure areas to validate:
  - `<module/capability/env>` — evidence: `<implementation-notes / path>`
- Integration points:
  - API contract:
  - Auth / roles:
  - Data:
  - Mocks / E2E:

---

## FLOW

### Happy Path

- [ ] Scenario: `<scenario>`
  - Steps:
    1. `<step>`
    2. `<step>`
    3. `<step>`
  - Expected result: `<result>`
  - Evidence / mapping: `<path/symbol/doc>`

### Validations

- [ ] Scenario: `<validation>`
  - Steps:
    1. `<step>`
    2. `<step>`
  - Expected result: `<message/result/status code>`

### Auth / Roles

- [ ] Scenario: `<role or auth case>`
  - Expected result: `<allowed/blocked/error/redirect>`

### Edge Cases

- [ ] Scenario: `<edge case>`
  - Expected result: `<result>`

---

## Automated Checks

- Backend unit/service:
  - [ ] `<command or test file>` — result:
- Backend integration:
  - [ ] `<command or test file>` — result:
- Frontend unit:
  - [ ] `<command or test file>` — result:
- E2E:
  - [ ] `<command or spec>` — result:
- Lint/build:
  - [ ] `<command>` — result:

---

## Contract / Docs Checks

- [ ] API docs updated or confirmed n/a.
- [ ] Business rules updated or confirmed n/a.
- [ ] Frontend service/types aligned with backend contract.
- [ ] Mock handlers/data aligned with service paths and response shape.
- [ ] E2E scenarios aligned with API docs and UI flow.

---

## GAPS

- Not executed:
  - `<check>` — reason: not executed | blocked | out of scope
- Deferred:
  - `<gap>` — source: `<analysis/user-story>`
- Unknowns:
  - `<unknown>` — evidence checked:

---

## RISKS

- Regression checks:
  - [ ] `<existing flow>` — expected result: `<unchanged behavior>`
- Integration risks:
  - [ ] `<risk>` — validation: `<check>`
- Log/monitoring checks:
  - [ ] `<log/error area>` — expected result: `<no unexpected errors>`

---

## Smoke — feature (T2)

> Required when the Validation plan lists Extra commands. Omit if n/a. See [`story-validation.md`](../docs/story-validation.md).

- [ ] `<command>` — PASS `<date>` | n/a

---

## Manual (optional) (T3)

> End-to-end confidence when automated checks already cover the contract. Does not block close unless ship criteria say otherwise.

- [ ] `<step>` — PASS `<date>` | optional | blocked: `<reason>`

---

## Results

- Summary:
  - passed:
  - failed:
  - blocked:
- Notes:
  - `<note>`
- Sign-off: name / date

---

## Review / Close

- Review: **pending** | **pass** | **fail**
- Close blockers:
