# Feature Manifest — How it works reference

## Feature

- Name: How it works reference
- Slug: how-it-works-reference
- Ticket/story: GREENBYTE-007
- Backlog ID: n/a
- Change type: feat
- Owner: greenbyte-hackathon
- Last updated: 2026-10-02
- Stack scope: frontend

## Goal

- Put Architecture and the UI-to-API map on one How it works page, and lead each API step with a request and response example.

---

## Status

- User Story: done
- Analysis: done
- Implementation: done
- Testing: done
- Review: done
- Current stage: done

---

## SOURCE SCOPE

- Problem / opportunity status: clear
- Source documents:
  - `user-story.md` — present — key scope: header and contract-first API steps
  - `analysis.md` — present — key findings: reuse both pages, redirect old routes, concrete GET example from plantDemoApi
- Current behavior in scope:
  - Separate header links and a side JSON column — evidence: `SiteHeader.tsx`, `PlantUc1FlowGallery.tsx`
- Out of scope:
  - UC1 Pasco header item — reason: classic screen
  - API contract changes — reason: examples stay on current snapshots

---

## TARGET SCOPE

- Backend (`backend/`):
  - APIs / functions: unchanged
  - services / layers: unchanged
  - data / infra: unchanged
  - docs / tests: live-map pointers updated where they are the entry URL
- Frontend (`frontend/`):
  - pages / components: How it works shell, header, flow contract panel
  - services / types: unchanged
  - mocks / E2E / unit tests: lint plus manual browser check
  - docs: getting-started route table
- Infrastructure (`infrastructure/`):
  - modules / capabilities: unchanged
  - env / IAM / deploy: unchanged
  - docs: unchanged

---

## Documents

- `user-story.md` — present
- `analysis.md` — present
- `implementation-notes.md` — present
- `test-checklist.md` — present

---

## FLOW

- Current shipped/planned flow:
  - Step 1: open How it works — source: `user-story.md`
  - Step 2: choose UI and API and read request then response — source: `analysis.md`
- Acceptance criteria summary:
  - One header link, two menu options, contract-first steps, legacy redirects, both locales — source: `user-story.md`

---

## Validation plan

- Run tests: yes
- Frontend tests: no
- Backend tests: n/a
- Infrastructure validate: n/a
- Extra commands:
  - `npm run lint --prefix frontend`

Frontend has no unit-test script. Lint is the stack check. The browser check of How it works is recorded in test-checklist.md.

---

## Handoff

- Next step: n/a
