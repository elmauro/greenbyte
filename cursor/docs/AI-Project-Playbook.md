# AI Project Playbook

Practical guide for using Cursor on features, bugs, improvements, refactors and analysis in `GreenByte`.

## Goal

- Keep a repeatable flow for `frontend/`, `backend/` and `infrastructure/` when applicable.
- Store durable state per feature in `cursor/analysis/features/<area>/<feature-slug>/`.
- Use stack rules and shared templates to reduce lost context between sessions.
- Avoid analyzing the entire repository when a task can be resolved with minimal scope.

## Core rule

- `backend/` defines contracts, business rules, data, APIs and application infrastructure.
- `frontend/` defines user experience, routes, services, types, mocks and UI tests.
- `infrastructure/` defines Terraform, AWS capabilities and deployment when the preset includes it.
- `cursor/` defines context, prompts, templates and working artifacts for Cursor.
- `cursor/company/` (optional) defines vision, `FW-*` backlog and story registry.
- If a change touches contracts, align backend and frontend before closing.

## Expected layout

```text
<project-root>/
├─ frontend/
├─ backend/
├─ infrastructure/     # when the preset includes it
├─ cursor/
│  ├─ company/         # optional (--with-product-backlog)
│  ├─ docs/
│  ├─ projects/
│  ├─ prompts/
│  ├─ scripts/
│  ├─ analysis/features/<area>/<feature-slug>/
│  ├─ templates/
│  └─ README.md
└─ .cursor/
   ├─ rules/
   └─ hooks.json       # GitHub sync after edits (off until hookEnabled)
```

## Required context

Prompts in `cursor/prompts/feature/` already load the necessary context: project context, active rules, review guidelines and templates. This section is reference only.

For product and scope (if `cursor/company/` exists):

- `cursor/company/README.md`
- `.cursor/rules/company-product-context.mdc` (always active)

For backend:

- `cursor/projects/backend/project-context.md`
- `.cursor/rules/backend-serverless.mdc`

For frontend:

- `cursor/projects/frontend/project-context.md`
- `.cursor/rules/frontend-react.mdc`

For infrastructure:

- `cursor/projects/infrastructure/project-context.md`
- `.cursor/rules/infrastructure-terraform.mdc`

For full-stack, use the packs that apply.

For features that read a lot of context or cross folders, optionally record evidence in [`context-trace-matrix.md`](context-trace-matrix.md).

## Quick context routing

Before loading long documents, choose minimal context by area. See also `.cursor/rules/context-scope.mdc` and [`context-scope-sessions.md`](context-scope-sessions.md).

1. Identify the area (`AREA-TAXONOMY.md` if present; otherwise stack scope).
2. Read only that area's base context first.
3. Add conditional context only if a file is touched or a decision changes.
4. If the story was ambiguous or consumed a lot of context, note 2–4 **Context trace** rows in `analysis.md` or `implementation-notes.md`.

| Area | Read first | Add only if applicable |
| --- | --- | --- |
| Backend | `cursor/projects/backend/project-context.md`, `.cursor/rules/backend-serverless.mdc`, affected `backend/` paths | infra project-context if deploy; `company/future-work/` if backlog |
| Frontend | `cursor/projects/frontend/project-context.md`, `.cursor/rules/frontend-react.mdc`, affected `frontend/` paths | backend docs if contract; MSW/Cypress if E2E |
| Infrastructure | `cursor/projects/infrastructure/project-context.md`, `.cursor/rules/infrastructure-terraform.mdc` | backend/frontend if outputs affect apps |
| Full-stack | Both project contexts + feature package | API docs + types/services on both sides |
| Product / backlog | `cursor/company/README.md`, `future-work/`, `documentation-governance.md` | code only if the decision requires implementation |
| DX / AI workflow | This Playbook, touched templates/scripts | company/product docs only if scope changes |
| Studies | `cursor/analysis/studies/<slug>/study.md`, study template | feature packages only for `implement` rows |

## Deterministic flow

```text
[optional BACKLOG] -> INTAKE -> STORY -> ANALYSIS -> IMPLEMENT -> VALIDATE -> REVIEW -> CLOSE
                                            └─ work on branch + PR ─┘
```

| Phase | Purpose | Main output |
| --- | --- | --- |
| Intake | Register story (registry + STORY-LOG) and create package | folder + manifest |
| Story | Acceptance criteria | `user-story.md` |
| Analysis | Impact, contracts, risks | `analysis.md` |
| Implementation | Code + in-scope docs | code + `implementation-notes.md` |
| Validate | Run focused checks | updated `test-checklist.md` |
| Review | PR-style review | findings or `Review: **pass**` |
| Close | Close and sync docs/backlog | manifest done + `INDEX.md` + GitHub |

Mechanical gates: `node cursor/scripts/run-feature-gates.mjs --slug <slug> --phase <phase>`. Test details: [`story-validation.md`](story-validation.md).

## Quick start

Attach **only the prompt** for the phase. The prompt already references templates, rules and project context.

**Orchestrator (multiple phases in one session):** [`prompt-feature-lifecycle.md`](../prompts/feature/prompt-feature-lifecycle.md) — chains analysis → close with gates. Inputs: `Start at`, `Run tests`, `Auto-close`.

**Slug vs name:** `Feature slug` defines the folder under the area: `cursor/analysis/features/<area>/<feature-slug>/`. `Feature name` is the readable title in headers and the `Name:` field in each artifact.

**Area:** for projects with backlog, use [`AREA-TAXONOMY.md`](../company/future-work/AREA-TAXONOMY.md). Without backlog, use `backend` / `frontend` / `infrastructure` / `_core`.

### 0. Intake (optional)

```text
@cursor/prompts/feature/prompt-story-intake.md
Mode: A

<describe the feature in natural language>
```

Mechanical registration (if `cursor/company/future-work/` exists):

```bash
node cursor/scripts/new-feature.mjs --name "<Feature name>" --area frontend
```

Prints the orchestrator copy-paste block and writes it to the area's `STORY-LOG.md`.

### 1. Create analysis package

```text
@cursor/prompts/feature/prompt-feature-analysis-package.md

Feature slug: <feature-slug>
Feature name: <feature-name>
Ticket/story: <ticket-or-story-if-any>
Stack scope: backend | frontend | infrastructure | full-stack
```

Expected files:

- `feature-manifest.md` (includes **Validation plan**)
- `user-story.md`
- `analysis.md`

Then: `node cursor/scripts/run-feature-gates.mjs --slug <slug> --phase analysis`

### 2. Implement

```text
@cursor/prompts/feature/prompt-feature-implementation-package.md

Feature slug: <feature-slug>
Feature name: <feature-name>
Stack scope: backend | frontend | infrastructure | full-stack
```

Expected outputs:

- code/documentation changes
- `implementation-notes.md`
- `test-checklist.md`
- updated `feature-manifest.md`

Optional: `node cursor/scripts/start-feature.mjs --slug <slug>`

### 3. Validate

```text
@cursor/prompts/feature/prompt-feature-validation-package.md

Feature slug: <feature-slug>
Feature name: <feature-name>
Stack scope: backend | frontend | infrastructure | full-stack
```

Run `run-feature-gates.mjs --phase validation`. Evidence in `test-checklist.md`.

### 4. Review

```text
@cursor/prompts/feature/prompt-feature-review.md

Feature slug: <feature-slug>
Feature name: <feature-name>
```

Review must lead with findings and classify severity. Closing requires `Review: **pass**` in the checklist.

### 5. Close

```text
@cursor/prompts/feature/prompt-feature-close-package.md

Feature slug: <feature-slug>
Feature name: <feature-name>
```

### Full lifecycle

```text
@cursor/prompts/feature/prompt-feature-lifecycle.md

Feature slug: <feature-slug>
Feature name: <feature-name>
Ticket/story: <ticket>
Stack scope: backend | frontend | infrastructure | full-stack
Start at: analysis
Run tests: no
Auto-close: yes
```

## Bug path

For small bugs:

```text
@cursor/prompts/feature/prompt-bug-fix.md

Issue / ticket: <id>
Problem: <what fails>
Expected behavior: <what should happen>
Stack scope: backend | frontend | infrastructure | full-stack
Feature slug: <bug-... | n/a>
Feature name: <human-readable name | n/a>
```

If the bug needs follow-up, create `cursor/analysis/features/<area>/bug-<ticket>/`.

## Definition of done

- Implemented scope matches `user-story.md` or the bug report.
- API docs, business rules, types, services, mocks and E2E tests updated if the contract changed.
- Tests or manual validation recorded in `test-checklist.md`.
- `implementation-notes.md` explains decisions, touched files and residual risks.
- Review has no open blockers or majors (`Review: **pass**`).
- `run-feature-gates.mjs --phase close-readiness` passes.
- `cursor/analysis/features/INDEX.md` reflects stage `done` when the feature closes.
- If backlog exists: area `STORY-REGISTRY` + `STORY-LOG` updated; GitHub sync if configured.

## Reference

- Prompt index: `cursor/prompts/README.md`
- Artifact templates: `cursor/templates/`
- Doc governance: `cursor/docs/documentation-governance.md`
- Validation / smoke: `cursor/docs/story-validation.md`
- GitHub sync: `cursor/docs/github-projects-sync.md`
- Features index: `cursor/analysis/features/INDEX.md`
- Context routing: `cursor/docs/context-scope-sessions.md`
- Context trace (optional): `cursor/docs/context-trace-matrix.md`
