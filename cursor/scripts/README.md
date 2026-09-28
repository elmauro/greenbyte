# Cursor scripts

Technical reference for scripts in `cursor/scripts/`.

**Operational guide:** [`cursor/docs/github-projects-sync.md`](../docs/github-projects-sync.md)  
**Validation tiers:** [`cursor/docs/story-validation.md`](../docs/story-validation.md)

## New feature (intake)

Registers the next execution ID, writes a `STORY-LOG.md` entry (when `cursor/company/future-work/` exists), and prints the lifecycle paste block. Does **not** create analysis files.

```bash
node cursor/scripts/new-feature.mjs --name "Password reset via email" --area frontend
node cursor/scripts/new-feature.mjs --name "…" --area backend --fw FW-GREENBYTE-001 --stack backend
node cursor/scripts/new-feature.mjs --from-study cursor/analysis/studies/<slug>/study.md --dry-run
```

| Flag | Default | Notes |
| --- | --- | --- |
| `--name` | required (single) | Feature name |
| `--area` | `backend` | `backend` `frontend` `infrastructure` `product` `_core` or a domain slug |
| `--type` | `feat` | `feat`, `fix`, `docs`, `chore`, `refactor` — saved in STORY-LOG and paste block |
| `--fw` | `n/a` | Backlog ID `FW-*` |
| `--slug` | derived from name | kebab-case |
| `--stack` | inferred from area | `backend` `frontend` `infrastructure` `full-stack` |
| `--ticket` | next ID from registry | Override execution ID |
| `--start` | `analysis` | Orchestrator `Start at` |
| `--run-tests` | derived | `yes` for code changes; `no` for docs/chore/product |
| `--from-study` | — | All `Decision: implement` rows in a study |
| `--dry-run` | — | Preview only |

Ticket prefix comes from `github-story.config.json` → `ticketPrefix` (or the example file).

## Feature lifecycle gates

Mechanical checks between playbook phases (files, Validation plan commands, review sign-off, GitHub sync). Agent prompts stay in `cursor/prompts/feature/`; this script returns pass/fail only.

```bash
node cursor/scripts/run-feature-gates.mjs --slug customer-onboarding --phase package
node cursor/scripts/run-feature-gates.mjs --slug customer-onboarding --phase analysis
node cursor/scripts/run-feature-gates.mjs --slug customer-onboarding --phase implementation
node cursor/scripts/run-feature-gates.mjs --slug customer-onboarding --phase validation
node cursor/scripts/run-feature-gates.mjs --slug customer-onboarding --phase review
node cursor/scripts/run-feature-gates.mjs --slug customer-onboarding --phase close-readiness
node cursor/scripts/run-feature-gates.mjs --slug customer-onboarding --phase sync --dry-run
```

| Phase | Checks |
| --- | --- |
| `package` | `user-story.md` with Name + Ticket/story |
| `analysis` | + `analysis.md`, `feature-manifest.md` |
| `implementation` | + `implementation-notes.md`, `test-checklist.md` |
| `validation` | + commands from manifest **Validation plan** when `Run tests: yes` |
| `review` | Validation evidence + `Review: **pass**` in checklist |
| `close-readiness` | Review gate + manifest stage `review` or `validation` |
| `sync` | Runs `sync-github-feature.mjs` |

Exit code: **0** pass, **1** fail, **2** usage error. Use `--json` for machine-readable output.

Orchestrator: [`cursor/prompts/feature/prompt-feature-lifecycle.md`](../prompts/feature/prompt-feature-lifecycle.md).

## Start feature (git branch)

Creates a branch from a feature package under `cursor/analysis/features/`.

```bash
node cursor/scripts/start-feature.mjs --slug customer-onboarding
node cursor/scripts/start-feature.mjs --slug customer-onboarding --dry-run
```

Reads `Ticket/story` and `Name` from `user-story.md`. Branch pattern: `{branchPrefix}/{ticket}` (default `feature/…` from config).

## GitHub feature sync

Creates or updates a **GitHub Issue** from a feature package.

```bash
cp cursor/scripts/github-story.config.example.json cursor/scripts/github-story.config.json
node cursor/scripts/sync-github-feature.mjs --setup-project
node cursor/scripts/sync-github-feature.mjs --slug customer-onboarding
node cursor/scripts/sync-github-feature.mjs --slug customer-onboarding --dry-run
node cursor/scripts/sync-github-feature.mjs --all
```

### Prerequisites

1. [GitHub CLI](https://cli.github.com/) (`gh`) installed and authenticated.
2. Node.js 18+.
3. Copy and edit `github-story.config.json` (gitignored locally).

### Config highlights

| Field | Purpose |
| --- | --- |
| `ticketPrefix` | e.g. `MY_APP` for tickets `MY_APP-001` |
| `branchPrefix` | Used by `start-feature.mjs` (default `feature`) |
| `projectNumber` | GitHub Project board number |
| `manifestStageToProjectStatus` | Maps manifest stage → board column |
| `ticketPhase` | Maps ticket digits → phase label / parent epic |
| `hookEnabled` | If `true`, `.cursor/hooks.json` syncs after edits to story/manifest |

### Cursor hook (optional)

`.cursor/hooks.json` runs `sync-github-feature.mjs --from-hook` after file edits.

Default: **hook disabled** (`hookEnabled: false`). Enable only after `github-story.config.json` is set up.

### Workflow with playbook

| Phase | Re-run sync when manifest stage changes |
| --- | --- |
| Analysis | intake, analysis → Backlog |
| Implementation | implementation → In progress |
| Validation / Review | validation, review → In review |
| Close | done, closed → Done (+ close issue) |

Writes `cursor/analysis/features/<slug>/github.sync.json` on success.

## Sync features index

Keeps `cursor/analysis/features/INDEX.md` synchronized with the actual feature packages on disk. Detects new packages or stage updates from manifests.

```bash
node cursor/scripts/sync-features-index.mjs          # preview (dry-run)
node cursor/scripts/sync-features-index.mjs --apply  # write changes
```

## Story close helper

Automates the mechanical bookkeeping steps required when closing a story:
1. Marks `feature-manifest.md` as `Current stage: done` and `Review: done`.
2. Marks the story as `shipped` in `cursor/company/future-work/STORY-REGISTRY.md`.
3. Marks the entry as `shipped` with completion date in the area `STORY-LOG.md`.
4. Runs `sync-features-index.mjs --apply` to update `INDEX.md`.

```bash
node cursor/scripts/story-close.mjs --slug <slug> --dry-run   # preview
node cursor/scripts/story-close.mjs --slug <slug> --apply     # apply close
node cursor/scripts/story-close.mjs --ticket <id> --apply     # close by ticket ID
```

## Related

- Playbook: `cursor/docs/AI-Project-Playbook.md`
- Template: `cursor/templates/github.sync.json.example`
- Backlog (optional): `cursor/company/future-work/STORY-REGISTRY.md`
