# GreenByte Backend

Backend multi-API serverless para `GreenByte`, alineado con una estructura de APIs separadas, Lambda layers, database, tests e infraestructura compartida.

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

