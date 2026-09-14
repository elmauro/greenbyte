# Review Guidelines — GreenByte

Use this file for human or AI-led reviews. Calibrate the depth: hotfixes can skip nice-to-haves, but full-stack features and contract changes need the full pass.

## Purpose

Use together with the rule packs:

- `@.cursor/rules/backend-serverless.mdc` when backend/API/Lambda/Serverless are in scope
- `@.cursor/rules/frontend-react.mdc` when UI/frontend are in scope
- `@.cursor/rules/infrastructure-terraform.mdc` when Terraform/AWS infra are in scope
- `@.cursor/rules/core-standards.mdc`
- `@cursor/projects/backend/project-context.md`
- `@cursor/projects/frontend/project-context.md`
- `@cursor/projects/infrastructure/project-context.md`

`.cursor/rules/*.mdc` contains mandatory stack conventions. This file contains review habits, scope checks and cross-cutting quality heuristics.

---

## Core Principles

- Prefer existing project patterns before adding helpers, abstractions, components, services or new folders.
- Stay within the user story, bug report or approved analysis. Do not mix unrelated refactors into feature work.
- Search for same-domain examples before implementing: nearby functions/services/docs on backend; nearby pages/components/services/tests on frontend.
- If one review finding applies to a pattern, scan the rest of the diff for the same issue.
- Intentional deviations from the story, analysis or existing pattern must be recorded in `implementation-notes.md`.
- Long-lived uncertainty belongs in `analysis.md`, `test-checklist.md` or `feature-manifest.md`, not only in chat.

---

## Correctness and Scope

- Implementation matches `user-story.md`, bug description or stated acceptance criteria.
- No extra endpoints, UI flows, roles, env vars or data changes unless explicitly requested.
- Edge cases are covered where relevant: null/empty values, missing headers, denied auth, stale tokens, idempotency, pagination, filters, empty result sets and duplicate submissions.
- Error paths return agreed shapes and status codes.
- Backend errors use typed errors and existing error-handling patterns.
- Frontend errors use existing status helpers and notification patterns.

---

## Backend Review

- API docs and runtime behavior match: path, method, headers, body, response shape, status codes and examples.
- Business rules docs are updated when validations, permissions or auth policy change.
- New or changed handlers follow handler → service → domain/DB or layer pattern; no business logic or manual response shaping in handlers.
- New functions include required Serverless wiring: authorizer/CORS where applicable, layers, config, package paths and deploy script entry.
- Shared logic belongs in the right place: existing API service, domain helper or Lambda layer. Avoid single-use pass-through wrappers.
- Config/secrets come from config/SSM/env patterns already used; no hardcoded account IDs, API keys, secrets or URLs.
- Logging is useful for CloudWatch and does not leak tokens, credentials or unnecessary PII.

---

## Frontend Review

- Routes, services and config follow existing project conventions; no hardcoded URLs or secrets in components/services.
- Services and types match backend API docs and real response shapes.
- Components reuse existing UI primitives and styling patterns; no new UI library, state library or styling system unless approved.
- Page/component state stays local unless an existing shared pattern applies.
- User-facing errors and success messages use existing helpers and notification patterns.
- Test selectors are present where unit or E2E tests need stable hooks.
- Mock handlers and E2E specs stay aligned with changed endpoints and UI flows.

---

## Infrastructure Review

- Terraform changes follow module/capability conventions and do not hardcode account-specific values.
- IAM permissions follow least privilege.
- Environment variables, secrets and outputs are documented when changed.
- Operational docs and runbooks are updated when deploy or rollback behavior changes.

---

## Full-Stack Contracts

- Backend contract changes are implemented before frontend integration assumptions are locked in.
- API docs, backend tests, frontend services/types, mocks and E2E scenarios agree on the same path, headers, body, status codes and response shape.
- Auth headers and role behavior are reviewed explicitly.
- If a contract is intentionally incompatible with older behavior, record the reason in `implementation-notes.md` and the test impact in `test-checklist.md`.

---

## Tests and Validation

- Changed backend logic has focused unit or integration coverage where the repo already tests similar behavior.
- UI changes have unit tests or E2E coverage when they affect critical flows, roles, forms, routing, errors or API integration.
- Default mock-based test expectations remain valid; real-backend validation is noted separately when used.
- `test-checklist.md` records what was run, what was not run, blocked checks and residual risks.
- Do not add tests that only assert implementation details while missing the user-visible behavior or API contract.

---

## Documentation and Artifacts

- Update only what the change invalidates: API docs, business rules, README, runbooks, alignment docs, `implementation-notes.md`, `test-checklist.md` or `feature-manifest.md`.
- Keep `cursor/` as the canonical place for AI context, prompts, templates and feature artifacts.
- If analysis discovers a broader issue that is out of scope, document it as a deferred item instead of silently expanding the implementation.

---

## Review Output Format

Lead with issues. For each finding include:

- severity: blocker | major | minor | suggestion
- issue: `<what is wrong>`
- evidence: `<file + symbol/function/component/doc>`
- violated rule/source: `<cursor rule, user story, API doc, business rule, or guideline>`
- recommended fix: `<minimal fix>`

If no blocker/major issues are found, say that clearly and list remaining test gaps or risks.

---

## Practical Use

During implementation:

```text
Follow:
@.cursor/rules/backend-serverless.mdc
@.cursor/rules/frontend-react.mdc
@.cursor/rules/infrastructure-terraform.mdc
@.cursor/rules/core-standards.mdc
@cursor/analysis/shared/review-guidelines.md
```

For assisted review:

```text
@cursor/analysis/shared/review-guidelines.md
@cursor/analysis/features/<feature-slug>/user-story.md
@cursor/analysis/features/<feature-slug>/implementation-notes.md

Review the implementation against the rule packs and these guidelines.
Lead with findings and cite files/symbols when possible.
```
