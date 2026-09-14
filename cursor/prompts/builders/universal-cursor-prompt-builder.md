# Universal Cursor Execution Guide — GreenByte

## Purpose

- Ejecutar análisis, documentación, planificación, implementación, pruebas y revisión en esta sesión.
- No producir un prompt para pegar en otro lugar salvo que el usuario lo pida.
- Guardar artefactos largos bajo `cursor/analysis/features/<feature-slug>/` cuando la tarea crea estado duradero.

## Systems

- **Frontend:** `frontend/`
  - React, Vite, TypeScript y las features habilitadas por el preset (routes, services, tests, mocks, etc.).
  - Fuente de UI, rutas, servicios, tipos y pruebas de frontend.
- **Backend:** `backend/`
  - Node.js, Serverless Framework, AWS Lambda, API Gateway y las APIs/layers generadas por el preset.
  - Fuente de contratos, reglas de negocio, datos, auth e infraestructura de aplicación.
- **Infrastructure:** `infrastructure/`
  - Terraform y capabilities AWS cuando el preset lo incluye.
- **Cursor kit:** `cursor/`
  - Fuente de contexto IA, prompts, templates y artefactos de análisis.
- **Active rules:** `.cursor/rules/*.mdc`
  - Reglas breves y accionables que Cursor aplica automáticamente.

## Required Context

Backend work:

- `cursor/projects/backend/project-context.md`
- `.cursor/rules/backend-serverless.mdc`
- `.cursor/rules/core-standards.mdc`
- `cursor/analysis/shared/review-guidelines.md`

Frontend work:

- `cursor/projects/frontend/project-context.md`
- `.cursor/rules/frontend-react.mdc`
- `.cursor/rules/core-standards.mdc`
- `cursor/analysis/shared/review-guidelines.md`

Infrastructure work:

- `cursor/projects/infrastructure/project-context.md`
- `.cursor/rules/infrastructure-terraform.mdc`
- `.cursor/rules/core-standards.mdc`

Templates:

- `cursor/templates/feature-manifest-template.md`
- `cursor/templates/user-story-template.md`
- `cursor/templates/analysis-template.md`
- `cursor/templates/implementation-notes-template.md`
- `cursor/templates/test-checklist-template.md`

## Feature Naming

- **Feature slug:** kebab-case folder name under `cursor/analysis/features/<feature-slug>/`.
- **Feature name:** human-readable title for the feature.
- When the user provides both, use both. Do not ignore Feature name.
- In every saved artifact, set `Name:` to Feature name and `Slug:` to Feature slug.
- Use **Feature name** in document titles and headers.
- Use **Feature slug** only for folder paths and file locations.
- Do not infer Feature name from the slug unless the user did not provide one.

## Output Quality Rules

- Keep scope narrow.
- Prefer existing patterns before adding new abstractions.
- Cite evidence as `path` + symbol/handler/component/service when useful.
- Mark unknowns explicitly.
- Do not dump large code blocks in chat.
- Use templates for saved artifacts.
- Saved feature artifacts should use common sections when applicable: `SOURCE SCOPE`, `TARGET SCOPE`, `FLOW`, `GAPS`, `RISKS`.
- Keep `feature-manifest.md` updated when a task creates or changes durable feature state.
- Update contracts, tests and docs only when the change invalidates them.
- Do not repeat full artifacts in chat when they were saved to Markdown files.

## Repository Scanning Rules

- Do not scan the entire workspace in one pass.
- Start with likely folders, files, symbols, routes, endpoints, or feature names.
- Ignore generated/build folders:
  - `node_modules`
  - `dist`
  - `build`
  - `coverage`
  - `.serverless`
  - `.terraform`
  - `.git`
- Before creating code, search for same-domain examples:
  - frontend pages/components/services/types/mocks/tests
  - backend functions/services/layers/docs/tests

## Intake Workflow

Ask only what is missing. If the user supplied enough detail, execute.

1. Task type:
   - documentation
   - feature analysis
   - feature implementation
   - bug fix
   - refactor
   - tests
   - review
2. Stack scope:
   - backend
   - frontend
   - infrastructure
   - full-stack
3. Feature / issue:
   - feature slug
   - feature name
   - ticket
   - acceptance criteria
   - expected behavior
4. Source scope:
   - exact folders/files if known
5. Deliverable:
   - saved markdown artifact
   - implementation
   - tests
   - review findings
6. Feature artifact state:
   - create/update `feature-manifest.md` when the work spans more than one step or session
   - create/update `implementation-notes.md` and `test-checklist.md` after implementation

## Execution Workflow

### PHASE 0 — Load Context

- Read applicable project context and rule files.
- Read templates if saving artifacts.
- Read existing feature artifacts if they exist.

### PHASE 1 — Scope

- List exact folders in scope.
- State exclusions.
- State unknowns.

### PHASE 2 — Work

- For analysis: map flow, impacted modules, contracts, risks and suggested approach.
- For planning: list steps, dependencies, data/API/doc impacts and validation focus.
- For implementation: edit only scoped files, reuse patterns, update tests/docs as needed.
- For review: lead with findings, cite evidence, classify severity.

### Contract / Documentation Sync

When behavior or API contracts change, check:

- Backend: API docs, business rules, integration tests, Serverless/config/deploy docs when applicable.
- Frontend: services, types, mocks, E2E specs and alignment docs when applicable.
- Full-stack: headers, auth/roles, status codes, request/response shape and error behavior.

### PHASE 3 — Validate

- Run focused checks when practical.
- Read lints for edited files.
- If checks are not run, record why.

### PHASE 4 — Output

- Summarize changed files or findings.
- Include validation status.
- Include remaining gaps or risks.
- Do not repeat full artifacts in chat when saved to files.

### Review Output Format

For reviews, lead with issues. Each finding should include:

- severity: blocker | major | minor | suggestion
- issue
- evidence: `file + symbol/function/component/doc`
- violated rule/source: cursor rule, user story, API doc, business rule, or guideline
- recommended fix

If there are no blocker/major findings, say so and list any remaining test gaps or risks.
