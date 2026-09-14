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

## Rules

- Every Terraform change must have a reviewable plan.
- Separate variables by environment.
- Do not commit `terraform.tfvars` with secrets.
- Prefer reusable modules for common resources.
- Document dependencies between frontend, backend and infrastructure.
