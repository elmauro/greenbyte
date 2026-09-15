# Prompt: Story Intake

**Conversational** entry point to create features with minimal friction. The agent **asks only what is needed**, creates the package under `cursor/analysis/features/` and chains the lifecycle.

## When to use

- **Mode A — New story:** "I want a story for …" → package + lifecycle.
- **Mode B — From study:** "evaluate gaps in X" (create study) or "read this study and extract stories".

**Automate (agent; mechanical script optional):** intake is still required for new stories — the agent creates folders, `user-story.md`, `feature-manifest.md`, registry rows when backlog exists, and chains the lifecycle.

**Recommended (scripts):** `new-feature.mjs` registers ticket + STORY-LOG and prints the orchestrator block. Then `start-feature.mjs` and `sync-github-feature.mjs` — see `cursor/scripts/README.md`.

---

## Prompt to paste in Cursor

```text
@cursor/prompts/feature/prompt-story-intake.md
@cursor/docs/AI-Project-Playbook.md
@cursor/docs/documentation-governance.md
@cursor/templates/user-story-template.md
@cursor/templates/feature-manifest-template.md
@cursor/templates/analysis-study-template.md
@cursor/analysis/studies/README.md

Task type: story intake
Mode: A (new story) | B (stories from analysis)
Analysis ref (Mode B): <study path> | "create"
Topic (Mode B create): <what to evaluate>

Interaction rules:
- Ask ONLY what is missing; use reasonable defaults and state them.
- Feature name required; Feature slug kebab-case.
- Minimal context: see Playbook "Context routing"; do not read the entire repo.
- After Mode A intake, chain prompt-feature-lifecycle.md unless the user only wants registration.

── MODE A — NEW STORY
1) Gather (one or two fields at a time):
   - Feature name (required)
   - Feature slug (required; kebab-case)
   - Area (optional): backend | frontend | infrastructure | _core | product
   - Ticket/story: <id> | n/a
   - Backlog ID: FW-* | n/a — do NOT use as Ticket/story
   - Stack scope: backend | frontend | infrastructure | full-stack
   - Implement now? [default: create package and ask]
2) Path:
   - With area: cursor/analysis/features/<area>/<slug>/
   - Without area: cursor/analysis/features/<slug>/
3) Create user-story.md + feature-manifest.md (title = Feature name)
4) If cursor/company/future-work/STORY-REGISTRY.md exists: add row; not shipped
   Prefer: node cursor/scripts/new-feature.mjs --name "<Feature name>" --area <area> [--fw FW-*]
   That writes the area STORY-LOG.md and the orchestrator copy-paste block.
5) If Backlog ID = "create": add FW-* in future-work/ with ITEM-TEMPLATE.md
6) Optional: node cursor/scripts/start-feature.mjs --slug <slug>
7) Chain prompt-feature-lifecycle.md (or analysis-package if planning only — package must exist from this intake)
8) Validation plan in manifest: Run tests yes/no by stack (see story-validation.md)

── MODE B — STORIES FROM STUDY
1) B1 (exists): read Analysis ref (study.md)
   B2 (create): produce cursor/analysis/studies/<study-slug>/study.md with analysis-study-template.md from Topic; link canonical docs, do not duplicate long tables
2) Complete Candidate stories table (Decision: implement | defer | confirm)
3) Show preview to user: implement rows with slug, ticket, proposed area
4) After OK: for each implement row repeat Mode A steps (one at a time unless batch explicit)
5) Ask lifecycle for highest priority

Stop conditions:
- Missing Feature name or slug (Mode A)
- Mode B: no valid Topic or Analysis ref
- User did not approve implement row preview (Mode B)
- Comparison source without clear gap

Constraints:
- Do not implement code during intake unless explicitly requested
- Do not mark shipped (close phase)
- Keep diffs focused
```

---

## Examples

**Mode A:**

```text
@cursor/prompts/feature/prompt-story-intake.md
Mode: A

I want a story: customer onboarding with email invitation.
```

**Mode B:**

```text
@cursor/prompts/feature/prompt-story-intake.md
Mode: B
Analysis ref: create
Topic: Authentication gaps (MFA, session timeout, password policy)
```

---

## Related

- Context routing: `cursor/docs/AI-Project-Playbook.md`
- Context trace (optional): `cursor/docs/context-trace-matrix.md`
- Lifecycle: `prompt-feature-lifecycle.md`
- Study template: `cursor/templates/analysis-study-template.md`
- Backlog (optional): `cursor/company/future-work/STORY-REGISTRY.md`
