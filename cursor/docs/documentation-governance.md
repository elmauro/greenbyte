# Documentation — where things live

Policy for **shipped behavior** vs **backlog** vs **story artifacts** in `GreenByte`.

Last updated: generated at project creation.

---

## Principle

| Question | Answer in |
| --- | --- |
| What works **today** in code? | `frontend/docs/`, `backend/docs/`, `docs/` (per stack) |
| Architecture and operations? | `docs/architecture.md`, `docs/runbook.md`, … |
| What is **planned** (backlog)? | `cursor/company/future-work/` (if present) |
| Active **story** / feature work? | `cursor/analysis/features/<area>/<slug>/` |
| AI workflow and prompts? | `cursor/docs/AI-Project-Playbook.md`, `cursor/prompts/` |

One source of truth per dimension. Cross-link; do not duplicate long tables.

---

## Layers

```text
docs/                          ← product & operations (human-facing)
frontend/docs/ | backend/docs/ ← stack-specific shipped behavior
cursor/company/                ← product scope, MVP, backlog (optional)
cursor/analysis/features/      ← TEMPORAL — per-story artifacts
cursor/analysis/studies/       ← OPTIONAL — analysis before stories
```

---

## What to write where

### Shipped code docs (`docs/`, `frontend/docs/`, `backend/docs/`)

- Implemented behavior, API contracts, deploy, env vars.
- Honest limitations vs target platform.
- Audience: developers, QA, operators.

### `cursor/company/future-work/` (optional)

- Backlog items with priority, gap, ship criteria.
- **FW-*** or project-specific backlog IDs.
- Audience: product, planning, agents.

### `cursor/analysis/features/<slug>/`

- `user-story.md`, `analysis.md`, `test-checklist.md`, `feature-manifest.md`, `implementation-notes.md`.
- Lifecycle of one story; archive when done.
- On **close**: update INDEX.md; sync shipped behavior to stack docs if needed.

---

## Sync on ship

When closing a feature (`prompt-feature-close-package.md`):

1. Update `cursor/analysis/features/INDEX.md`.
2. Mark manifest `Current stage: done`.
3. If `cursor/company/future-work/STORY-REGISTRY.md` exists → mark shipped.
4. If `future-work/<area>/STORY-LOG.md` exists → `Estado: shipped`.
5. Update stack docs only if behavior or contracts changed.
6. Record residual risks in `implementation-notes.md`.
7. Optional: `run-feature-gates.mjs --phase sync`.

---

## Do not

- Duplicate full API tables in both backlog and stack docs.
- Keep stale story artifacts as source of truth after ship — link to shipped docs instead.
- Put secrets or environment-specific values in `cursor/` (use `.env.example` and runbooks).

---

## Related

- Playbook: `cursor/docs/AI-Project-Playbook.md`
- Feature index: `cursor/analysis/features/INDEX.md`
- Review: `cursor/analysis/shared/review-guidelines.md`
