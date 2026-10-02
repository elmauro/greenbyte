# User Story — Remove post-accept queue bell notification

## Title

- Name: Remove post-accept queue bell notification
- Slug: remove-post-accept-queue-bell-notification
- Ticket/story: GREENBYTE-012
- Backlog ID: n/a
- Change type: fix
- Stack scope: frontend

---

## Goal

- As a plant scheduler using the UC1 UX demo
- I want the bell and nav badges to clear after I accept a proposed plan
- So that I am not nudged again with a redundant “queue updated” notification when the timeline already reflects the accepted order

---

## Acceptance criteria

1. After **Accept schedule**, the notification bell count must **not** increase for a “queue updated” / “confirm queue order” item (UX and baseline MVP bell menus).
2. The Queue nav item must **not** show an info badge solely because the plan was accepted.
3. The header status pill must return to the **calm** (green) state after accept, not the blue “plan approved — review queue” pill driven by that notification.
4. Pending replan notices (other lines or new ingests) must behave unchanged (UX-06, MAN-01).
5. Inline approved copy on Dashboard/Queue (green strip, `acceptNotice` subtitles) may remain; this story targets bell/badge/pill notification chrome only.

---

## Out of scope

- Removing the green approved strip or dashboard “next step” text.
- Backend accept contract or SAP write behavior (UX-10).
