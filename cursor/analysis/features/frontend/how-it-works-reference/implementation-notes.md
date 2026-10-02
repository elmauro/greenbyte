# Implementation notes — How it works reference

## What changed

- Signed-in header replaces the separate UI↔API and Architecture links with one How it works link. UC1 Pasco and Program Timeline stay.
- `/demo/how-it-works` is the reference page. The left menu has Architecture (default) and UI and API (`section=api`).
- Architecture content is the existing architecture page, embedded without a second site header.
- UI and API keeps the flow steps. Each step leads with the trigger, a concrete request line, the body or a no-body note, then the response JSON. The screen preview sits under that contract.
- GET queue examples use `line-1` and `?locale=en`. POST examples keep the bodies already defined on the flow steps.
- `/demo/architecture` redirects to `/demo/how-it-works`. `/demo/plant/flow` redirects to `section=api` and keeps `step`.

## Deviations

- None. UC1 Pasco remains in the header, as scoped.

## Docs

- `frontend/docs/development/getting-started.md` route table
- `docs/hackathon/uc1-mvp-scope.md`, `uc1-ui-backend-flow.md`, `syngenta-demo-architecture.md` live URLs
