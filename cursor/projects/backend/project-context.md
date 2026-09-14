# Backend Context - GreenByte

## Overview

Backend for `GreenByte`, domain `AgTech — intelligent agriculture and crop data`.

## Stack

- Node.js 20
- AWS Lambda
- API Gateway
- Terraform for infrastructure

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

- Separate handlers, services and shared utilities.
- Validate inputs at the HTTP edge.
- Keep errors and responses consistent.
- Document endpoints and contracts in `docs/api/`.
- Do not store secrets in code or versioned files.
