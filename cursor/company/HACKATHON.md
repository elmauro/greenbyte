# GreenByte — HatchWorks AI Hackathon (AgTech Edition)

Event context to guide technical and product decisions during hack week.

## Event

| Field | Value |
| --- | --- |
| **Name** | HatchWorks AI Hackathon — AgTech Edition |
| **Hack week** | 28 Sep – 1 Oct 2026 |
| **Demo day** | 2 Oct 2026 |
| **Team** | GreenByte (up to 6 people; only team allowed) |

## Hackathon requirements

1. **GenAI required** — the project must use generative AI tools in a central way (not decorative).
2. **Real use cases** — AgTech-oriented; cases shared by Syngenta (Vegetable BU).
3. **Free stack** — except GenAI, the team chooses the rest (this repo uses the foundation template enterprise preset).
4. **Own environment** — each team configures dev, APIs and datasets.

## Evaluation criteria

1. Innovation and GenAI usage (high weight)
2. Technical quality
3. Business / product viability
4. Demo and presentation

## IP and delivery

- HatchWorks retains hackathon IP.
- Code is delivered to Syngenta at the end of the event.
- Document decisions in `cursor/analysis/` to ease handoff.

## Partner: Syngenta

- Company we work with during the hackathon (Vegetable BU / AgTech cases).
- **Product goal not defined yet** — the landing reflects a corporate AgTech tone.
- GreenByte **is not** Syngenta: own site at **https://greenbyte-ag.com**, disclaimer in footer.

## Suggested approach for GreenByte

- **Domain:** `greenbyte-ag.com` (AWS: `infrastructure/web` + `docs/infrastructure/greenbyte-ag-domain.md`).
- **Web:** AgTech portal-style landing (green #009F3C, blue #36398E) deployable on S3/CloudFront.
- **MVP demo:** landing on AWS first; APIs and GenAI when the hackathon challenge is defined.

## Repository

- GitHub: [github.com/elmauro/greenbyte](https://github.com/elmauro/greenbyte)
- Default branch: `master`

## Next steps in the repo

1. Open `C:\Projects\greenbyte` as a workspace in Cursor.
2. Read `cursor/context-map.md` and `cursor/docs/AI-Project-Playbook.md`.
3. Register the first story in `cursor/company/future-work/` (prefix `GREENBYTE`).
4. `cd frontend && npm install && npm run dev` for the UI.
5. `cd backend && npm install` when it is time to integrate APIs.
