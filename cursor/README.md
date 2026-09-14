# AI Workspace - GreenByte

Context, rules, prompts and working artifacts for Cursor.

## Structure

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

## Usage

- Use `.cursor/rules/*.mdc` for active rules Cursor should apply automatically.
- Use `context-map.md` as the quick project index.
- Use `docs/AI-Project-Playbook.md` as the base workflow.
- Use `prompts/README.md` to pick the right prompt per task.
- Update `projects/*/project-context.md` when the real architecture changes.
- Create per-feature artifacts in `analysis/features/<feature-slug>/`.
- Keep technical rules separate from business rules.

## Available prompts

| Prompt | Use |
| --- | --- |
| `prompts/builders/universal-cursor-prompt-builder.md` | Execution guide for complete tasks in a session. |
| `prompts/feature/prompt-story-intake.md` | Conversational intake + create package. |
| `prompts/feature/prompt-feature-lifecycle.md` | Full lifecycle analysis→close **with gates**. |
| `prompts/feature/prompt-feature-analysis-package.md` | Story + analysis + manifest without implementing. |
| `prompts/feature/prompt-feature-implementation-package.md` | Implementation + notes + checklist + manifest. |
| `prompts/feature/prompt-feature-validation-package.md` | Focused pre-review validation. |
| `prompts/feature/prompt-feature-close-package.md` | Close feature + INDEX + sync docs. |
| `prompts/feature/prompt-feature-review.md` | Post-implementation review. |
| `prompts/feature/prompt-bug-fix.md` | Reproduce, fix and validate a bug. |
| `prompts/feature/prompt-user-story.md` | Create or refine user story. |
| `prompts/feature/prompt-test-checklist.md` | Create validation checklist. |
| `prompts/feature/prompt-feature-manifest-update.md` | Update feature status. |

## Analysis artifacts

Use `analysis/features/<feature-slug>/` to keep durable context for each piece of work:

- `feature-manifest.md`
- `user-story.md`
- `analysis.md`
- `implementation-notes.md`
- `test-checklist.md`

Use templates from `cursor/templates/` when creating these files.

## `.cursor/` vs `cursor/`

- `.cursor/`: active configuration for Cursor.
- `cursor/`: documentation, prompts, context and working memory.
