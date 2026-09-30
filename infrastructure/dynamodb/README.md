# DynamoDB

Tables, seed data and scripts for DynamoDB-backed capabilities.

Remote state: **`state.tf`** → S3 key `dynamodb/terraform.tfstate` (see `../backend.dev.hcl`).

```powershell
cd infrastructure/dynamodb
terraform init -backend-config=../backend.dev.hcl
terraform plan -var-file=dev.tfvars   # add dev.tfvars when needed
```

Bootstrap the state bucket first: `../terraform-state/README.md`.

## Tables (dev)

| Table | Purpose |
| --- | --- |
| `greenbyte-dev-app-config` | App config (`pk`) |
| `greenbyte-dev-demo-plant-state` | UC1 BFF stub — queue + `planVersion` per line (`pk` = `LINE#line-1`) |

Outputs after apply: `demo_plant_state_table_name`, `demo_plant_state_table_arn`.

Wire the table name to `core-api` via Serverless env `DEMO_PLANT_TABLE_NAME` (defaults to `greenbyte-${stage}-demo-plant-state`).

## Suggested files

- `<table>.tf`
- `<table>.json`
- `seed-and-log.bat` or shell equivalent

