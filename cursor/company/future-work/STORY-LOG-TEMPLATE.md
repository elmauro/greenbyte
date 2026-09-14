# Story log — template (lifecycle diary per area)

Plantilla para el archivo **`STORY-LOG.md`** que vive en cada carpeta de área bajo `cursor/company/future-work/` (`backend/`, `frontend/`, `infrastructure/`, `product/`, `_core/`, o un área de dominio).

## Para qué sirve

Registrar, **por área**, cada story que se va a implementar (o ya se implementó) junto con su **bloque copy-paste** del orquestador [`prompt-feature-lifecycle.md`](../../prompts/feature/prompt-feature-lifecycle.md). Así vas directo a **una** story sin abrir el registry completo.

## Dónde vive

- Un `STORY-LOG.md` por área: `future-work/<área>/STORY-LOG.md`.
- El **backlog** (`FW-*`) sigue en el `README.md` del folder; el **detalle** de la story sigue en `cursor/analysis/features/<área>/<slug>/`.

`new-feature.mjs` crea el log si no existe y inserta la entrada (más reciente arriba).

## Relación con los otros archivos (no duplicar)

| Archivo | Rol | Granularidad |
| --- | --- | --- |
| `README.md` del folder | Backlog FW-* (gaps, prioridad, shipped) | Por área |
| [`STORY-REGISTRY.md`](STORY-REGISTRY.md) | Asignación maestra **ticket ↔ FW ↔ slug** | Global |
| **`STORY-LOG.md`** (este template) | **Bloques lifecycle + estado de ejecución** | Por área |
| `cursor/analysis/features/<área>/<slug>/` | Análisis, implementación, tests | Por story |
| [`ITEM-TEMPLATE.md`](ITEM-TEMPLATE.md) | Formato de un ítem FW | — |

**Regla:** el `STORY-LOG.md` **no** repite el backlog ni el análisis; es el diario de uso del lifecycle del folder.

## Estados sugeridos

`planned` (registrado, sin empezar) · `in-progress` · `review` · `shipped` · `deferred`.

---

## Formato de una entrada (copiar por cada story)

```markdown
### GREENBYTE-### — <Feature name>

- FW: `FW-GREENBYTE-<nnn>` · Slug: `<feature-slug>` · Stack: backend|frontend|infrastructure|full-stack
- Branch: `feature/GREENBYTE-###` · PR: `GREENBYTE-###: <Feature name>`
- Estado: planned | in-progress | review | shipped | deferred
- Package: `cursor/analysis/features/<área>/<slug>/` · Issue: #<n> (si existe)

​```text
@cursor/prompts/feature/prompt-feature-lifecycle.md

Feature slug: <feature-slug>
Feature name: <Feature name>
Ticket/story: GREENBYTE-###
Backlog ID: FW-GREENBYTE-<nnn>
Stack scope: backend
Start at: analysis
Run tests: no
Auto-close: yes
​```
```

> Para una story **nueva**, usa `Start at: analysis`. Para re-sincronizar o cerrar una ya hecha, `Start at: close`.

## Encabezado de cada `STORY-LOG.md`

```markdown
# Story log — <Area>

Registro de stories (uso de `prompt-feature-lifecycle.md`) para esta área.
Backlog FW-*: [`README.md`](README.md) · Maestro ticket↔FW: [`../STORY-REGISTRY.md`](../STORY-REGISTRY.md) · Plantilla: [`../STORY-LOG-TEMPLATE.md`](../STORY-LOG-TEMPLATE.md).

## Stories

<!-- newest first; new-feature.mjs inserts below this comment -->
```
