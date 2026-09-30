# Terraform remote state (bootstrap)

Creates the **S3 bucket** and **DynamoDB lock table** used by capability stacks (`dynamodb/`, `postgresdb/`, `web/`, …).

This folder uses **local state** on purpose (bootstrap). Every other capability should use `state.tf` + `../backend.dev.hcl`.

## One-time apply

```powershell
cd infrastructure/terraform-state
terraform init
terraform apply -var-file=dev.tfvars
terraform output backend_config_snippet
```

Copy the output into **`infrastructure/backend.dev.hcl`** (or compare with [`backend.dev.hcl.example`](../backend.dev.hcl.example)). See [`../REMOTE-STATE.md`](../REMOTE-STATE.md) for all state keys.

## Then per capability

```powershell
cd infrastructure/postgresdb
terraform init -backend-config=../backend.dev.hcl
terraform plan "-var-file=dev.tfvars" "-var-file=dev.secrets.tfvars"
```

Same pattern for `infrastructure/dynamodb/` with its own state key in `state.tf`.

## Security

- State bucket is private, versioned, encrypted.
- Do not store secrets in state; RDS passwords still belong in `*.secrets.tfvars` or Secrets Manager.
