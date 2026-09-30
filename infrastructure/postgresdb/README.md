# PostgreSQL (RDS)

Managed PostgreSQL for GreenByte (Pasco UC1 seed, Data API). **Separate Terraform state** in this folder, same pattern as `infrastructure/web/` and `infrastructure/dynamodb/`.

## What it creates

- RDS PostgreSQL instance: identifier `greenbyte-<environment>-postgres`
- Database name: **`greenbyte`** (default)
- Master user: **`greenbyte_user`** (default)
- Security group: TCP **5432** from `allowed_cidr_blocks`
- **Public access** when `publicly_accessible = true` (default in `dev.tfvars.example`) — uses **default VPC** subnets

## Prerequisites

- AWS CLI credentials with permission to create RDS, EC2 security groups, and subnet groups
- Terraform `>= 1.6`
- Region: **`us-east-1`** (see `project.config.json`)

## Deploy (dev)

### 0. Remote state (once per AWS account)

```powershell
cd infrastructure/terraform-state
terraform init
terraform apply -var-file=dev.tfvars
```

Confirm `infrastructure/backend.dev.hcl` matches `terraform output backend_config_snippet`.

### 1. Postgres capability

```powershell
cd infrastructure/postgresdb
terraform init -backend-config=../backend.dev.hcl
```

1. Copy variables (no secrets in git):

   ```powershell
   copy dev.tfvars.example dev.tfvars
   copy dev.tfvars.example dev.secrets.tfvars
   ```

2. Edit **`dev.secrets.tfvars`** — set only:

   ```hcl
   master_password = "YOUR_PASSWORD"
   ```

   (`dev.secrets.tfvars` is **gitignored**.)

3. Optional: restrict access in **`dev.tfvars`**:

   ```hcl
   allowed_cidr_blocks = ["203.0.113.10/32"]  # your public IP
   ```

4. Plan and apply:

   ```powershell
   terraform plan -var-file=dev.tfvars -var-file=dev.secrets.tfvars
   terraform apply -var-file=dev.tfvars -var-file=dev.secrets.tfvars
   ```

5. Read endpoint:

   ```powershell
   terraform output postgres_endpoint
   terraform output postgres_connection_url_hint
   ```

## Connect from your machine

```powershell
psql "host=<endpoint> port=5432 dbname=greenbyte user=greenbyte_user sslmode=require"
```

Or any SQL client (DBeaver, pgAdmin) with **SSL required**.

## Security notes

- **Do not commit** `master_password` or `dev.secrets.tfvars`.
- `0.0.0.0/0` on port 5432 is convenient for hackathon dev only — tighten `allowed_cidr_blocks` when you have a stable IP.
- For production: private subnets, RDS Proxy (`infrastructure/proxydb/`), Secrets Manager rotation — see `infrastructure/modules/ssm-secrets/`.

## Related

- Module: `infrastructure/modules/rds-postgres/`
- UC1 data layer: `backend/docs/api/UC1-SYNGENTA-DEMO-CONTEXT.md` (Camilo · PostgreSQL Pasco seed)
