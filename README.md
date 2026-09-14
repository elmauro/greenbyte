# GreenByte

Repository: [github.com/elmauro/greenbyte](https://github.com/elmauro/greenbyte)

Generated from `project-foundation-template`.

## Project

- Slug: `greenbyte`
- Domain: AgTech — intelligent agriculture and crop data
- Preset: `fullstack-aws-enterprise`
- AWS region: `us-east-1`
- Owner team: `greenbyte-hackathon`

## Structure

- `.cursor/`: active Cursor configuration and project rules.
- `frontend/`: web application when enabled by the preset.
- `backend/`: API and application services when enabled by the preset.
- `infrastructure/`: Terraform environments when enabled by the preset.
- `cursor/`: AI working context, prompts, templates and analysis artifacts.
- `docs/`: product, architecture and operational documentation.

## Hackathon & Syngenta

GreenByte — **HatchWorks AI Hackathon — AgTech Edition** (28 Sep – 1 Oct 2026), in collaboration with **Syngenta**.  
Context: [`cursor/company/HACKATHON.md`](cursor/company/HACKATHON.md).

**Domain:** [greenbyte-ag.com](https://greenbyte-ag.com) — AWS deployment: [`docs/infrastructure/greenbyte-ag-domain.md`](docs/infrastructure/greenbyte-ag-domain.md).

## Quick start

```bash
cd frontend && npm install && npm run dev
```

```bash
cd backend && npm install
```

## Context

- Start with `project.config.json`.
- Use `cursor/context-map.md` as the quick project map.
- Use `.cursor/rules/project-context.mdc` for Cursor context discovery rules.
