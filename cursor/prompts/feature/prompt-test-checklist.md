# Prompt: Test Checklist

Use this prompt to create or refine `test-checklist.md` after analysis or implementation.

```text
@cursor/templates/test-checklist-template.md
@cursor/analysis/features/<feature-slug>/user-story.md
@cursor/analysis/features/<feature-slug>/analysis.md
@cursor/analysis/features/<feature-slug>/implementation-notes.md
@.cursor/rules/backend-serverless.mdc
@.cursor/rules/frontend-react.mdc
@.cursor/rules/core-standards.mdc
@cursor/analysis/shared/review-guidelines.md

Task type: validation checklist
Feature slug: <feature-slug>
Feature name: <feature-name>
Stack scope: backend | frontend | infrastructure | full-stack
Output file: cursor/analysis/features/<feature-slug>/test-checklist.md

Create a concise checklist with:
- document title and `Name:` set to Feature name
- `Slug:` set to Feature slug
- happy paths
- validation and error scenarios
- auth/role scenarios
- backend contract checks
- frontend unit or E2E checks
- mock alignment checks
- API/business documentation checks when applicable
- regression risks
- blocked or not-run checks

Rules:
- Do not change code.
- Mark not executed, blocked and out-of-scope items explicitly.
- Prefer checks that a developer or QA can execute directly.
```
