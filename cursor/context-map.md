# Context Map - GreenByte

Quick map for humans and AI agents working in this project.

## Project

- Name: `GreenByte`
- Slug: `greenbyte`
- Domain: `AgTech — intelligent agriculture and crop data`
- Preset: `fullstack-aws-enterprise`
- AWS region: `us-east-1`
- Owner team: `greenbyte-hackathon`

## Generated Structure

```text
greenbyte/
├─ .cursor/          # Active Cursor rules + optional GitHub sync hook
├─ .github/          # CI/CD workflows
├─ frontend/         # Web app when enabled by the preset
├─ backend/          # APIs and services when enabled by the preset
├─ infrastructure/   # AWS/Terraform when enabled by the preset
├─ cursor/           # Context, prompts, templates and analysis
├─ docs/             # Product, architecture and operations docs
├─ local-dev/        # Optional local services
├─ project.config.json
└─ README.md
```

## Context Files

| Area | Read first |
| --- | --- |
| Project metadata | `project.config.json` |
| Company & product (if present) | `cursor/company/README.md` |
| AI workflow | `cursor/docs/AI-Project-Playbook.md` |
| Story validation | `cursor/docs/story-validation.md` |
| Frontend | `cursor/projects/frontend/project-context.md` |
| Backend | `cursor/projects/backend/project-context.md` |
| Infrastructure | `cursor/projects/infrastructure/project-context.md` |
| Architecture | `docs/architecture.md` |
| Domain | `docs/domain.md` |
| Security | `docs/security-baseline.md` |
| Cost | `docs/cost-baseline.md` |
| Operations | `docs/runbook.md` |
| Web deployment | `docs/infrastructure/web-deployment.md` |
| Context optimization | `cursor/docs/context-trace-matrix.md` |

## Scope Guide

- Frontend changes usually touch `frontend/src/`, `frontend/docs/`, Cypress specs and MSW mocks.
- Backend changes usually touch one API folder, shared layers, `backend/docs/` and tests.
- Infrastructure changes usually touch one capability folder or Terraform module plus operational docs.
- Cross-stack changes should align backend contracts, frontend services/types, mocks and tests before closing.

## Prompts and Templates

| Area | Read first |
| --- | --- |
| Prompt index | `cursor/prompts/README.md` |
| Execution guide | `cursor/prompts/builders/universal-cursor-prompt-builder.md` |
| Story entry (required) | `cursor/prompts/feature/prompt-story-intake.md` |
| Feature workflow | `cursor/prompts/feature/prompt-feature-lifecycle.md` |
| Artifact templates | `cursor/templates/README.md` |
| Review guidelines | `cursor/analysis/shared/review-guidelines.md` |

## Cursor Rules

Active rules live under `.cursor/rules/`. Keep them short and actionable. Longer explanations, prompts and feature artifacts belong under `cursor/`.

- `company-product-context.mdc` — product/backlog docs when `cursor/company/` exists (always applied).
- `context-scope.mdc` — token-aware reads without skipping lifecycle gates.
- `core-standards.mdc` — scoped changes, no secrets, update docs/tests with contracts.
- `documentation-english.mdc` — project documentation is English-only.

