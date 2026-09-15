# Prompts — using Cursor

Reusable prompts for working with Cursor on `GreenByte`.

## Index

| Folder / file | When to use |
|-------------------|---------------|
| `builders/universal-cursor-prompt-builder.md` | Execution guide for complete tasks in the current session. |
| `feature/prompt-story-intake.md` | **Entry** — Mode A new story; Mode B from study (`analysis/studies/`). |
| `feature/prompt-feature-lifecycle.md` | After intake: analysis → implement → validate → review → close **with gates**. |
| `feature/prompt-feature-analysis-package.md` | Story + analysis + manifest without implementing. |
| `feature/prompt-feature-implementation-package.md` | Implement + notes + checklist + manifest. |
| `feature/prompt-feature-validation-package.md` | Run checks and update test-checklist. |
| `feature/prompt-feature-review.md` | Review diff, risks, tests and documentation. |
| `feature/prompt-feature-close-package.md` | Close story, INDEX and doc/backlog sync. |
| `feature/prompt-bug-fix.md` | Reproduce, fix and validate a bug. |
| `feature/prompt-user-story.md` | Create or refine acceptance criteria. |
| `feature/prompt-test-checklist.md` | Create validation checklist. |
| `feature/prompt-feature-manifest-update.md` | Update feature status and next steps. |

## Scope rule

Before requesting implementation, define:

- Stack scope: `frontend`, `backend`, `infrastructure` or `full-stack`.
- Feature slug and Feature name.
- Concrete folders to review.
- Expected outcome: plan, diff, documentation, tests or review.

Avoid prompts that ask to analyze the entire repository unless the goal truly requires it.
