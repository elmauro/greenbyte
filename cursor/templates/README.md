# Templates

Templates for `cursor/` working artifacts.

## Study artifacts

| File | Use |
| --- | --- |
| `analysis-study-template.md` | Study to **generate backlog** — Candidate stories table. Save in `cursor/analysis/studies/<study-slug>/study.md`. |

See [`analysis/studies/README.md`](../analysis/studies/README.md).

## Feature artifacts

| File | Use |
|---------|-----|
| `feature-manifest-template.md` | Status, scope, **Validation plan**, decisions and next steps. |
| `user-story-template.md` | Story, scope, flow and acceptance criteria. |
| `analysis-template.md` | Impact analysis, options, gaps, risks and recommendation (single story). |
| `analysis-study-template.md` | Prior study — generates backlog (Candidate stories table). |
| `implementation-notes-template.md` | What was implemented, decisions, affected files and contract/doc sync. |
| `test-checklist-template.md` | Manual/automated validation, smoke T2/T3, `Review: **pass**`. |
| `github.sync.json.example` | GitHub status template per feature (Layer C sync). |

Use prompts from `cursor/prompts/feature/` to generate or update these artifacts.

In each artifact: title and `Name:` = Feature name; `Slug:` = Feature slug.
