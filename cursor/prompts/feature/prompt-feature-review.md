# Prompt: revisión de feature (post-implementación)

**Goal:** Review the implementation as a careful peer: correctness, security, maintainability, and alignment with project rules and the stated story.

## Prompt to paste in Cursor

```text
@cursor/prompts/builders/universal-cursor-prompt-builder.md
@cursor/analysis/features/<feature-slug>/user-story.md
@cursor/analysis/shared/review-guidelines.md
@.cursor/rules/backend-serverless.mdc
@.cursor/rules/frontend-react.mdc
@.cursor/rules/infrastructure-terraform.mdc
@.cursor/rules/core-standards.mdc

Task type: feature review
Feature slug: <feature-slug>
Feature name: <feature-name>
PR / branch / archivos clave a revisar: <refs>

Please review against Feature name: <feature-name> and the acceptance criteria in user-story.md.

- Compare the diff against user-story.md and review-guidelines.md.
- Check adherence to the applicable `.cursor/rules/*.mdc` files.
- Call out: missing tests, missing or outdated API/business docs, logging/error handling, secret handling, and cross-stack impact.
- Suggest concrete follow-ups (file + change), prioritized; separate must-fix from nice-to-have.
- Lead with findings and classify severity: blocker | major | minor | suggestion.
```
