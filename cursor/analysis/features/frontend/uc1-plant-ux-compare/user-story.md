# UC1 Plant UX compare page

- Name: UC1 Plant UX compare page
- Ticket/story: GREENBYTE-004

## Story

As a product/demo owner, I want a **second Line 1 route** (`/demo/plant/ux`) that keeps **GreenByte visual styles** while porting **Lovable UX** (help, status pills, richer notifications, calm banner) so we can compare side-by-side with `/demo/plant`.

## Acceptance

- New route behind a **demo login** (default user documented in `.env.example`).
- Same BFF/MSW queue poll and accept behavior as classic demo.
- Classic `/demo/plant` unchanged.
- EN/ES strings for new UX copy.

## Phase 2 (done)

- Queue filters and `reasonShort` column (UX route only).
- “What changed” list on Scheduling when a replan is pending.
- Approval history drawer (localStorage).
- Mobile bottom nav (UX route only).

## Phase 3 (done)

- Multi-select compare drawer on Queue (UX route).
- Collapsed “demo operators” note on UX page (no ingest paths on main workspace).

## Out of scope

- URL sync on classic `/demo/plant`.
