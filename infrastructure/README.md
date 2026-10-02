# GreenByte Infrastructure

AWS infrastructure organized by capability, aligned with existing serverless projects.

## Structure

```text
infrastructure/
├─ terraform-state/   # bootstrap: S3 + DynamoDB locks (local state)
├─ backend.dev.hcl    # shared remote backend config for dev capabilities
├─ cognito/
├─ dynamodb/          # state.tf → s3 key dynamodb/terraform.tfstate
├─ parameters/
├─ secrets/
├─ postgresdb/        # state.tf → s3 key postgresdb/terraform.tfstate
├─ proxydb/
├─ ses/
├─ web/
├─ iam-dev-engineers/   # HatchWorks dev IAM (Lambda/Serverless deploy)
└─ scripts/
```

Each capability keeps its own **remote state key**, variables and runbook.

**Remote state reference:** [`REMOTE-STATE.md`](./REMOTE-STATE.md) · bucket **`greenbyte-dev-terraform-state`**.

## Remote state (order)

1. `terraform-state/` — apply once (creates `greenbyte-dev-terraform-state` + lock table).
2. Init capabilities: `../scripts/tf-init-remote-dev.ps1` **or** per folder `terraform init -backend-config=../backend.dev.hcl`.
3. Plan/apply that capability (e.g. `postgresdb/` for RDS).

Capabilities with `state.tf` today: `dynamodb`, `postgresdb`, `web`, `cognito`.
