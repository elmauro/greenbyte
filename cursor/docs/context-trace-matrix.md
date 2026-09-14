# Feature Context Trace Matrix

Matrix to record which context was read, which context actually changed a decision, and how to turn that evidence into cheaper context routing rules.

## Purpose

- Reduce reads by habit during the feature lifecycle.
- Confirm each feature uses the right context for its folder and type.
- Detect documents that should stay, be summarized, split, or stop loading by default.
- Improve the process in `AI-Project-Playbook.md` with evidence from real features.

## When to use

Use this matrix when a feature:

- touches more than one folder or surface (`backend/`, `frontend/`, `infrastructure/`, `cursor/`, `docs/`, etc.);
- depends on documentation to decide scope or behavior;
- shows the agent read a lot of context before finding the source of truth;
- is part of a study or several related stories.

Do **not** use it for trivial single-file changes where required context is obvious.

## Evidence maturity

| Level | Minimum evidence | How to use |
| --- | --- | --- |
| Pilot | 3–5 stories of the same flow | Test format; propose scoped rules. Do not generalize repo-wide. |
| Area | Several stories in one area (`backend`, `frontend`, `docs`, etc.) | Can become area routing guide. |
| Global | Pattern repeated across areas | Promote to playbook, rule, or default context summary. |

Examples below marked **Draft** need pilot stories before treating as area rules.

## Main view: per feature

| Field | Purpose |
| --- | --- |
| Feature / ticket | Ticket id, slug, short name. |
| Feature type | e.g. API change, frontend UX, infra, docs, full-stack. |
| Folders touched | Folders modified or inspected for impact. |
| Files touched | Main files changed or used as source. |
| Context read | Docs/rules/prompts read during analysis. |
| Context used | Subset that changed a decision or validated scope. |
| Decision evidence | Concrete decision attributable to context used. |
| Flow stage | Intake, analysis, implementation, validation, review, close. |
| Token value | High / Medium / Low — decision value per tokens read. |
| Recommendation | Keep default, keep scoped, summarize, split, optional, remove. |

## Aggregated view: per document

Fill from several features to optimize the process.

| Context doc | Applies to | Decision value | Frequency | Default? | Recommendation |
| --- | --- | --- | --- | --- | --- |
| `cursor/docs/AI-Project-Playbook.md` | Lifecycle | High | High | Yes | Keep; use phase checklist. |
| `cursor/projects/backend/project-context.md` | `backend/**` | High | High for backend | Conditional | Read for backend; not for pure frontend. |
| `cursor/projects/frontend/project-context.md` | `frontend/**` | High | High for frontend | Conditional | Read for frontend; not for pure backend. |
| `cursor/docs/documentation-governance.md` | Scope / close | Medium/High | Medium | Conditional | Read when docs location is unclear. |
| `cursor/company/future-work/` | Backlog | Medium | Low | No | Read when promoting FW or closing backlog item. |
| Full `STORY-REGISTRY.md` | Registry | Low | Medium | No | Read one row; not entire file. |

Add project-specific rows as you run pilots.

## Draft routing rules (generic)

### Feature type: backend API

**Maturity: Draft**

Required:

- `cursor/projects/backend/project-context.md`
- `.cursor/rules/backend-serverless.mdc`
- affected handler/service paths under `backend/`
- API docs under `backend/docs/` or OpenAPI/Swagger if present

Conditional:

- `cursor/projects/infrastructure/project-context.md` when deploy/infra changes
- `cursor/company/future-work/` when backlog ID or scope unclear

Do not read by default:

- full frontend tree unless contract consumed by UI
- unrelated backend APIs/modules

### Feature type: frontend

**Maturity: Draft**

Required:

- `cursor/projects/frontend/project-context.md`
- `.cursor/rules/frontend-react.mdc`
- affected `frontend/src/` paths

Conditional:

- backend API docs when contract changes
- MSW/Cypress paths when behavior or E2E changes

### Feature type: full-stack contract change

**Maturity: Draft**

Required:

- backend + frontend project contexts
- feature package under `cursor/analysis/features/`
- both sides' contract docs (API + types/services)

### Feature type: infrastructure

**Maturity: Draft**

Required:

- `cursor/projects/infrastructure/project-context.md`
- `.cursor/rules/infrastructure-terraform.mdc`
- affected `infrastructure/` modules

## Record during lifecycle

Add a short section to `analysis.md` or `implementation-notes.md` when useful:

```markdown
## Context trace

| Context | Used for | Value | Action |
| --- | --- | --- | --- |
| `backend/docs/api/README.md` | Contract validation | High | Keep scoped |
| `docs/architecture.md` | Read but not used | Low | Do not load by default |
```

On review/close, update recommendations if evidence changed. Goal: capture docs that influenced a decision or consumed tokens without value — not audit every read.

## Review questions

- Which file was the source of truth for the final decision?
- Which context was read but not used?
- Could this feature type have started with a smaller context pack?
- Should any rule move from always-on to folder/type-scoped?
- Should any long document get a short routing summary?

## Related

- Session prompt blocks: [`context-scope-sessions.md`](context-scope-sessions.md)
- Playbook routing table: [`AI-Project-Playbook.md`](AI-Project-Playbook.md)
- Rule: `.cursor/rules/context-scope.mdc`
