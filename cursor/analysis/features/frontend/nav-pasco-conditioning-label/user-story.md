# User Story — Nav label Pasco conditioning

## Title

- Name: Nav label Pasco conditioning
- Slug: nav-pasco-conditioning-label
- Ticket/story: GREENBYTE-013
- Backlog ID: n/a
- Change type: enhancement
- Stack scope: frontend

---

## Goal

- As a demo user in the signed-in header
- I want the first nav link to describe the Pasco scheduler hub in plain language
- So that I understand what `/demo/plant` is without hackathon jargon (“UC1”)

---

## Acceptance criteria

1. Signed-in header nav label for `/demo/plant` is **Pasco conditioning** (EN) / **Acondicionamiento Pasco** (ES).
2. Home hero CTA that points at the demo uses the same naming (no “UC1 Pasco”).
3. `frontend/README.md` route table describes `/demo/plant` and `/demo/plant/ux` consistently with nav labels.
4. No change to routes, slugs, or `demoPlantFlow` label in this story.

---

## References

- Hub page: `plantMvp.title` — Pasco conditioning / Pasco acondicionamiento
- Nav: `SiteHeader` → `m.nav.demoPlant`
