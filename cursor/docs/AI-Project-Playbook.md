# AI Project Playbook

Guia practica para usar Cursor en features, bugs, mejoras, refactors y analisis de `GreenByte`.

## Objetivo

- Mantener un flujo repetible para `frontend/`, `backend/` e `infrastructure/` cuando aplique.
- Guardar estado duradero por feature en `cursor/analysis/features/<area>/<feature-slug>/`.
- Usar reglas por stack y plantillas compartidas para reducir contexto perdido entre sesiones.
- Evitar analisis de todo el repositorio cuando una tarea puede resolverse con alcance minimo.

## Regla central

- `backend/` define contratos, reglas de negocio, datos, APIs e infraestructura de aplicacion.
- `frontend/` define experiencia de usuario, rutas, servicios, tipos, mocks y pruebas de UI.
- `infrastructure/` define Terraform, capabilities AWS y despliegue cuando el preset lo incluye.
- `cursor/` define contexto, prompts, plantillas y artefactos de trabajo para Cursor.
- `cursor/company/` (opcional) define vision, backlog `FW-*` y registry de stories.
- Si un cambio toca contratos, alinea backend y frontend antes de cerrar.

## Layout esperado

```text
<project-root>/
├─ frontend/
├─ backend/
├─ infrastructure/     # cuando el preset lo incluye
├─ cursor/
│  ├─ company/         # opcional (--with-product-backlog)
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

## Contexto requerido

Los prompts de `cursor/prompts/feature/` ya cargan el contexto necesario: project context, reglas activas, review guidelines y templates. Esta seccion es solo referencia.

Para producto y alcance (si existe `cursor/company/`):

- `cursor/company/README.md`
- `.cursor/rules/company-product-context.mdc` (siempre activa)

Para backend:

- `cursor/projects/backend/project-context.md`
- `.cursor/rules/backend-serverless.mdc`

Para frontend:

- `cursor/projects/frontend/project-context.md`
- `.cursor/rules/frontend-react.mdc`

Para infraestructura:

- `cursor/projects/infrastructure/project-context.md`
- `.cursor/rules/infrastructure-terraform.mdc`

Para full-stack, usa los packs que apliquen.

Para features que leen mucho contexto o cruzan carpetas, registra evidencia opcional en [`context-trace-matrix.md`](context-trace-matrix.md).

## Context routing rapido

Antes de cargar documentos largos, elige el contexto minimo por area. Ver tambien `.cursor/rules/context-scope.mdc` y [`context-scope-sessions.md`](context-scope-sessions.md).

1. Identifica el area (`AREA-TAXONOMY.md` si existe; si no, stack scope).
2. Lee primero solo el contexto base de esa area.
3. Agrega contexto condicional solo si el archivo se toca o cambia una decision.
4. Si la story fue ambigua o consumio mucho contexto, anota 2-4 filas **Context trace** en `analysis.md` o `implementation-notes.md`.

| Area | Lee primero | Agrega solo si aplica |
| --- | --- | --- |
| Backend | `cursor/projects/backend/project-context.md`, `.cursor/rules/backend-serverless.mdc`, paths `backend/` afectados | infra project-context si deploy; `company/future-work/` si backlog |
| Frontend | `cursor/projects/frontend/project-context.md`, `.cursor/rules/frontend-react.mdc`, paths `frontend/` afectados | backend docs si contrato; MSW/Cypress si E2E |
| Infrastructure | `cursor/projects/infrastructure/project-context.md`, `.cursor/rules/infrastructure-terraform.mdc` | backend/frontend si outputs afectan apps |
| Full-stack | Ambos project contexts + feature package | API docs + types/services en ambos lados |
| Product / backlog | `cursor/company/README.md`, `future-work/`, `documentation-governance.md` | codigo solo si la decision requiere implementacion |
| DX / AI workflow | Este Playbook, templates/scripts tocados | company/product docs solo si cambia scope |
| Studies | `cursor/analysis/studies/<slug>/study.md`, study template | feature packages solo para filas `implement` |

## Flujo determinista

```text
[BACKLOG opcional] -> INTAKE -> STORY -> ANALYSIS -> IMPLEMENT -> VALIDATE -> REVIEW -> CLOSE
                                            └─ trabajo en branch + PR ─┘
```

| Fase | Proposito | Salida principal |
| --- | --- | --- |
| Intake | Registrar story (registry + STORY-LOG) y crear paquete | carpeta + manifest |
| Story | Criterios de aceptacion | `user-story.md` |
| Analysis | Impacto, contratos, riesgos | `analysis.md` |
| Implementation | Codigo + docs en alcance | codigo + `implementation-notes.md` |
| Validate | Ejecutar checks enfocados | `test-checklist.md` actualizado |
| Review | Revision tipo PR | findings o `Review: **pass**` |
| Close | Cerrar y sincronizar docs/backlog | manifest done + `INDEX.md` + GitHub |

Gates mecanicos: `node cursor/scripts/run-feature-gates.mjs --slug <slug> --phase <phase>`. Detalle de tests: [`story-validation.md`](story-validation.md).

## Quick start

Adjunta **solo el prompt** de la fase. El prompt ya referencia templates, reglas y contexto del proyecto.

**Orquestador (varias fases en una sesion):** [`prompt-feature-lifecycle.md`](../prompts/feature/prompt-feature-lifecycle.md) — encadena analysis → close con gates. Inputs: `Start at`, `Run tests`, `Auto-close`.

**Slug vs name:** `Feature slug` define la carpeta bajo el area: `cursor/analysis/features/<area>/<feature-slug>/`. `Feature name` es el titulo legible en encabezados y en el campo `Name:` de cada artefacto.

**Area:** para proyectos con backlog, usa [`AREA-TAXONOMY.md`](../company/future-work/AREA-TAXONOMY.md). Sin backlog, usa `backend` / `frontend` / `infrastructure` / `_core`.

### 0. Intake (opcional)

```text
@cursor/prompts/feature/prompt-story-intake.md
Mode: A

<describe the feature in natural language>
```

Registro mecanico (si existe `cursor/company/future-work/`):

```bash
node cursor/scripts/new-feature.mjs --name "<Feature name>" --area frontend
```

Imprime el bloque copy-paste del orquestador y lo deja en el `STORY-LOG.md` del area.

### 1. Crear paquete de analisis

```text
@cursor/prompts/feature/prompt-feature-analysis-package.md

Feature slug: <feature-slug>
Feature name: <feature-name>
Ticket/story: <ticket-or-story-if-any>
Stack scope: backend | frontend | infrastructure | full-stack
```

Archivos esperados:

- `feature-manifest.md` (incluye **Validation plan**)
- `user-story.md`
- `analysis.md`

Luego: `node cursor/scripts/run-feature-gates.mjs --slug <slug> --phase analysis`

### 2. Implementar

```text
@cursor/prompts/feature/prompt-feature-implementation-package.md

Feature slug: <feature-slug>
Feature name: <feature-name>
Stack scope: backend | frontend | infrastructure | full-stack
```

Salidas esperadas:

- cambios de codigo/documentacion
- `implementation-notes.md`
- `test-checklist.md`
- `feature-manifest.md` actualizado

Opcional: `node cursor/scripts/start-feature.mjs --slug <slug>`

### 3. Validar

```text
@cursor/prompts/feature/prompt-feature-validation-package.md

Feature slug: <feature-slug>
Feature name: <feature-name>
Stack scope: backend | frontend | infrastructure | full-stack
```

Ejecuta `run-feature-gates.mjs --phase validation`. Evidencia en `test-checklist.md`.

### 4. Revisar

```text
@cursor/prompts/feature/prompt-feature-review.md

Feature slug: <feature-slug>
Feature name: <feature-name>
```

La revision debe empezar por hallazgos y clasificar severidad. Cierre requiere `Review: **pass**` en el checklist.

### 5. Cerrar

```text
@cursor/prompts/feature/prompt-feature-close-package.md

Feature slug: <feature-slug>
Feature name: <feature-name>
```

### Lifecycle completo

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

## Ruta para bugs

Para bugs pequenos:

```text
@cursor/prompts/feature/prompt-bug-fix.md

Issue / ticket: <id>
Problem: <what fails>
Expected behavior: <what should happen>
Stack scope: backend | frontend | infrastructure | full-stack
Feature slug: <bug-... | n/a>
Feature name: <human-readable name | n/a>
```

Si el bug requiere seguimiento, crea `cursor/analysis/features/<area>/bug-<ticket>/`.

## Definicion de terminado

- El alcance implementado coincide con `user-story.md` o el bug report.
- API docs, reglas de negocio, tipos, servicios, mocks y pruebas E2E se actualizaron si el contrato cambio.
- Pruebas o validacion manual estan registradas en `test-checklist.md`.
- `implementation-notes.md` explica decisiones, archivos tocados y riesgos residuales.
- La revision no tiene blockers ni majors abiertos (`Review: **pass**`).
- `run-feature-gates.mjs --phase close-readiness` pasa.
- `cursor/analysis/features/INDEX.md` refleja stage `done` cuando la feature se cierra.
- Si hay backlog: `STORY-REGISTRY` + `STORY-LOG` del area actualizados; GitHub sync si esta configurado.

## Referencia

- Indice de prompts: `cursor/prompts/README.md`
- Plantillas de artefactos: `cursor/templates/`
- Gobernanza de docs: `cursor/docs/documentation-governance.md`
- Validacion / smoke: `cursor/docs/story-validation.md`
- GitHub sync: `cursor/docs/github-projects-sync.md`
- Indice de features: `cursor/analysis/features/INDEX.md`
- Context routing: `cursor/docs/context-scope-sessions.md`
- Context trace (optional): `cursor/docs/context-trace-matrix.md`
