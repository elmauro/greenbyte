# Feature Manifest — Remove post-accept queue bell notification

## Feature

- Name: Remove post-accept queue bell notification
- Slug: remove-post-accept-queue-bell-notification
- Ticket/story: GREENBYTE-012
- Backlog ID: n/a
- Change type: fix
- Owner: greenbyte-hackathon
- Last updated: 2026-10-02
- Stack scope: frontend

## Goal

- Stop redundant bell/nav/pill notifications after Accept; keep pending-ingest notices unchanged.

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

- Problem: post-accept “queue updated” bell — evidence: user report, `PlantBaselineDashboard` `queueUpdateUnread`
- Out of scope: remove inline approved strip

---

## TARGET SCOPE

- Frontend: `PlantBaselineDashboard.tsx`
- Docs: `docs/hackathon/uc1-scheduler-ux-test-cases.md` (UX-10)

---

## Gates

- package: user-story present
- analysis: analysis.md present
- implementation: code + implementation-notes.md
- validation: lint + test-checklist.md
- review: pass in test-checklist
- close-readiness: manifest stage done, INDEX + registry
