# GreenByte Backend

Multi-API serverless backend for `GreenByte`, aligned with separate APIs, Lambda layers, database, tests and shared infrastructure.

## Structure

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

## Generated modules

- APIs: `core-api auth-api`
- Layers: `layer-transversal`

`core-api` is the recommended first domain API. Optional APIs and layers are generated only when selected with generator options.

## Deploy convention

Deploy layers first, then APIs.

The deploy script reads the generated API/layer list embedded at creation time. The selected backend shape is also recorded in `backend.config.json`.

