# UC1 — Plant UX compare route

Side-by-side evaluation of **classic** vs **Lovable-inspired UX** on the same GreenByte styles and BFF contract.

| Route | Purpose |
| --- | --- |
| `/demo/plant` | Classic hackathon demo (no login) |
| `/demo/plant/ux` | UX preview — demo login, help, filters, compare, history, mobile nav |

## Demo login (UX route only)

Configure optional overrides in `frontend/.env.local`:

- `VITE_DEMO_PLANT_USERNAME` (default `greenbyte_user`)
- `VITE_DEMO_PLANT_PASSWORD` (default documented in `.env.example`)

Session is stored in `sessionStorage` for the browser tab. The same session unlocks **header links** (UC1 Pasco, UX, UI↔API, Architecture) and all UC1 demo routes via `/demo/sign-in`.

## Deep links

- `?section=dashboard|queue|scheduling|copilot` on the UX route.

## Feature package

`cursor/analysis/features/frontend/uc1-plant-ux-compare/`

Technical blueprint: [uc1-system-blueprint.md](./uc1-system-blueprint.md).
