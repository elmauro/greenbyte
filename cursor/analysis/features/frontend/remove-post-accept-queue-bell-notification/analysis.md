# Analysis — Remove post-accept queue bell notification

## Summary

Post-accept UX duplicated feedback: accepting cleared pending replan state but `acceptNotice` flipped `queueUpdateUnread`, which added a bell item, Queue nav badge, and blue status pill asking the planner to “confirm” queue order they had just approved on Scheduling.

## Root cause

- `usePlantDemoQueue.acceptPlan` sets `acceptNoticeLine` → `acceptNotice` prop on `PlantBaselineDashboard`.
- `PlantBaselineDashboard` mirrored `acceptNotice` into `queueUpdateUnread` and rendered bell + nav + pill surfaces from that flag.

## Impact

| Area | Change |
| --- | --- |
| `PlantBaselineDashboard.tsx` | Remove `queueUpdateUnread` state and all bell/nav/pill wiring tied to post-accept queue notification. |
| Tests | No Cypress assertion existed for post-accept bell; extend UX-10 manual expected result in hackathon matrix. |
| API / mocks | None. |

## Risks

- Low: planners who relied on the bell to open Queue after accept lose that shortcut; inline approved strip and Queue tab remain available.

## Context trace

- Playbook bug/UX fix path, frontend-only.
- Related matrix: UX-10, UX-06 (pending vs calm bell).
