# Prompt: Feature Validation Package

Ejecutar validacion enfocada despues de implementacion y antes de review formal.

## Required inputs

- Feature slug: `<feature-slug>`
- Feature name: `<feature-name>`
- Area (opcional): `<area>`
- Stack scope: `backend`, `frontend`, `infrastructure` or `full-stack`

Ruta del paquete:

- `cursor/analysis/features/<feature-slug>/` o
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
- Actualizar test-checklist.md con Feature name en titulo y campo Name.

Please execute in order:

PHASE 1 — READ CHECKLIST
- Reconfirm acceptance criteria from user-story.md via test-checklist.md.
- List blocked or not-run items explicitly.

PHASE 2 — RUN FOCUSED CHECKS (por stack scope)
- Frontend: lint/build/test en frontend/ cuando exista (npm run lint, build, test).
- Backend: tests en backend/ cuando exista (npm test, integration si aplica).
- Infrastructure: terraform fmt/validate en infrastructure/ cuando aplique.
- Full-stack: al menos un check por stack tocado en implementation-notes.md.
- Luego: node cursor/scripts/run-feature-gates.mjs --slug <feature-slug> --phase validation
  (ejecuta comandos del Validation plan si Run tests: yes; si no, solo archivos).

PHASE 3 — UPDATE ARTIFACTS
- Marcar resultados en test-checklist.md (passed / failed / blocked / not run).
- Actualizar feature-manifest.md: Testing status, Validation plan, next step.
- Si un check no se ejecuto, documentar por que.

Constraints:
- No expandir scope ni implementar features nuevas.
- No marcar Testing: done si hay fallos sin explicacion o blockers abiertos.
- Preferir checks que el desarrollador pueda reproducir.
```
