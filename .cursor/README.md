# Cursor Configuration

This folder contains active Cursor configuration.

## Rules

Project rules live in `.cursor/rules/*.mdc` and are loaded by Cursor to guide code generation.

Use this folder for concise, actionable rules. Keep longer documentation, prompts, project context and analysis artifacts in `cursor/`.

## Subagents

`.cursor/agents/*.md` pin an AI model per lifecycle phase to optimize accuracy and token expenditure.

| Subagent | Model | Phase / Role |
| --- | --- | --- |
| `lifecycle-scribe` | Composer 2.5 | Intake, manifest, registry, and story closing bookkeeping |
| `backlog-analyst` | Gemini 3.8 Flash (read-only) | Backlog exploration, roadmap scoping, and read-only analysis |
| `frontend-dev` | Grok 4.7 | React, Vite, Tailwind, MSW, and Cypress implementation |
| `backend-dev` | Grok 4.7 | AWS Serverless Lambda, TypeScript domain logic, and DynamoDB |

## Hooks

`.cursor/hooks.json` runs `cursor/scripts/sync-github-feature.mjs --from-hook` after file edits. Sync only happens when `hookEnabled: true` in `cursor/scripts/github-story.config.json` (default: off). See `cursor/docs/github-projects-sync.md`.
