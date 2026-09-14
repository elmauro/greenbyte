# Prompt: Feature Implementation Package

Use this prompt when the story and analysis are ready and you want Cursor to implement the feature.

## Required inputs

- Feature slug: `<feature-slug>`
- Feature name: `<feature-name>`
- Stack scope: `backend`, `frontend`, `infrastructure` or `full-stack`

Expected inputs under `cursor/analysis/features/<feature-slug>/`:

- `user-story.md`
- `analysis.md` for complex work
- `feature-manifest.md` if the feature is tracked

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
@cursor/analysis/features/<feature-slug>/user-story.md
@cursor/analysis/features/<feature-slug>/analysis.md
@cursor/templates/implementation-notes-template.md
@cursor/templates/test-checklist-template.md
@cursor/templates/feature-manifest-template.md

Task type: feature implementation package
System: GreenByte continuous development
Feature slug: <feature-slug>
Feature name: <feature-name>
Stack scope: backend | frontend | infrastructure | full-stack

Naming rules:
- Use Feature slug only for folder paths: `cursor/analysis/features/<feature-slug>/`.
- Use Feature name in document titles and in every `Name:` field.
- Set `Slug:` to Feature slug and `Name:` to Feature name in all saved artifacts.

Please execute in order:

PHASE 1 — READINESS CHECK
- Reconfirm scope from user-story.md and analysis.md.
- List target files/folders.
- Do not expand scope.

PHASE 2 — IMPLEMENT
- Implement only required changes.
- Backend: follow handler-service-domain/layer patterns, API docs, business rules, config and tests rules.
- Frontend: follow route, service, type, UI, mock and E2E rules.
- Infrastructure: follow Terraform/module conventions and operational docs.
- For full-stack, align backend contract before frontend integration.

PHASE 3 — IMPLEMENTATION NOTES
- Save concise notes with summary, decisions, impacted files, docs/tests updated and risks:
  cursor/analysis/features/<feature-slug>/implementation-notes.md
- Use `implementation-notes-template.md` structure.
- Title with Feature name; set `Name:` and `Slug:` from the inputs.

PHASE 4 — TEST CHECKLIST
- Save validation checklist covering happy paths, errors, role/auth cases, API contracts, mocks, E2E and regressions:
  cursor/analysis/features/<feature-slug>/test-checklist.md
- Use `test-checklist-template.md` structure.
- Title with Feature name; set `Name:` and `Slug:` from the inputs.

PHASE 5 — FEATURE MANIFEST
- Update status, completed artifacts, validation status and next step:
  cursor/analysis/features/<feature-slug>/feature-manifest.md
- Use `feature-manifest-template.md` structure.
- Keep Feature name in headers and `Name:`; keep Feature slug in `Slug:`.

Constraints:
- Keep changes minimal and scoped.
- Avoid broad refactors.
- Do not hardcode secrets, URLs, roles or paths.
- Mark blocked validation explicitly.
- Run focused checks when practical.
```
