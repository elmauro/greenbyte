# AI Workspace - GreenByte

Contexto, reglas, prompts y artefactos de trabajo para Cursor.

## Estructura

```text
cursor/
├─ context-map.md
├─ docs/
│  ├─ AI-Project-Playbook.md
│  ├─ documentation-governance.md
│  ├─ github-projects-sync.md
│  ├─ story-validation.md
│  ├─ context-scope-sessions.md
│  └─ context-trace-matrix.md
├─ scripts/
│  ├─ new-feature.mjs
│  ├─ run-feature-gates.mjs
│  ├─ start-feature.mjs
│  └─ sync-github-feature.mjs
├─ projects/
│  ├─ backend/
│  ├─ frontend/
│  └─ infrastructure/
├─ prompts/
│  ├─ builders/
│  └─ feature/
├─ templates/
└─ analysis/
   ├─ shared/
   ├─ studies/              ← optional; study.md before stories
   └─ features/
```

Optional (generate with `--with-product-backlog`):

```text
cursor/company/
├─ DOCUMENTATION-GOVERNANCE.md
└─ future-work/
   ├─ ITEM-TEMPLATE.md
   ├─ STORY-REGISTRY.md
   ├─ STORY-LOG-TEMPLATE.md
   ├─ AREA-TAXONOMY.md
   └─ README.md
```

## Uso

- Usa `.cursor/rules/*.mdc` para reglas activas que Cursor debe aplicar automaticamente.
- Usa `context-map.md` como indice rapido del proyecto.
- Usa `docs/AI-Project-Playbook.md` como flujo base.
- Usa `prompts/README.md` para elegir el prompt correcto por tarea.
- Actualiza `projects/*/project-context.md` cuando cambie la arquitectura real.
- Crea artefactos por feature en `analysis/features/<feature-slug>/`.
- Mantiene las reglas tecnicas separadas de las reglas de negocio.

## Prompts disponibles

| Prompt | Uso |
| --- | --- |
| `prompts/builders/universal-cursor-prompt-builder.md` | Guia de ejecucion para tareas completas en sesion. |
| `prompts/feature/prompt-story-intake.md` | Intake conversacional + crear paquete. |
| `prompts/feature/prompt-feature-lifecycle.md` | Lifecycle completo analysis→close **con gates**. |
| `prompts/feature/prompt-feature-analysis-package.md` | Story + analysis + manifest sin implementar. |
| `prompts/feature/prompt-feature-implementation-package.md` | Implementacion + notes + checklist + manifest. |
| `prompts/feature/prompt-feature-validation-package.md` | Validacion enfocada pre-review. |
| `prompts/feature/prompt-feature-close-package.md` | Cerrar feature + INDEX + sync docs. |
| `prompts/feature/prompt-feature-review.md` | Revision post-implementacion. |
| `prompts/feature/prompt-bug-fix.md` | Reproducir, corregir y validar un bug. |
| `prompts/feature/prompt-user-story.md` | Crear o refinar user story. |
| `prompts/feature/prompt-test-checklist.md` | Crear checklist de validacion. |
| `prompts/feature/prompt-feature-manifest-update.md` | Actualizar estado de una feature. |

## Analysis artifacts

Usa `analysis/features/<feature-slug>/` para mantener contexto durable de cada trabajo:

- `feature-manifest.md`
- `user-story.md`
- `analysis.md`
- `implementation-notes.md`
- `test-checklist.md`

Usa templates de `cursor/templates/` al crear estos archivos.

## `.cursor/` vs `cursor/`

- `.cursor/`: configuracion activa para Cursor.
- `cursor/`: documentacion, prompts, contexto y memoria de trabajo.
