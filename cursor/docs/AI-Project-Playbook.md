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

1. Identify the area ([`AREA-TAXONOMY.md`](../company/future-work/AREA-TAXONOMY.md) if present; otherwise stack scope).
2. Read only that area's base context first.
3. Add conditional context only if a file is touched or a decision changes.
4. If the story was ambiguous or consumed a lot of context, note 2–4 **Context trace** rows in `analysis.md` or `implementation-notes.md`.

| Area | Read first | Add only if applicable |
| --- | --- | --- |
| Backend | `cursor/projects/backend/project-context.md`, `.cursor/rules/backend-serverless.mdc`, affected `backend/` paths | infra project-context if deploy; `company/future-work/` if backlog |
| Frontend | `cursor/projects/frontend/project-context.md`, `.cursor/rules/frontend-react.mdc`, affected `frontend/` paths | backend docs if contract; MSW/Cypress if E2E |
| Infrastructure | `cursor/projects/infrastructure/project-context.md`, `.cursor/rules/infrastructure-terraform.mdc` | backend/frontend if outputs affect apps |
| Full-stack | Both project contexts + feature package | API docs + types/services on both sides |
| Product / backlog | [`cursor/company/README.md`](../company/README.md), [`future-work/`](../company/future-work/README.md), [`documentation-governance.md`](documentation-governance.md) | code only if the decision requires implementation |
| DX / AI workflow | This Playbook, touched templates/scripts | company/product docs only if scope changes |
| Studies | `cursor/analysis/studies/<slug>/study.md`, [`analysis-study-template.md`](../templates/analysis-study-template.md) | feature packages only for `implement` rows |

## Deterministic flow

```text
[optional BACKLOG] -> INTAKE -> STORY -> ANALYSIS -> IMPLEMENT -> VALIDATE -> REVIEW -> CLOSE
                                            └─ work on branch + PR ─┘
```

Only **`BACKLOG`** is optional. **Intake is required for every new story** — it creates the feature package and (when backlog exists) registry + STORY-LOG entry. Skip intake only when the feature package already exists (resume mid-pipeline), when a STORY-LOG row already exists (if backlog is enabled), or when you use the [bug path](#bug-path) instead.

**Story** acceptance criteria are drafted at intake and refined during analysis; use [`prompt-user-story.md`](../prompts/feature/prompt-user-story.md) to update them later.

| Phase | Purpose | Main output | Prompt / script |
| --- | --- | --- | --- |
| Intake | Register story (registry + STORY-LOG) and create package | folder + manifest | [`prompt-story-intake.md`](../prompts/feature/prompt-story-intake.md) · [`new-feature.mjs`](../scripts/README.md#new-feature-intake) |
| Story | Acceptance criteria | `user-story.md` | [`prompt-user-story.md`](../prompts/feature/prompt-user-story.md) |
| Analysis | Impact, contracts, risks | `analysis.md` | [`prompt-feature-analysis-package.md`](../prompts/feature/prompt-feature-analysis-package.md) |
| Implementation | Code + in-scope docs | code + `implementation-notes.md` | [`prompt-feature-implementation-package.md`](../prompts/feature/prompt-feature-implementation-package.md) |
| Validate | Run focused checks | updated `test-checklist.md` | [`prompt-feature-validation-package.md`](../prompts/feature/prompt-feature-validation-package.md) |
| Review | PR-style review | findings or `Review: **pass**` | [`prompt-feature-review.md`](../prompts/feature/prompt-feature-review.md) |
| Close | Close and sync docs/backlog | manifest done + `INDEX.md` + GitHub | [`prompt-feature-close-package.md`](../prompts/feature/prompt-feature-close-package.md) · [`story-close.mjs`](../scripts/README.md#story-close-helper) |

Mechanical gates: [`run-feature-gates.mjs`](../scripts/README.md) — `node cursor/scripts/run-feature-gates.mjs --slug <slug> --phase <phase>`. Test details: [`story-validation.md`](story-validation.md).
Index sync: [`sync-features-index.mjs`](../scripts/README.md#sync-features-index). Close helper: [`story-close.mjs`](../scripts/README.md#story-close-helper).

Feature package layout and artifact list: [`analysis/features/README.md`](../analysis/features/README.md).

## Quick start

Attach **only the prompt** for the phase. The prompt already references templates, rules and project context.

**Orchestrator (multiple phases in one session):** [`prompt-feature-lifecycle.md`](../prompts/feature/prompt-feature-lifecycle.md) — chains analysis → close with gates. Run **intake first** for new stories (no package yet). Inputs: `Start at`, `Run tests`, `Auto-close`.

**Slug vs name:** `Feature slug` defines the folder under the area: `cursor/analysis/features/<area>/<feature-slug>/`. `Feature name` is the readable title in headers and the `Name:` field in each artifact.

**Area:** for projects with backlog, use [`AREA-TAXONOMY.md`](../company/future-work/AREA-TAXONOMY.md). Without backlog, use `backend` / `frontend` / `infrastructure` / `_core`.

**Subagents (`.cursor/agents/`):** Specialized model pinning per lifecycle phase (`lifecycle-scribe` for intake/close bookkeeping, `backlog-analyst` for read-only scoping, `frontend-dev` and `backend-dev` for implementation). See [`.cursor/README.md`](../../.cursor/README.md).

### 0. Intake

**Required for new stories.** Entry point before analysis — registers the story, creates the feature package, and chains the lifecycle. Skip only if the feature package already exists (and STORY-LOG entry, when backlog is enabled).

**Full guide:** [`prompt-story-intake.md`](../prompts/feature/prompt-story-intake.md) (Mode A — new story; Mode B — from [`analysis/studies/`](../analysis/studies/README.md)).

```text
@cursor/prompts/feature/prompt-story-intake.md
Mode: A

<describe the feature in natural language>
```

Mechanical registration (if [`cursor/company/future-work/`](../company/future-work/README.md) exists):

```bash
node cursor/scripts/new-feature.mjs --name "<Feature name>" --area frontend
```

Script details: [`scripts/README.md`](../scripts/README.md#new-feature-intake). Prints the orchestrator copy-paste block and writes it to the area's `STORY-LOG.md`.

### Studies (optional — plan before stories)

Use a **study** when you need to **explore or compare** before committing to one story — e.g. gap analysis, “what should we build next?”, or splitting work into several stories. A study **does not implement code** and **does not replace** per-feature `analysis.md`.

| Situation | Start with |
| --- | --- |
| One clear feature (“add login redirect”) | Intake **Mode A** → feature analysis → implement |
| Unclear scope or **multiple** candidate stories | **Study** → Intake **Mode B** → one package per `Decision: implement` row |
| Story already registered | Skip study; use feature analysis or lifecycle |

**Why a study helps:** you capture findings once, rank gaps, and produce a **Candidate stories** table so intake registers the right number of execution stories (ticket + STORY-LOG) instead of jumping straight into a single package that may be too big or miss related work.

**Artifact:** `cursor/analysis/studies/<study-slug>/study.md` from [`analysis-study-template.md`](../templates/analysis-study-template.md). Full workflow: [`analysis/studies/README.md`](../analysis/studies/README.md).

**Example — evaluate landing gaps before stories:**

```text
@cursor/prompts/feature/prompt-story-intake.md
@cursor/templates/analysis-study-template.md

Mode: B
Analysis ref: create
Topic: Public landing — auth entry points, i18n, and SEO gaps vs hackathon MVP
```

The agent produces `cursor/analysis/studies/landing-gaps/study.md` with **FINDINGS** and **CANDIDATE STORIES** (each row: `Decision: implement | defer | confirm`). After you approve rows marked **implement**, intake Mode B registers stories (via `new-feature.mjs` when configured) — then each story gets its own feature package and **`analysis.md`** (not the study file).

**Do not** use `prompt-feature-analysis-package.md` as a substitute for a study when the goal is backlog generation; use the study template + intake Mode B.

### 1. Create analysis package

Assumes intake (step 0) already created the package, or you are resuming an existing story.

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

Mechanical close helper:

```bash
node cursor/scripts/story-close.mjs --slug <feature-slug> --dry-run
node cursor/scripts/story-close.mjs --slug <feature-slug> --apply
```

### Full lifecycle

Run **step 0 (Intake)** first for new stories, then use the orchestrator:

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

For small bugs (skips intake; use when fixing a known defect):

**Prompt:** [`prompt-bug-fix.md`](../prompts/feature/prompt-bug-fix.md)

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
- If backlog exists: [`STORY-REGISTRY.md`](../company/future-work/STORY-REGISTRY.md) + area `STORY-LOG.md` updated; GitHub sync if configured ([`github-projects-sync.md`](github-projects-sync.md)).

## Reference

| Topic | Document |
| --- | --- |
| Prompt index | [`cursor/prompts/README.md`](../prompts/README.md) |
| Feature packages | [`cursor/analysis/features/README.md`](../analysis/features/README.md) |
| Studies (intake Mode B) | [`cursor/analysis/studies/README.md`](../analysis/studies/README.md) |
| Study template | [`cursor/templates/analysis-study-template.md`](../templates/analysis-study-template.md) |
| Feature analysis template | [`cursor/templates/analysis-template.md`](../templates/analysis-template.md) |
| Artifact templates (index) | [`cursor/templates/`](../templates/) |
| Scripts (intake, gates, GitHub) | [`cursor/scripts/README.md`](../scripts/README.md) |
| Product backlog | [`cursor/company/future-work/README.md`](../company/future-work/README.md) |
| Doc governance | [`documentation-governance.md`](documentation-governance.md) |
| Validation / smoke | [`story-validation.md`](story-validation.md) |
| GitHub sync | [`github-projects-sync.md`](github-projects-sync.md) |
| Features index | [`cursor/analysis/features/INDEX.md`](../analysis/features/INDEX.md) |
| Context routing | [`context-scope-sessions.md`](context-scope-sessions.md) |
| Context trace (optional) | [`context-trace-matrix.md`](context-trace-matrix.md) |
