# Terraform remote state (GreenByte dev)

Shared S3 backend for all capability stacks (except bootstrap).

| Resource | Value |
| --- | --- |
| **Bucket** | `greenbyte-dev-terraform-state` |
| **Lock table** | `greenbyte-dev-terraform-locks` |
| **Region** | `us-east-1` |
| **Backend config file** | [`backend.dev.hcl`](./backend.dev.hcl) |

Bootstrap (once per AWS account): [`terraform-state/README.md`](./terraform-state/README.md).

## State keys (S3)

Each capability uses a **separate state file** under the same bucket:

| Capability folder | S3 key (`state.tf`) | Status |
| --- | --- | --- |
| `dynamodb/` | `dynamodb/terraform.tfstate` | ready |
| `postgresdb/` | `postgresdb/terraform.tfstate` | ready |
| `web/` | `web/terraform.tfstate` | ready |
| `cognito/` | `cognito/terraform.tfstate` | ready |
| `parameters/` | `parameters/terraform.tfstate` | add `state.tf` when stack is wired |
| `secrets/` | `secrets/terraform.tfstate` | add `state.tf` when stack is wired |
| `ses/` | `ses/terraform.tfstate` | add `state.tf` when stack is wired |
| `proxydb/` | `proxydb/terraform.tfstate` | add `state.tf` when stack is wired |

`terraform-state/` keeps **local state** only (creates the bucket and lock table).

## Init any capability (dev)

From repo root:

```powershell
cd infrastructure/<capability>
terraform init "-backend-config=../backend.dev.hcl"
```

If the folder was previously used with **local** state, migrate once:

```powershell
terraform init "-backend-config=../backend.dev.hcl" -migrate-state
```

## Init all remote-ready capabilities

```powershell
./infrastructure/scripts/tf-init-remote-dev.ps1
```

## Credentials

Uses the default AWS credential chain (`~/.aws/credentials`, `AWS_PROFILE`, etc.). Same as RDS deploy.

## Other environments

Copy [`backend.dev.hcl`](./backend.dev.hcl) to `backend.staging.hcl` / `backend.prod.hcl` when you add buckets per environment. Keep **one bucket per environment**; never share state keys across envs with different data.
