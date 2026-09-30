# Infrastructure Context - GreenByte

## Overview

AWS infrastructure for `GreenByte`.

## Stack

- Terraform
- AWS
- Cognito when authentication is required
- S3 + CloudFront for web frontend
- Lambda + API Gateway for serverless APIs

## Expected structure

```text
infrastructure/
├─ environments/
│  ├─ dev/
│  ├─ staging/
│  └─ prod/
└─ README.md
```

## Remote state (dev)

- **Bucket:** `greenbyte-dev-terraform-state` · **Locks:** `greenbyte-dev-terraform-locks`.
- **Config:** `infrastructure/backend.dev.hcl` · **Guide:** `infrastructure/REMOTE-STATE.md`.
- **Bootstrap:** `infrastructure/terraform-state/` (local state only).
- **Init all capabilities:** `infrastructure/scripts/tf-init-remote-dev.ps1`.

Folders with `state.tf`: `dynamodb`, `postgresdb`, `web`, `cognito` (each has its own S3 state key).

## Rules

- Every Terraform change must have a reviewable plan.
- Separate variables by environment.
- Do not commit `terraform.tfvars` with secrets.
- Prefer reusable modules for common resources.
- Document dependencies between frontend, backend and infrastructure.
