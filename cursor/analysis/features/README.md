# Feature Analysis

Create one folder per feature, bug or scoped work item.

## Naming

```text
features/<feature-slug>/
```

Optional area taxonomy (recommended for large projects):

```text
features/<area>/<feature-slug>/
```

Examples:

```text
features/customer-onboarding/
features/backend/auth-api-keys/
features/frontend/login-redirect/
features/bug-login-redirect/
```

Suggested areas: `backend`, `frontend`, `infrastructure`, `_core`, `product`, or a product domain slug.

With backlog (`--with-product-backlog`): use [`AREA-TAXONOMY.md`](../../company/future-work/AREA-TAXONOMY.md) and register the lifecycle in `future-work/<area>/STORY-LOG.md` via `new-feature.mjs`.

## Recommended files

- `feature-manifest.md`
- `user-story.md`
- `analysis.md`
- `implementation-notes.md`
- `test-checklist.md`

Use templates from `cursor/templates/` when creating these files.

Register closed features in [`INDEX.md`](INDEX.md).

## Lifecycle prompts

| Phase | Prompt |
| --- | --- |
| Intake (required for new stories) | `cursor/prompts/feature/prompt-story-intake.md` |
| Full lifecycle | `cursor/prompts/feature/prompt-feature-lifecycle.md` |
| Close | `cursor/prompts/feature/prompt-feature-close-package.md` |
