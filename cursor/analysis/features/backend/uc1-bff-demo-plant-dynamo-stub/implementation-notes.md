# Implementation notes — GREENBYTE-003

## Delivered

- **Terraform:** `infrastructure/dynamodb/demo-plant-state.tf`, `outputs.tf`; README table list.
- **Backend:** `core-api` plant demo services (`logic.js`, `stateRepository.js`), five HTTP handlers, `serverless.common.yml` (CORS, IAM, env).
- **Deploy:** `deploy-backend.sh` runs `npm install` in `core-api` before Serverless.
- **Frontend:** BFF polling on `PlantLineMvp`; `api-mocks-and-bff.md` deploy steps.
- **Tests:** `backend/tests/core-api-plant-demo-logic.test.js`.

## Ops runbook

```powershell
cd infrastructure/dynamodb
terraform init -backend-config=../backend.dev.hcl
terraform apply

cd ../../backend
./deploy-backend.sh dev
```

Copy HTTP API URL → `frontend/.env.local` → `VITE_API_BASE_APP`.

## Follow-up

- OpenAPI for `/demo/plant/*`
- Replace stub logic with Camilo replain + David explain HTTP calls
- GitHub Actions IAM for `serverless deploy`
- WebSocket push (optional)
