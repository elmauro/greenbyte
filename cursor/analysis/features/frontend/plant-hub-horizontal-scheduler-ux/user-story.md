# User Story — Align Pasco hub with horizontal scheduler UX

## Title

- Name: Align Pasco hub with horizontal scheduler UX
- Slug: plant-hub-horizontal-scheduler-ux
- Ticket/story: GREENBYTE-015
- Backlog ID: n/a
- Change type: feat
- Stack scope: frontend

---

## Goal

- As a demo visitor on `/demo/plant` (Pasco hub)
- I want the line scheduler to use the same horizontal top navigation as `/demo/plant/ux`
- So that the outdated left sidebar is gone while intro and data-feed context remain on the hub route

---

## Acceptance criteria

1. `/demo/plant` renders `PlantBaselineDashboard` with `experience="ux"` (section URL params, accept bar, decision history).
2. Hub keeps intro, tour links, and data-feed note with link to How it works → UI and API.
3. Copy and tour previews no longer reference the left menu; Cypress UX-04 asserts horizontal nav on the hub.
4. `/demo/plant/ux` behavior unchanged.
