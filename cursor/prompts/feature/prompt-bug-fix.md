# Prompt: Bug Fix

Use this prompt when fixing a defect in `frontend/`, `backend/`, `infrastructure/` or across stacks.

## Required inputs

- Issue / ticket: `<id-or-n/a>`
- Symptom: `<what the user sees / error / failing test>`
- Environment: `local | dev | staging | prod-like`
- Stack scope: `backend`, `frontend`, `infrastructure` or `full-stack`
- Feature slug: `<bug-... | existing-feature-slug | n/a>`
- Feature name: `<human-readable name | n/a>`

## Prompt to paste in Cursor

```text
@cursor/prompts/builders/universal-cursor-prompt-builder.md
@cursor/projects/backend/project-context.md
@cursor/projects/frontend/project-context.md
@cursor/projects/infrastructure/project-context.md
@.cursor/rules/backend-serverless.mdc
@.cursor/rules/frontend-react.mdc
@.cursor/rules/infrastructure-terraform.mdc
@.cursor/rules/core-standards.mdc
@cursor/analysis/shared/review-guidelines.md
@cursor/templates/implementation-notes-template.md
@cursor/templates/test-checklist-template.md

Task type: bug fix
System: GreenByte continuous development
Issue / ticket: <id-or-n/a>
Symptom: <what fails>
Expected behavior: <what should happen>
Environment: local | dev | staging | prod-like
Role / user type: <admin | customer | operator | n/a>
Stack scope: backend | frontend | infrastructure | full-stack
Feature slug: <bug-... | existing-feature-slug | n/a>
Feature name: <human-readable name | n/a>

Please execute in order:

PHASE 1 — REPRODUCE / CONFIRM
- Capture repro steps, failing path, logs, stack trace, failing test, or user-visible behavior.
- If the bug cannot be reproduced, state what was checked and what evidence is missing.

PHASE 2 — LOCATE ROOT CAUSE
- Identify the smallest relevant scope: handler/service/layer/API, page/component/service/type, mocks/tests, config or docs.
- Explain root cause in plain language.
- Search for same-domain examples before adding new logic.

PHASE 3 — FIX
- Implement the minimal fix only.
- Do not introduce unrelated refactors, new features, new architecture, or broad cleanup.
- Backend: preserve handler → service → domain/layer patterns and typed error handling.
- Frontend: preserve route, service, type, toast, mock and E2E patterns already used in the project.

PHASE 4 — CONTRACT / DOC SYNC
- If the bug exposes a contract mismatch, align API docs, frontend services/types, mocks and tests as applicable.
- If behavior intentionally changes, document the reason.

PHASE 5 — TEST / VALIDATE
- Add or adjust tests that would have caught the bug when reasonable.
- Run focused checks when practical.
- Mark not-run or blocked validation explicitly.

PHASE 6 — ARTIFACTS (if Feature slug is not n/a)
- Save concise implementation notes:
  cursor/analysis/features/<feature-slug>/implementation-notes.md
- Save or update validation checklist:
  cursor/analysis/features/<feature-slug>/test-checklist.md
- Use the templates attached above.
- Set `Name:` to Feature name when provided; otherwise derive a readable name from the bug context, not from the slug alone.
- Set `Slug:` to Feature slug.

Output:
- root cause
- files changed
- tests/docs updated
- validation run or not run
- remaining risks

Constraints:
- Keep scope narrow.
- Do not hardcode secrets, URLs, roles or paths.
- Do not change unrelated behavior.
- Do not repeat full saved artifacts in chat.
```
