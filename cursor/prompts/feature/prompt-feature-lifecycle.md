# Prompt: Feature Lifecycle (orchestrator)

Use this prompt to run **multiple lifecycle phases in one Agent session** with explicit gates. It orchestrates the existing phase prompts — it does not replace them.

**When to use:** new story from analysis through close, or resume mid-pipeline (`Start at: validation`).

**Intake primero (story nueva):** si no hay paquete ni entrada en `STORY-LOG.md`, usa [`prompt-story-intake.md`](prompt-story-intake.md) (Modo A o B) o `node cursor/scripts/new-feature.mjs` antes de este orquestador. Si la story ya existe, pega el bloque del STORY-LOG.

**When not to use:** bugs (`prompt-bug-fix.md`), manifest-only updates, or GitHub re-sync only (use `prompt-feature-close-package.md` PHASE GitHub).

## Context scope (token-aware)

| Prefer | Avoid in the same long session |
| --- | --- |
| **New chat per phase** (implement → PR → close) | Full `STORY-REGISTRY.md` + all stack contexts + full codebase |
| **Lite prompt** below when `Start at: implementation \| validation \| review \| close` | Lifecycle orchestrator for close-only (use close package) |
| **Full prompt** only for `Start at: analysis` or `full-stack` | Unrelated area folders |

Stack-scoped `@` attachments — add **only** rows that match **Stack scope**:

| Stack scope | Attach |
| --- | --- |
| `frontend` | `@cursor/projects/frontend/project-context.md`, `@.cursor/rules/frontend-react.mdc`, `@.cursor/rules/core-standards.mdc` |
| `backend` | `@cursor/projects/backend/project-context.md`, `@.cursor/rules/backend-serverless.mdc`, `@.cursor/rules/core-standards.mdc` |
| `infrastructure` | `@cursor/projects/infrastructure/project-context.md`, `@.cursor/rules/infrastructure-terraform.mdc`, `@.cursor/rules/core-standards.mdc` |
| `full-stack` | All affected stack contexts + rules (no shortcuts) |

See also: [`context-scope-sessions.md`](../../docs/context-scope-sessions.md).

## Required inputs

- Feature slug: `<feature-slug>`
- Feature name: `<feature-name>`
- Area: `<area>` (`backend` \| `frontend` \| `infrastructure` \| `product` \| `_core` \| domain)
- Ticket/story: `<ticket>` or read from package
- Backlog ID: `FW-*` \| `n/a`
- Stack scope: `backend` \| `frontend` \| `infrastructure` \| `full-stack`
- **Start at:** `analysis` \| `implementation` \| `validation` \| `review` \| `close` (default: `analysis`)
- **Run tests:** `yes` \| `no` — persist in manifest **Validation plan**; gate reads the plan (see [`story-validation.md`](../../docs/story-validation.md))
- **Auto-close:** `yes` \| `no` (default `yes` — run close package after review pass)

## Mechanical gates (script)

Before advancing past validation / review / close, run:

```bash
node cursor/scripts/run-feature-gates.mjs --slug <feature-slug> --phase <phase>
```

| After phase | Gate command |
| --- | --- |
| Analysis | `--phase analysis` then `--phase sync` (creates/updates GitHub issue when configured) |
| Implementation | `--phase implementation` (re-run `--phase sync` after manifest stage changes) |
| Validation | `--phase validation` (commands from manifest **Validation plan**) |
| Review | `--phase review` |
| Close (before final sync) | `--phase close-readiness` then `--phase sync` |

If a gate **fails**: fix in the current phase, re-run the gate, **do not** advance until exit 0.

## Prompt to paste — **Lite** (recommended)

Use when **Start at** is `implementation`, `validation`, `review`, or `close`.

```text
@cursor/prompts/builders/universal-cursor-prompt-builder.md
@cursor/analysis/features/<area>/<feature-slug>/user-story.md
@cursor/analysis/features/<area>/<feature-slug>/analysis.md
@cursor/analysis/features/<area>/<feature-slug>/feature-manifest.md
@cursor/analysis/shared/review-guidelines.md
@.cursor/rules/core-standards.mdc

Task type: feature lifecycle
Feature slug: <feature-slug>
Feature name: <feature-name>
Ticket/story: <ticket>
Backlog ID: <FW-*|n/a>
Stack scope: backend | frontend | infrastructure | full-stack
Start at: implementation | validation | review | close
Run tests: yes | no
Auto-close: yes | no

Skip phases before Start at.
Run node cursor/scripts/run-feature-gates.mjs --slug <feature-slug> --phase <phase> before advancing.
Stop on failed gate. Do not skip review before close.
Do not expand scope between phases.
```

## Prompt to paste — **Full** (analysis or new package)

```text
@cursor/prompts/feature/prompt-feature-analysis-package.md
@cursor/prompts/feature/prompt-feature-implementation-package.md
@cursor/prompts/feature/prompt-feature-validation-package.md
@cursor/prompts/feature/prompt-feature-review.md
@cursor/prompts/feature/prompt-feature-close-package.md
@cursor/docs/story-validation.md
@cursor/analysis/shared/review-guidelines.md
@.cursor/rules/core-standards.mdc

Task type: feature lifecycle
Feature slug: <feature-slug>
Feature name: <feature-name>
Area: <area|n/a>
Ticket/story: <ticket-or-n/a>
Backlog ID: <FW-*|n/a>
Stack scope: backend | frontend | infrastructure | full-stack
Start at: analysis
Run tests: no
Auto-close: yes

Execute phases in order (skip those before Start at):

1. ANALYSIS — story + analysis + manifest (skip if package already complete)
2. IMPLEMENT — code/docs + implementation-notes + test-checklist + manifest
3. VALIDATE — run focused checks; update test-checklist + Validation plan
4. REVIEW — peer review; classify findings; write Review: **pass** before close
5. CLOSE — INDEX + STORY-LOG + registry/docs sync + manifest done

After each phase: node cursor/scripts/run-feature-gates.mjs --slug <feature-slug> --phase <phase>
Stop on failed gate. Do not skip review before close.
Do not expand scope between phases.
```

## Entry point alternativo

Para intake conversacional antes del lifecycle:

```text
@cursor/prompts/feature/prompt-story-intake.md
Mode: A
```
