# Features — Index

Indice de paquetes bajo `cursor/analysis/features/`. Actualizar al crear o cerrar una feature.

## Convenciones

| Campo | Uso |
| --- | --- |
| **Ticket** | ID ejecutable (JIRA, GitHub issue, `STORY-*`) — campo Ticket/story en manifest |
| **Backlog ID** | ID de backlog de producto (`FW-*`) — separado del ticket |
| **Slug** | Carpeta kebab-case |
| **Name** | Titulo legible (Feature name) |
| **Area** | Subcarpeta opcional: `backend`, `frontend`, `infrastructure`, `_core`, … |
| **Stage** | intake \| analysis \| implementation \| validation \| review \| done |

Ruta:

- Con area: `cursor/analysis/features/<area>/<slug>/`
- Sin area: `cursor/analysis/features/<slug>/`

## Index

| Ticket | Backlog ID | Slug | Name | Area | Stage |
| --- | --- | --- | --- | --- | --- |
| — | — | — | — | — | — |

## Como actualizar

1. Al **crear** paquete: anadir fila con stage inicial.
2. Al **cerrar**: stage `done` via `prompt-feature-close-package.md`.
3. Mantener **Name** = Feature name; no usar slug como titulo en manifest.

Relacionado: `cursor/docs/documentation-governance.md`, `cursor/company/future-work/STORY-REGISTRY.md` (si existe).
