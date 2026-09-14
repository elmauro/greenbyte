# Story validation (generic)

How **tests and smoke checks** fit the feature lifecycle: when they are required, where evidence lives, and which gate to run.

**Related:** [`AI-Project-Playbook.md`](AI-Project-Playbook.md) · [`prompt-feature-lifecycle.md`](../prompts/feature/prompt-feature-lifecycle.md) · [`feature-manifest-template.md`](../templates/feature-manifest-template.md)

This is the product-neutral pattern. Stack-specific commands belong in the feature **Validation plan**, not in this doc.

---

## Where evidence lives

| Artifact | Role |
| --- | --- |
| `cursor/analysis/features/<area>/<slug>/test-checklist.md` | **Per-story** pass/fail (automated + optional smoke + optional manual) |
| `feature-manifest.md` → **Validation plan** | Source of truth for gates (`Run tests`, stack flags, extra commands) |
| `run-feature-gates.mjs --phase validation` | Mechanical gate (files always; commands only when the plan says so) |

Product quickstarts and READMEs are **not** story validation — they go stale. Use the feature checklist.

---

## Three tiers

| Tier | Name | When | Action | Blocks close? |
| --- | --- | --- | --- | --- |
| **T1** | Stack regression | Manifest **Run tests: yes** and the matching stack flag | `npm test` / lint / `terraform validate` as listed | Yes — gate runs listed commands |
| **T2** | Feature smoke | Extra commands in the Validation plan (E2E, a module apply, a CLI script) | Commands listed under **Extra commands** | Yes — when listed |
| **T3** | Optional manual | Confidence when T1 already covers the contract | Steps in checklist § Manual | No — unless ship criteria say otherwise |

**Promotion rule:** repeat T3 steps → prefer an automated T1/T2 check over a permanent manual step.

---

## Validation plan (manifest)

Every feature manifest includes:

```markdown
## Validation plan

- Run tests: yes | no
- Frontend tests: yes | no | n/a
- Backend tests: yes | no | n/a
- Infrastructure validate: yes | no | n/a
- Extra commands:
  - n/a
```

Fill at analysis. Override during implementation if the story changes.

### Suggested defaults at intake

| Story type | Default `Run tests` | Notes |
| --- | --- | --- |
| Docs / chore (no code) | `no` | Checklist sign-off is enough |
| Frontend-only code | `yes` | Frontend tests: yes |
| Backend-only code | `yes` | Backend tests: yes |
| Infrastructure-only | `yes` | Infrastructure validate: yes |
| Full-stack | `yes` | Flags for every stack touched |
| New E2E / smoke path | `yes` | Put the command under Extra commands |

---

## Standard checklist sections

Use these headings in `test-checklist.md` (full template: [`test-checklist-template.md`](../templates/test-checklist-template.md)):

```markdown
## Automated Checks
- [x] `<command>` — PASS YYYY-MM-DD

## Smoke — feature (T2)   ← omit if n/a
- [x] `<extra command>` — PASS YYYY-MM-DD

## Manual (optional) (T3)
- [ ] … — only when not covered by automated tests

## Review / Close
- Review: **pass**
```

Record **command + date + environment**.

---

## Close readiness

**Close** ([`prompt-feature-close-package.md`](../prompts/feature/prompt-feature-close-package.md)) requires:

1. T1 evidence in the checklist (or Validation plan `Run tests: no` with a reason)
2. T2 complete for every Extra command that is not `n/a`
3. T3 either executed or explicitly optional
4. **Review: pass** in the checklist

Gate:

```bash
node cursor/scripts/run-feature-gates.mjs --slug <slug> --phase validation
node cursor/scripts/run-feature-gates.mjs --slug <slug> --phase review
node cursor/scripts/run-feature-gates.mjs --slug <slug> --phase close-readiness
```
