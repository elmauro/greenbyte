# CLAUDE.md

Guidance for Claude Code in the GreenByte repo (HatchWorks AI Hackathon — AgTech Edition, with Syngenta, 28 Sep – 1 Oct 2026, demo day 2 Oct).

The canonical rules live in `.cursor/rules/*.mdc` (written for Cursor). This file summarizes them for Claude Code; when they disagree, the `.cursor/rules/` file wins — update both together.

## Project map

| Path | Purpose |
| --- | --- |
| `frontend/` | React 18 + Vite + Tailwind + MSW + Cypress (`/demo/plant`, `/demo/breeding`) |
| `backend/` | AWS Serverless (Node, ESM). `core-api` = BFF, `auth-api`, `layer-transversal`; `database/` for migrations/seeds |
| `infrastructure/` | Terraform capability folders (`web`, `cognito`, `postgresdb`, …) and `modules/` |
| `local-dev/` | Docker Compose PostgreSQL 16 (db `greenbyte`, user/pass `app`/`app`, port 5432) |
| `docs/` | Architecture, domain, runbook, security, cost; hackathon docs in `docs/hackathon/` |
| `cursor/` | AI working context: project contexts, playbook, prompts, templates, feature packages, backlog |
| `Hackathon 2026 - Use Cases/` | Official Syngenta source data (UC1 Pasco `.xlsx`, UC4 CSVs) — read-only inputs |

## Read before working

- Always: `project.config.json`, `cursor/context-map.md`.
- Hackathon scope and architecture: `docs/hackathon/syngenta-demo-architecture.md`, `docs/hackathon/uc1-mvp-scope.md` (UC1 is the selected use case).
- Product/scope decisions: `cursor/company/README.md`, `cursor/company/HACKATHON.md`.
- Before editing a stack, read its context: `cursor/projects/{frontend,backend,infrastructure}/project-context.md`. Cross-stack work: read every affected one.
- Full lifecycle: `cursor/docs/AI-Project-Playbook.md`.

Scope reads: one stack per task, read slices (one registry row, not the whole file), don't explore the whole repo. If scope is ambiguous, ask one clarifying question.

## Architecture (hackathon demo)

`React → core-api (BFF) → Data API + Agent API → PostgreSQL`

- Owners: UI + BFF — Mauricio · **Data API — Camilo** (ETL, schema, read-only query/tool endpoints, data quality) · Agent API — David.
- React calls **only** the BFF, never Data or Agent APIs directly. MSW handlers mirror BFF responses.
- Only the Data API reads the database. The Agent is grounded on Data API JSON and cites stable IDs (`PO Number`, `MATERIAL_GUID`, …).
- No live Syngenta systems: data comes from the repo extracts via ETL seeds into PostgreSQL. No writes back to SAP/ERP.
- Contract first: OpenAPI / JSON examples under `backend/docs/api/`.

## Lifecycle

intake → story → analysis → implement → validate → review → close.

- Work from a feature package: `cursor/analysis/features/<area>/<slug>/` (templates in `cursor/templates/`, scaffold with `node cursor/scripts/new-feature.mjs`).
- Run `node cursor/scripts/run-feature-gates.mjs` between phases; never skip a failed gate.
- On close: update the manifest, `cursor/analysis/features/INDEX.md`, the area `STORY-LOG.md`, and `cursor/company/future-work/STORY-REGISTRY.md`.
- Don't invent backlog IDs; promote `FW-*` items to an execution story before implementing.

## Standards

- Keep changes scoped; prefer existing patterns over new abstractions.
- Update docs, tests, mocks and config whenever behavior or contracts change.
- Keep `frontend/`, `backend/`, `infrastructure/`, `docs/`, `.cursor/`, `cursor/` separated.
- **All documentation and code comments in English** (respond to the user in their language).
- Never commit secrets, real `.env` files, `terraform.tfvars` or state. Use SSM / Secrets Manager; document new config in `.env.example` or Terraform variables.

### Backend
- Handlers stay small: validate → call service → consistent response (`layer-transversal/nodejs/common/serviceResponse.js`). Business logic lives in services/domain modules.
- Shared code goes in layers only if used by multiple APIs; deploy layers before APIs.
- Document public routes in OpenAPI. Check `backend/backend.config.json` for which APIs/layers exist.
- Standards: `backend/docs/development/LAMBDA-STANDARD.md`, `SERVERLESS-YML-STANDARD.md`.

### Frontend
- Routes in `src/routes/`, API calls in `src/services/` (no hardcoded URLs), shapes in `src/types/`, env via `VITE_*`.
- Keep MSW handlers and Cypress specs aligned with the BFF contract. Check `frontend/frontend.config.json` for enabled features.

### Infrastructure
- Run `terraform fmt` and `terraform validate` in each changed folder. Variables explicit per environment; tag resources with project and environment.

## Commands

```bash
cd frontend && npm install && npm run dev      # dev server
cd frontend && npm run build && npm run lint   # checks
cd frontend && npm run test:e2e                # Cypress
cd backend && npm install && npm test          # Jest
cd local-dev && docker compose up -d           # local PostgreSQL
```
