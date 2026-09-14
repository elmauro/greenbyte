# Studies — analysis before stories

Use **studies** when you need to explore gaps, compare options, or plan **multiple** stories — before any single feature package exists.

## Study vs feature analysis

| Artifact | Template | When |
| --- | --- | --- |
| **Study** | `cursor/templates/analysis-study-template.md` | Generate backlog; table **Candidate stories** |
| **Feature analysis** | `cursor/templates/analysis-template.md` | One story already chosen; impact before implement |

```text
Study (studies/<slug>/study.md)
        ↓ rows Decision: implement
Feature package (features/<area>/<slug>/)
        ↓
analysis.md  ← per-story, not study.md
```

## Layout

```text
cursor/analysis/studies/<study-slug>/
└── study.md
```

Optional subfolder by topic: `studies/auth-hardening/study.md`, `studies/onboarding-dx/study.md`.

Do not commit secrets or production data in studies.

## Workflow

1. Create `study.md` from [`analysis-study-template.md`](../templates/analysis-study-template.md).
2. Fill **FINDINGS** and **CANDIDATE STORIES**.
3. Promote via [`prompt-story-intake.md`](../prompts/feature/prompt-story-intake.md) **Mode B**, or manually per row (Modo A / analysis package).
4. If using product backlog: register **Backlog ID** in `cursor/company/future-work/STORY-REGISTRY.md`.

Studies are **planning artifacts** — they do not replace shipped docs in `docs/` or stack docs.

## Related

- Intake Modo B: `cursor/prompts/feature/prompt-story-intake.md`
- Features index: [`features/INDEX.md`](features/INDEX.md)
- Governance: `cursor/docs/documentation-governance.md`
