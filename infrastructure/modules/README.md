# Terraform Modules

Modulos reutilizables para infraestructura AWS comun entre proyectos.

## Modulos

| Modulo | Proposito |
| --- | --- |
| `cognito` | User pool y cliente de aplicacion. |
| `static-web` | S3 + CloudFront para frontend estatico. |
| `api-gateway-lambda` | Contrato base para APIs serverless. |
| `dynamodb` | Tablas DynamoDB por dominio. |
| `rds-postgres` | PostgreSQL administrado. |
| `ses` | Configuracion base de email. |
| `ssm-secrets` | Parametros y referencias a secretos. |

## Uso

```hcl
module "auth" {
  source = "../../terraform-modules/cognito"

  project     = var.project
  environment = var.environment
}
```

Versiona estos modulos antes de usarlos en multiples repositorios productivos.

