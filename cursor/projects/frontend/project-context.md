# Frontend Context - GreenByte

## Overview

Web frontend for `GreenByte`, domain `AgTech — intelligent agriculture and crop data`.

## Stack

- React
- TypeScript
- Vite
- Tailwind CSS

## Expected structure

```text
frontend/
├─ src/
│  ├─ components/
│  ├─ pages/
│  ├─ routes/
│  ├─ services/
│  ├─ types/
│  └─ utils/
├─ docs/
└─ package.json
```

Generated features: `router,services,types,tailwind,msw`

Use `frontend/frontend.config.json` as the source of truth for selected frontend features.

## Rules

- Do not hardcode environment configuration.
- Keep HTTP services in `src/services/`.
- Update types and tests when API contracts change.
- Document routes, critical flows and frontend deployment.
