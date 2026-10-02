# Dev engineer IAM users (GreenByte)

Creates **console + programmatic (CLI) access** for HatchWorks developers with:

- Broad ability to create/update/delete **application** resources (Lambda, API Gateway, DynamoDB, S3, CloudWatch, etc.).
- **No** IAM user/group/role **administration** (cannot create admin or normal users, attach admin policies, etc.).
- **Guardrails** where IAM supports them (instance types, RDS classes, regions) — not a substitute for **Budgets** and review.

## Users (configured in `terraform.tfvars`)

| Email | IAM user name (default) |
| --- | --- |
| `camilo.restrepo@hatchworks.com` | same as email (valid IAM name) |
| `david.berrio@hatchworks.com` | same as email |

## Prerequisites

- Terraform ≥ 1.5, AWS CLI configured with **account admin** (or IAM admin) credentials.
- Decide **allowed region(s)** — default `us-east-1` only in cost policy.

## Apply

```powershell
cd infrastructure/iam-dev-engineers
copy terraform.tfvars.example terraform.tfvars
# edit if needed
terraform init
terraform plan
terraform apply
```

## After apply — credentials for each developer

Terraform **does not** store access keys in state if you create them manually (recommended):

1. **Console:** IAM → Users → user → **Security credentials** → **Assign MFA** (recommended) → **Enable console access** if not already (Terraform sets initial password; user must change on first login).
2. **CLI access keys:** Each user signs in to console (or you create once as admin): **Create access key** → **CLI** → they run `aws configure` locally.

Alternatively, admin runs once per user (keys shown only once):

```powershell
aws iam create-access-key --user-name "camilo.restrepo@hatchworks.com"
```

Developers should **not** share keys; rotate if leaked.

## Policy model

| Attachment | Purpose |
| --- | --- |
| AWS managed **`PowerUserAccess`** | Full access to AWS services **except** IAM/user/org admin (AWS-maintained baseline). |
| **`greenbyte-dev-deny-iam-admin`** | Explicit **Deny** on IAM **identity** admin (users, groups, customer-managed policies). **Does not** block Lambda execution roles — see **`greenbyte-dev-allow-serverless-iam`**. |
| **`greenbyte-dev-cost-guardrails`** | **Deny** selected expensive actions / SKUs (EC2/RDS instance sizes, other regions, etc.). |
| **`greenbyte-dev-allow-serverless-iam`** | **Allow** `iam:CreateRole`, `PassRole`, etc. on `greenbyte-*` roles only (PowerUser excludes most `iam:*`). |

**PowerUserAccess** plus the deny policy above allows **Serverless / Lambda deploy** (execution roles, `iam:PassRole`, CloudFormation stacks). It does **not** allow creating IAM users or attaching admin policies.

### Deploy Lambdas (Serverless)

From repo root, with CLI profile for your IAM user (`us-east-1`):

```powershell
cd backend
./deploy-backend.sh dev
```

Details: [`backend/core-api/README.md`](../../backend/core-api/README.md). Optional env vars (`DATABASE_URL`, etc.) are documented there.

## Limits (honest)

- IAM **cannot** enforce “always pick the cheapest option” inside a service (e.g. every Lambda memory size). Guardrails block **known expensive** resource classes; **AWS Budgets** + alerts should cap spend.
- Some services have **no** useful `Condition` keys for cost — review in console or Cost Explorer.
- **Account root** and **IAM admins** remain separate; these users must not receive `AdministratorAccess`.

## Remove access

```powershell
terraform destroy
```

Then delete any remaining access keys in console if users were created outside Terraform.

## Related

- [PowerUserAccess](https://docs.aws.amazon.com/aws-managed-policy/latest/reference/PowerUserAccess.html)
- GreenByte Terraform: `infrastructure/REMOTE-STATE.md`
