# Backend Context - GreenByte

## Overview

Backend para `GreenByte`, dominio `AgTech — intelligent agriculture and crop data`.

## Stack

- Node.js 20
- AWS Lambda
- API Gateway
- Terraform para infraestructura

## Expected structure

```text
backend/
├─ <selected-api>/
├─ <selected-layer>/
├─ database/
├─ docs/
├─ tests/
├─ backend.config.json
├─ deploy-backend.sh
└─ package.json
```

Generated APIs: `core-api auth-api`

Generated layers: `layer-transversal`

Use `backend/backend.config.json` as the source of truth for selected APIs and layers.

## Rules

- Separar handlers, servicios y utilidades compartidas.
- Validar inputs en el borde HTTP.
- Mantener errores y respuestas consistentes.
- Documentar endpoints y contratos en `docs/api/`.
- No almacenar secretos en codigo ni archivos versionados.

