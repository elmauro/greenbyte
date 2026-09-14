# Prompts — uso en Cursor

Prompts reutilizables para trabajar con Cursor sobre `GreenByte`.

## Índice

| Carpeta / archivo | Cuándo usarlo |
|-------------------|---------------|
| `builders/universal-cursor-prompt-builder.md` | Guía de ejecución para tareas completas en la sesión actual. |
| `feature/prompt-story-intake.md` | **Entrada** — Modo A story nueva; Modo B desde estudio (`analysis/studies/`). |
| `feature/prompt-feature-lifecycle.md` | Orquestador analysis → implement → validate → review → close **con gates**. |
| `feature/prompt-feature-analysis-package.md` | Story + analysis + manifest sin implementar. |
| `feature/prompt-feature-implementation-package.md` | Implementar + notes + checklist + manifest. |
| `feature/prompt-feature-validation-package.md` | Ejecutar checks y actualizar test-checklist. |
| `feature/prompt-feature-review.md` | Revisar diff, riesgos, pruebas y documentación. |
| `feature/prompt-feature-close-package.md` | Cerrar story, INDEX y sync de docs/backlog. |
| `feature/prompt-bug-fix.md` | Reproducir, corregir y validar un bug. |
| `feature/prompt-user-story.md` | Crear o refinar criterios de aceptación. |
| `feature/prompt-test-checklist.md` | Crear checklist de validación. |
| `feature/prompt-feature-manifest-update.md` | Actualizar estado y próximos pasos de una feature. |

## Regla de alcance

Antes de pedir implementación, define:

- Stack scope: `frontend`, `backend`, `infrastructure` o `full-stack`.
- Feature slug y Feature name.
- Carpetas concretas a revisar.
- Resultado esperado: plan, diff, documentación, pruebas o revisión.

Evita prompts que pidan analizar todo el repositorio salvo que el objetivo realmente lo requiera.
