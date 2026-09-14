# Analysis — `<feature-name>`

> **Purpose:** analysis of **one concrete story you will implement** (lifecycle; story already exists). To decide if *more* stories are needed (backlog generation), use [`analysis-study-template.md`](analysis-study-template.md) under `cursor/analysis/studies/`.
>
> Use Feature name in the title. Use Feature slug only in the `Slug:` field and folder path.

## Feature

- Name: `<feature-name>`
- Slug: `<feature-slug>`
- Ticket/story:
- Analysis date:
- Stack scope: backend | frontend | infrastructure | full-stack

---

## SOURCE SCOPE

- Problem / opportunity:
  - `<what needs to change and why>`
- Current behavior:
  - `<behavior>` — evidence: `<repo path + symbol/component/service/doc>`
- Source files or docs reviewed:
  - `<path>` — role: `<role>` — evidence: `<symbol / endpoint / component>`
- Out of scope:
  - `<item>` — reason: `<reason>`
- Unknowns:
  - `<unknown>` — evidence checked: `<paths/docs>`

---

## TARGET SCOPE

- Backend impact (`backend/`):
  - APIs / functions:
  - services / layers:
  - data / DynamoDB / PostgreSQL:
  - API docs / business rules:
  - tests:
- Frontend impact (`frontend/`):
  - pages / routes:
  - components:
  - services / types:
  - mocks / E2E / unit tests:
  - docs:
- Infrastructure / config impact:
  - `<env, Serverless, Terraform, deploy, CI/CD, none>`

---

## FLOW

| Step | Current / input | Target behavior | Change type | Evidence |
|------|-----------------|-----------------|-------------|----------|
| 1 | `<current state or trigger>` | `<target behavior>` | reuse \| extend \| new \| defer | `<path + symbol/doc>` |

---

## OPTIONS CONSIDERED

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| A | | | accept \| reject \| needs confirmation |
| B | | | accept \| reject \| needs confirmation |

---

## RECOMMENDATION

- Recommended approach:
  - `<short approach>`
- Implementation order:
  1. `<step>` — stack/layer: `<backend/frontend/infrastructure/docs>` — dependency: `<dependency>`
  2. `<step>` — stack/layer: `<backend/frontend/infrastructure/docs>` — dependency: `<dependency>`
- Reuse requirements:
  - `<existing pattern/service/component/helper>` — evidence: `<path + symbol>`

---

## GAPS

- Missing behavior:
  - `<gap>` — target: `<stack/module>` — decision: implement | defer | confirm
- Partial behavior:
  - `<behavior>` — delta: `<difference>` — decision: implement | defer | confirm
- Assumptions:
  - `<assumption>` — validation needed: `<how to confirm>`
- Deferred items:
  - `<item>` — reason: `<reason>`

---

## RISKS

- Risk register:
  - `<risk>` — impact: high | medium | low — mitigation: `<action>`
- Dependencies:
  - `<dependency>` — owner/status:
- Validation focus:
  - `<check>` — source: `<acceptance criteria / contract / risk>`

---

## OPEN QUESTIONS

- `<question>` — owner: `<person/team>` — needed before: analysis | implementation | release
