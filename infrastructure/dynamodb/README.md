# DynamoDB

Tables, seed data and scripts for DynamoDB-backed capabilities.

Remote state: **`state.tf`** → S3 key `dynamodb/terraform.tfstate` (see `../backend.dev.hcl`).

```powershell
cd infrastructure/dynamodb
terraform init -backend-config=../backend.dev.hcl
terraform plan -var-file=dev.tfvars   # add dev.tfvars when needed
```

Bootstrap the state bucket first: `../terraform-state/README.md`.

## Suggested files

- `<table>.tf`
- `<table>.json`
- `seed-and-log.bat` or shell equivalent

