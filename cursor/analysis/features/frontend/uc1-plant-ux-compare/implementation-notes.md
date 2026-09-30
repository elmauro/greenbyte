# Implementation notes — uc1-plant-ux-compare

## Phase 1 (done)

- `usePlantDemoQueue` shared hook.
- `/demo/plant/ux`, `PlantDemoLoginGate`, UX copy in i18n.
- `PlantBaselineDashboard` `experience="ux"`: pills, calm/amber banners, help drawer, enriched bell, sticky approve bar, URL `section`.

## Phase 2

- Queue quick filters (all / at risk / hold / species).
- `reasonShort` column on UX queue table; HOLD chip styling.
- Scheduling “What changed” from `explanation.bullets`.
- Approval history drawer (`plantUxApprovalHistory.ts`).
- Mobile bottom nav (UX only).

## Phase 3

- `PlantUxCompareDrawer` + row checkboxes on UX queue.
- Operator `<details>` on `PlantLineUx` footer.

## Compare

- Classic: `/demo/plant` — no `experience` prop.
- UX: `/demo/plant/ux?section=scheduling` — login required.
