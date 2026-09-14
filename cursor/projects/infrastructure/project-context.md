# Infrastructure Context - GreenByte

## Overview

Infraestructura AWS para `GreenByte`.

## Stack

- Terraform
- AWS
- Cognito cuando se requiere autenticacion
- S3 + CloudFront para frontend web
- Lambda + API Gateway para APIs serverless

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

- Todo cambio Terraform debe tener plan revisable.
- Separar variables por ambiente.
- No commitear `terraform.tfvars` con secretos.
- Preferir modulos reutilizables para recursos comunes.
- Documentar dependencias entre frontend, backend e infraestructura.

