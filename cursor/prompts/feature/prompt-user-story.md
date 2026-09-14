# Prompt: User Story

Use this prompt to create or refine `user-story.md` for a feature.

```text
@cursor/templates/user-story-template.md
@cursor/projects/backend/project-context.md
@cursor/projects/frontend/project-context.md
@cursor/projects/infrastructure/project-context.md

Task type: user story
Feature slug: <feature-slug>
Feature name: <feature-name>
Stack scope: backend | frontend | infrastructure | full-stack
Output file: cursor/analysis/features/<feature-slug>/user-story.md

Please create or update the user story with:
- document title and `Name:` set to Feature name
- `Slug:` set to Feature slug
- user / role
- goal
- business value
- acceptance criteria
- non-goals
- assumptions
- impacted stacks
- open questions

Rules:
- Do not implement code.
- Do not replace Feature name with a slugified version.
- Keep acceptance criteria testable.
- Mark unknowns explicitly.
- Use domain language from `AgTech — intelligent agriculture and crop data` when applicable.
```
