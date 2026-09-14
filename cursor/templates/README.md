# Templates

Plantillas para artefactos de trabajo de `cursor/`.

## Study artifacts

| Archivo | Uso |
| --- | --- |
| `analysis-study-template.md` | Estudio para **generar backlog** — tabla Candidate stories. Guardar en `cursor/analysis/studies/<study-slug>/study.md`. |

Ver [`analysis/studies/README.md`](../analysis/studies/README.md).

## Feature artifacts

| Archivo | Uso |
|---------|-----|
| `feature-manifest-template.md` | Estado, alcance, **Validation plan**, decisiones y próximos pasos. |
| `user-story-template.md` | Historia, alcance, flujo y criterios de aceptación. |
| `analysis-template.md` | Análisis de impacto, opciones, gaps, riesgos y recomendación (una story). |
| `analysis-study-template.md` | Estudio previo — genera backlog (tabla Candidate stories). |
| `implementation-notes-template.md` | Qué se implementó, decisiones, archivos afectados y sync de contratos/docs. |
| `test-checklist-template.md` | Validación manual/automática, smoke T2/T3, `Review: **pass**`. |
| `github.sync.json.example` | Plantilla de estado GitHub por feature (Capa C sync). |

Usa los prompts de `cursor/prompts/feature/` para generar o actualizar estos artefactos.

En cada artefacto: titulo y `Name:` = Feature name; `Slug:` = Feature slug.
