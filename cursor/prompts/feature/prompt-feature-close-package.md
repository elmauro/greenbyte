# Prompt: Feature Close Package

Close a feature when review passed and validation is documented.

## Required inputs

- Feature slug: `<feature-slug>`
- Feature name: `<feature-name>`
- Area (optional): `<area>`

## Prompt to paste in Cursor

```text
@cursor/prompts/builders/universal-cursor-prompt-builder.md
@cursor/docs/AI-Project-Playbook.md
@cursor/docs/documentation-governance.md
@cursor/analysis/features/<feature-slug>/feature-manifest.md
@cursor/analysis/features/<feature-slug>/user-story.md
@cursor/analysis/features/<feature-slug>/test-checklist.md
@cursor/analysis/features/<feature-slug>/implementation-notes.md
@cursor/analysis/features/INDEX.md

Task type: feature close package
Feature slug: <feature-slug>
Feature name: <feature-name>

Preconditions:
- Review: pass (no open blockers or majors) — `Review: **pass**` in test-checklist.md
- Testing: done or gaps documented in test-checklist.md
- Implementation aligned with user-story.md or deviations in implementation-notes.md
- Gate: node cursor/scripts/run-feature-gates.mjs --slug <feature-slug> --phase close-readiness

Please execute in order:

PHASE 1 — MANIFEST
- Set Current stage: done
- Set Review: done
- Confirm Name = Feature name, Slug = Feature slug

PHASE 2 — INDEX
- Add or update row in cursor/analysis/features/INDEX.md
  (Ticket, Slug, Name, Area, Stage)

PHASE 3 — BACKLOG SYNC (if applicable)
- If cursor/company/future-work/STORY-REGISTRY.md exists: mark story shipped
- If future-work/<area>/STORY-LOG.md exists: Status: shipped
- If Backlog ID (FW-*) exists: move item to Shipped in area README under future-work/
- Do not invent links or IDs

PHASE 4 — GITHUB SYNC (optional)
- If cursor/scripts/github-story.config.json exists:
  node cursor/scripts/run-feature-gates.mjs --slug <feature-slug> --phase sync
  (or node cursor/scripts/sync-github-feature.mjs --slug <feature-slug>)
- Ensures issue Done and github.sync.json updated

PHASE 5 — DOCUMENTATION SYNC
- Follow cursor/docs/documentation-governance.md
- Update docs/ or stack README only if the change invalidates them
- Cross-link from implementation-notes.md if contracts changed

PHASE 6 — HANDOFF
- Single next step in manifest (n/a or follow-up story reference)
- Summarize in chat: closed, docs touched, residual risks

Constraints:
- Do not change product code unless a doc fix requires it.
- Do not mark shipped without evidence in test-checklist.md.
```
