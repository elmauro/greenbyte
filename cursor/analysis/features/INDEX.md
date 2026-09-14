# Features — Index

Index of packages under `cursor/analysis/features/`. Update when creating or closing a feature.

## Conventions

| Field | Use |
| --- | --- |
| **Ticket** | Executable ID (JIRA, GitHub issue, `STORY-*`) — Ticket/story field in manifest |
| **Backlog ID** | Product backlog ID (`FW-*`) — separate from ticket |
| **Slug** | kebab-case folder |
| **Name** | Readable title (Feature name) |
| **Area** | Optional subfolder: `backend`, `frontend`, `infrastructure`, `_core`, … |
| **Stage** | intake \| analysis \| implementation \| validation \| review \| done |

Path:

- With area: `cursor/analysis/features/<area>/<slug>/`
- Without area: `cursor/analysis/features/<slug>/`

## Index

| Ticket | Backlog ID | Slug | Name | Area | Stage |
| --- | --- | --- | --- | --- | --- |
| — | — | — | — | — | — |

## How to update

1. When **creating** a package: add a row with the initial stage.
2. When **closing**: set stage `done` via `prompt-feature-close-package.md`.
3. Keep **Name** = Feature name; do not use slug as title in manifest.

Related: `cursor/docs/documentation-governance.md`, `cursor/company/future-work/STORY-REGISTRY.md` (if present).
