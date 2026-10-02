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
| GREENBYTE-001 | n/a | `site-language-es-en` | Site language support (Spanish and English) | frontend | done |
| GREENBYTE-002 | n/a | `uc1-msw-bff-dev-modes` | UC1 frontend MSW and BFF connection modes | frontend | done |
| GREENBYTE-003 | n/a | `uc1-bff-demo-plant-dynamo-stub` | UC1 BFF demo plant Dynamo stub | backend | done |
| GREENBYTE-004 | n/a | `uc1-plant-ux-compare` | UC1 Plant UX compare page | frontend | done |
| GREENBYTE-005 | n/a | `uc1-data-model-medallion` | UC1 data model medallion (raw silver gold) | backend | done |
| GREENBYTE-006 | n/a | `uc1-manual-schedule-adjust` | UC1 manual schedule adjust | frontend | done |
| GREENBYTE-007 | n/a | `how-it-works-reference` | How it works reference | frontend | done |
| GREENBYTE-008 | n/a | `copilot-placeholder-order-fix` | Copilot placeholder order fix | frontend | done |
| GREENBYTE-009 | n/a | `uc1-scheduler-ux-test-cases` | UC1 scheduler UX test cases | frontend | done |
| GREENBYTE-010 | n/a | `pending-po-highlight` | Pending replan PO highlight (not running slot) | frontend | done |
| GREENBYTE-011 | n/a | `copilot-select-order-placeholder` | Copilot order select placeholder (not em dash) | frontend | done |
| GREENBYTE-012 | n/a | `remove-post-accept-queue-bell-notification` | Remove post-accept queue bell notification | frontend | done |
| GREENBYTE-013 | n/a | `nav-pasco-conditioning-label` | Nav label Pasco conditioning | frontend | done |
| GREENBYTE-014 | n/a | `show-demo-login-credentials-on-sign-in-hint` | Show demo login credentials on sign-in hint | frontend | done |
| GREENBYTE-015 | n/a | `plant-hub-horizontal-scheduler-ux` | Align Pasco hub with horizontal scheduler UX | frontend | done |

## How to update

1. When **creating** a package: add a row with the initial stage.
2. When **closing**: set stage `done` via `prompt-feature-close-package.md`.
3. Keep **Name** = Feature name; do not use slug as title in manifest.

Related: `cursor/docs/documentation-governance.md`, `cursor/company/future-work/STORY-REGISTRY.md` (if present).
