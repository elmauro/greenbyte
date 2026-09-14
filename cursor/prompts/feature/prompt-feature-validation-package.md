# Prompt: Feature Validation Package

Run focused validation after implementation and before formal review.

## Required inputs

- Feature slug: `<feature-slug>`
- Feature name: `<feature-name>`
- Area (optional): `<area>`
- Stack scope: `backend`, `frontend`, `infrastructure` or `full-stack`

Package path:

- `cursor/analysis/features/<feature-slug>/` or
- `cursor/analysis/features/<area>/<feature-slug>/`

## Prompt to paste in Cursor

```text
@cursor/prompts/builders/universal-cursor-prompt-builder.md
@cursor/analysis/features/<feature-slug>/test-checklist.md
@cursor/analysis/features/<feature-slug>/feature-manifest.md
@cursor/analysis/features/<feature-slug>/implementation-notes.md
@cursor/analysis/shared/review-guidelines.md

Task type: feature validation package
Feature slug: <feature-slug>
Feature name: <feature-name>
Stack scope: backend | frontend | infrastructure | full-stack

Naming rules:
- Update test-checklist.md with Feature name in title and Name field.

Please execute in order:

PHASE 1 — READ CHECKLIST
- Reconfirm acceptance criteria from user-story.md via test-checklist.md.
- List blocked or not-run items explicitly.

PHASE 2 — RUN FOCUSED CHECKS (by stack scope)
- Frontend: lint/build/test in frontend/ when present (npm run lint, build, test).
- Backend: tests in backend/ when present (npm test, integration if applicable).
- Infrastructure: terraform fmt/validate in infrastructure/ when applicable.
- Full-stack: at least one check per stack touched in implementation-notes.md.
- Then: node cursor/scripts/run-feature-gates.mjs --slug <feature-slug> --phase validation
  (runs Validation plan commands if Run tests: yes; otherwise files only).

PHASE 3 — UPDATE ARTIFACTS
- Mark results in test-checklist.md (passed / failed / blocked / not run).
- Update feature-manifest.md: Testing status, Validation plan, next step.
- If a check was not run, document why.

Constraints:
- Do not expand scope or implement new features.
- Do not mark Testing: done if there are failures without explanation or open blockers.
- Prefer checks the developer can reproduce.
```
