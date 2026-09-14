# Frontend Context - GreenByte

## Overview

Frontend web para `GreenByte`, dominio `AgTech — intelligent agriculture and crop data`.

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

- No hardcodear configuracion de ambiente.
- Mantener servicios HTTP en `src/services/`.
- Actualizar tipos y tests cuando cambien contratos API.
- Documentar rutas, flujos criticos y despliegue frontend.

