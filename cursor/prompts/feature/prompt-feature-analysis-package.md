# Prompt: Feature Analysis Package

Use this prompt when you want to analyze a feature and prepare the feature package **without implementing code yet**.

**Requires an existing package** from intake (Playbook step 0) or an explicit resume — do not use this as a substitute for intake on new stories.

## Required inputs

- Feature slug: `<feature-slug>` (kebab-case folder under `cursor/analysis/features/`)
- Feature name: `<feature-name>`
- Ticket/story: `<ticket-or-story-if-any>` or `n/a`
- Stack scope: `backend`, `frontend`, `infrastructure` or `full-stack`

## Prompt to paste in Cursor

```text
@cursor/prompts/builders/universal-cursor-prompt-builder.md
@cursor/docs/AI-Project-Playbook.md
@cursor/projects/backend/project-context.md
@cursor/projects/frontend/project-context.md
@cursor/projects/infrastructure/project-context.md
@.cursor/rules/backend-serverless.mdc
@.cursor/rules/frontend-react.mdc
@.cursor/rules/infrastructure-terraform.mdc
@.cursor/rules/core-standards.mdc
@cursor/analysis/shared/review-guidelines.md
@cursor/templates/user-story-template.md
@cursor/templates/analysis-template.md
@cursor/templates/feature-manifest-template.md

Task type: feature analysis package
System: GreenByte continuous development
Feature slug: <feature-slug>
Feature name: <feature-name>
Ticket/story: <ticket-or-story-if-any>
Stack scope: backend | frontend | infrastructure | full-stack
Output: markdown feature package

Naming rules:
- Use Feature slug only for folder paths: `cursor/analysis/features/<feature-slug>/`.
- Use Feature name in document titles and in every `Name:` field.
- Set `Slug:` to Feature slug and `Name:` to Feature name in all saved artifacts.

Please execute in order:

PHASE 1 — INTAKE AND SCOPE
- Clarify goal, users/roles, expected behavior, non-goals and acceptance criteria.
- Identify stacks affected: frontend, backend, infrastructure, or combinations.
- Use `user-story-template.md` structure.
- Title the document with Feature name, not the slug.
- Save or update:
  cursor/analysis/features/<feature-slug>/user-story.md

PHASE 2 — IMPACT ANALYSIS
- Identify likely modules, APIs, Lambdas, frontend pages/components/services/types, mocks/tests, data, infra and docs affected.
- For backend, check API docs, business rules, integration tests and deploy/config impact.
- For frontend, check routes, services, types, mocks, unit tests and E2E impact.
- For infrastructure, check Terraform modules, env vars, IAM and operational docs.
- Mark unknowns explicitly.
- Use `analysis-template.md` structure.
- Title the document with Feature name and fill `Name:` / `Slug:` from the inputs.
- Save:
  cursor/analysis/features/<feature-slug>/analysis.md

PHASE 3 — FEATURE MANIFEST
- Create or update status, owner, links, generated artifacts, current state and next recommended step.
- Use `feature-manifest-template.md` structure.
- Set `Goal` and headers using Feature name; keep Feature slug in `Slug:`.
- Save:
  cursor/analysis/features/<feature-slug>/feature-manifest.md

Constraints:
- Do not implement code yet.
- Keep scope narrow.
- Do not scan the entire workspace unless required.
- Prefer existing project patterns.
```
