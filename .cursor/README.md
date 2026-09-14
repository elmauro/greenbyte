# Cursor Configuration

This folder contains active Cursor configuration.

## Rules

Project rules live in `.cursor/rules/*.mdc` and are loaded by Cursor to guide code generation.

Use this folder for concise, actionable rules. Keep longer documentation, prompts, project context and analysis artifacts in `cursor/`.

## Hooks

`.cursor/hooks.json` runs `cursor/scripts/sync-github-feature.mjs --from-hook` after file edits. Sync only happens when `hookEnabled: true` in `cursor/scripts/github-story.config.json` (default: off). See `cursor/docs/github-projects-sync.md`.

