# Context scope — session prompts

Optional reference for **token-aware chats**. Lifecycle, validation, and close criteria are unchanged — see [`AI-Project-Playbook.md`](AI-Project-Playbook.md) and `.cursor/rules/context-scope.mdc`.

Prefer a **new chat** per phase when possible. Copy a block below and fill ticket, paths, and slug.

---

## Intake / analysis

```text
GreenByte — <ticket> — analysis only

Read ONLY:
- cursor/analysis/features/<area>/<slug>/user-story.md
- cursor/analysis/features/<area>/<slug>/analysis.md
- cursor/projects/<stack>/project-context.md (if stack known)

Do NOT read: unrelated stacks, full STORY-REGISTRY, entire repo.

Task: [gap / ship criteria / analysis update]
```

## Backend implementation

```text
GreenByte — <ticket> — backend implement

Read ONLY:
- cursor/projects/backend/project-context.md
- backend/<exact paths>
- backend/docs/ or API spec if contract changes

Do NOT read: frontend/, infrastructure/, cursor/company/ unless scope changes.

Task: [single change]
```

## Frontend implementation

```text
GreenByte — <ticket> — frontend implement

Read ONLY:
- cursor/projects/frontend/project-context.md
- frontend/<exact paths>

Do NOT read: backend/, future-work/ unless contract or copy changes.

Task: [single change]
```

## Infrastructure

```text
GreenByte — <ticket> — infra

Read ONLY:
- cursor/projects/infrastructure/project-context.md
- infrastructure/<exact paths>

Do NOT read: application code unless outputs/vars affect apps.

Task: [single change]
```

## Close

```text
GreenByte — <ticket> — close only

Read ONLY:
- cursor/analysis/features/<area>/<slug>/feature-manifest.md
- cursor/analysis/features/<area>/<slug>/test-checklist.md
- cursor/analysis/features/INDEX.md
- STORY-REGISTRY row (if company/future-work/) — one row only

Do NOT re-read full source tree or analysis.md unless checklist gaps require it.

Task: close package + doc sync per documentation-governance.md
```

## GitHub sync (optional)

```text
GreenByte — <ticket> — github sync

Run: node cursor/scripts/sync-github-feature.mjs --slug <slug>
Commit: github.sync.json + manifest updates only.
```

## Ask (no Agent)

```text
GreenByte — question (Ask mode)

Read only if needed: one doc from cursor/docs/ or cursor/company/.
Question: […]
```

---

## Related

- Context trace matrix (optional evidence): [`context-trace-matrix.md`](context-trace-matrix.md)
- Playbook routing: [`AI-Project-Playbook.md`](AI-Project-Playbook.md)
