# Implementation notes — Remove post-accept queue bell notification

## Feature

- Name: Remove post-accept queue bell notification
- Slug: remove-post-accept-queue-bell-notification
- Ticket/story: GREENBYTE-012

## Decision

Remove the `queueUpdateUnread` client flag and all UI that consumed it. Keep `acceptNotice` for non-bell inline messaging (approved strip, queue subtitle on Dashboard path).

## Files touched

- `frontend/src/components/plant/PlantBaselineDashboard.tsx` — delete post-accept bell menu items (UX + MVP), notification count increment, Queue nav info badge, blue approved pill branch, and effects that synced `queueUpdateUnread` from `acceptNotice`.
- `docs/hackathon/uc1-scheduler-ux-test-cases.md` — UX-10 expected result clarifies no post-accept queue bell item.

## Residual

- i18n keys `notificationQueue*`, `confirmTitle`, `pillApproved*` remain unused by bell path; safe to prune in a later copy pass.
