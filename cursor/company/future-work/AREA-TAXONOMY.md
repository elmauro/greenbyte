# Area taxonomy — GreenByte

Use **one area per story** when the project grows. Folder names match `cursor/analysis/features/<area>/` and optional `cursor/company/future-work/<area>/`.

See also [`STORY-LOG-TEMPLATE.md`](STORY-LOG-TEMPLATE.md).

## Starter areas

| Area | Use for | Default stack |
| --- | --- | --- |
| `backend` | APIs, services, data, layers | `backend` |
| `frontend` | UI, routes, mocks, E2E | `frontend` |
| `infrastructure` | Terraform, AWS capabilities, deploy | `infrastructure` |
| `product` | Strategy, scope, messaging | n/a (docs) |
| `_core` | Cross-cutting DX, docs, Cursor kit | n/a |

Add product-specific areas when a domain folder is more useful than a stack folder (for example `auth`, `billing`). Keep `product` for strategy — not for every feature.

## Rules

- Prefer **one area per task**. Cross-stack stories pick a **primary** area and list other stacks in the feature manifest.
- New stories that are not stack-shaped still get an area before creating `analysis/features/<area>/<slug>/`.
- Do not load unrelated area folders to save tokens — see `.cursor/rules/context-scope.mdc`.
