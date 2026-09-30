# GreenByte Frontend

Web app for the Syngenta hackathon demo (**UC1 Plant Capacity** on `/demo/plant`) and supporting pages (architecture, UC4 breeding walkthrough).

**Stack:** React 18 · TypeScript · Vite 6 · Tailwind CSS · MSW (dev mocks)

## Quick start

```powershell
cd frontend
npm install
npm run dev
```

Open **http://localhost:51730/demo/plant**.

Local dev uses **MSW** to mock the BFF (`VITE_USE_MSW=true` in `.env.development`). No AWS backend required for UI work.

**Full guide:** [docs/development/getting-started.md](./docs/development/getting-started.md)

## Main demo routes

| Path | Description |
| --- | --- |
| `/demo/plant` | UC1 interactive demo |
| `/demo/plant/tour` | Guided 5-step tour |
| `/demo/plant/flow` | UI ↔ API integration map |
| `/demo/architecture` | Team architecture page |
| `/demo/breeding` | UC4 walkthrough (reference) |

## Configuration

| File | Purpose |
| --- | --- |
| `.env.development` | Default dev (MSW on) — committed |
| `.env.example` | Template for all `VITE_*` vars |
| `.env.local` | Your overrides (live BFF URL) — **gitignored** |

See [docs/development/api-mocks-and-bff.md](./docs/development/api-mocks-and-bff.md) for switching to live **core-api**.

## Commands

```powershell
npm run dev      # http://localhost:51730
npm run build    # dist/ for S3 deploy
npm run lint
npm run test:e2e # Cypress
```

## Generated features

From `frontend.config.json`: `router`, `services`, `types`, `tailwind`, `msw`.

## Documentation

- [docs/README.md](./docs/README.md) — index
- [docs/development/getting-started.md](./docs/development/getting-started.md) — run locally
- [docs/development/api-mocks-and-bff.md](./docs/development/api-mocks-and-bff.md) — mocks vs live API

Deploy: [docs/infrastructure/web-deployment.md](../docs/infrastructure/web-deployment.md)
