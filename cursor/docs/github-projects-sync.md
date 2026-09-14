# GitHub Projects — sync feature stories

Operational guide to create or update **GitHub Issues** and **Project board** status from feature packages in `cursor/analysis/features/`.

## Where things live

| What | Where | Purpose |
| --- | --- | --- |
| **This guide** | `cursor/docs/github-projects-sync.md` | Human setup + per-story workflow |
| **Product backlog** (optional) | `cursor/company/future-work/` + `STORY-REGISTRY.md` | `FW-*` items; promotion to execution ticket |
| **Story spec** | `cursor/analysis/features/<area>/<slug>/user-story.md` | Acceptance criteria (source of truth) |
| **Story state** | `cursor/analysis/features/<area>/<slug>/feature-manifest.md` | Stage → board column |
| **Validation** | `cursor/analysis/features/<area>/<slug>/test-checklist.md` | How to test |
| **Linked issue** | `cursor/analysis/features/<area>/<slug>/github.sync.json` | Issue # after first sync |
| **Scripts** | `cursor/scripts/sync-github-feature.mjs`, `start-feature.mjs`, `new-feature.mjs`, `run-feature-gates.mjs` | Automation |
| **Local config** | `cursor/scripts/github-story.config.json` | Project #, phases (gitignored) |

**Rule:** markdown in the repo defines the story; GitHub Issue + Project reflect **status**, not a second spec.

### Backlog ID vs Ticket/story

| Field in feature package | Format | Example |
| --- | --- | --- |
| **Ticket/story** | Execution ID (GitHub/JIRA) | `MY_APP-001`, `LOY-123` |
| **Backlog ID** (manifest) | `FW-*` when promoted from backlog | `FW-MY_APP-001` |

Do not use `FW-*` as Ticket/story. `sync-github-feature.mjs` uses the full ticket string for issue title and search.

---

## One-time setup

Use **PowerShell** or **Windows Terminal** (recommended for `gh auth` on Windows).

### 1. Install GitHub CLI

https://cli.github.com/

### 2. Authenticate

```powershell
gh auth login -h github.com -p https -w
gh auth refresh -h github.com -s read:project,project
gh auth status
```

### 3. Project config

```powershell
cd C:\Projects\my-app
copy cursor\scripts\github-story.config.example.json cursor\scripts\github-story.config.json
node cursor/scripts/sync-github-feature.mjs --setup-project
```

Edit `cursor/scripts/github-story.config.json`:

- `projectOwner` — org or user (often your repo slug)
- `projectNumber` — GitHub Project number
- `ticketPrefix` — prefix for internal tickets (`MY_APP` → `MY_APP-001`)
- `phaseParents` — parent epic issue numbers per phase
- `ticketPhase` — map `"001": "phase-1"` (digits only, no prefix)

Re-run `--setup-project` to verify Status columns: Backlog, Ready, In progress, In review, Done.

---

## Per-story workflow

```text
Analysis package     →  sync (Backlog / Ready)
Implementation       →  update manifest → sync (In progress)
Validation / Review  →  sync (In review)
Close                →  manifest done → sync (Done) → optional FW Shipped
```

### 1. Create analysis package

Use `prompt-feature-analysis-package.md` or intake. Expected folder:

```text
cursor/analysis/features/<slug>/
├── user-story.md
├── analysis.md
└── feature-manifest.md
```

Example prompt fields:

```text
Feature slug: customer-onboarding
Feature name: Customer onboarding
Ticket/story: MY_APP-001
Stack scope: full-stack
```

### 2. Start git branch (optional)

```bash
node cursor/scripts/start-feature.mjs --slug customer-onboarding
```

Or register first (assigns ticket + STORY-LOG when backlog exists):

```bash
node cursor/scripts/new-feature.mjs --name "Customer onboarding" --area frontend
```

### 3. Sync to GitHub

```bash
node cursor/scripts/sync-github-feature.mjs --slug customer-onboarding
```

Preview:

```bash
node cursor/scripts/sync-github-feature.mjs --slug customer-onboarding --dry-run
```

### 4. Re-sync on stage changes

After updating `feature-manifest.md` (**Current stage**), re-run sync.

### 5. Close

Run `prompt-feature-close-package.md` after review pass. Final sync marks issue Done and updates `github.sync.json`.

---

## Promote from backlog (optional)

When using `cursor/company/future-work/`:

1. Pick `FW-*` item in area README.
2. Assign execution ticket (`MY_APP-002`) in `STORY-REGISTRY.md`.
3. Create feature package with `Ticket/story: MY_APP-002` and `Backlog ID: FW-MY_APP-002`.
4. Sync as above.

---

## Manifest stage → Project column

Default mapping (override in config):

| Manifest stage | Project Status |
| --- | --- |
| intake, analysis | Backlog |
| planned | Ready |
| implementation | In progress |
| validation, review | In review |
| done, closed | Done |

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `gh` not found | Install CLI; restart terminal |
| Project sync skipped | `gh auth refresh -s read:project,project` |
| Wrong board column | Fix `manifestStageToProjectStatus` in config |
| Issue not found on re-sync | Check `github.sync.json` or ticket in title |

---

## Cursor hook (optional)

`.cursor/hooks.json` runs `sync-github-feature.mjs --from-hook` after file edits.

Default: **off**. To enable:

1. Copy `github-story.config.example.json` → `github-story.config.json`
2. Set `"hookEnabled": true`
3. Reload Cursor hooks (save `hooks.json` or restart)

The script no-ops unless the edited file is a `user-story.md` or `feature-manifest.md` and `hookEnabled` is true.

---

## Related

- Script reference: [`cursor/scripts/README.md`](../scripts/README.md)
- Playbook: [`AI-Project-Playbook.md`](AI-Project-Playbook.md)
- Examples: [`docs/examples/`](../../docs/examples/README.md) (in foundation template repo)
