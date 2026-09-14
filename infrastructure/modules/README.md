# Terraform Modules

Reusable modules for common AWS infrastructure across projects.

## Modules

| Module | Purpose |
| --- | --- |
| `cognito` | User pool and application client. |
| `static-web` | S3 + CloudFront for static frontend. |
| `api-gateway-lambda` | Base contract for serverless APIs. |
| `dynamodb` | DynamoDB tables by domain. |
| `rds-postgres` | Managed PostgreSQL. |
| `ses` | Base email configuration. |
| `ssm-secrets` | Parameters and secret references. |

## Usage

```hcl
module "auth" {
  source = "../../terraform-modules/cognito"

  project     = var.project
  environment = var.environment
}
```

Version these modules before using them across multiple production repositories.
