# Dominio greenbyte-ag.com en AWS

Guía para servir el frontend en **https://greenbyte-ag.com** con S3 + CloudFront + Route 53 + ACM.

## Prerrequisitos

1. Dominio **greenbyte-ag.com** registrado (Route 53 u otro registrar).
2. AWS CLI y Terraform ≥ 1.9.
3. Frontend compila: `cd frontend && npm install && npm run build`.

## 1. Delegar DNS a Route 53

Si el dominio **no** está en Route 53:

```bash
cd infrastructure/web
terraform init
terraform plan -var-file=dev.tfvars
```

En el primer `apply`, Terraform puede crear la hosted zone. Copia los **4 name servers** del output o de la consola Route 53 y configúralos en tu registrar (GoDaddy, Namecheap, etc.).

Si la zona ya existe en Route 53, asegúrate de que `hosted_zone_name = "greenbyte-ag.com"` en `dev.tfvars` coincide.

## 2. Aplicar infraestructura web

```bash
cd infrastructure/web
terraform init
terraform plan -var-file=dev.tfvars
terraform apply -var-file=dev.tfvars
```

Recursos creados:

- S3 `greenbyte-dev-web` (privado)
- CloudFront con alias `greenbyte-ag.com` y `www.greenbyte-ag.com`
- Certificado ACM (validación DNS automática en la hosted zone)
- Registros A/AAAA alias hacia CloudFront

Captura outputs:

```bash
terraform output web_bucket_name
terraform output cloudfront_distribution_id
terraform output web_url
```

## 3. Desplegar el sitio

### Opción A — Script local (Git Bash)

```bash
export AWS_REGION=us-east-1
./scripts/deploy-frontend.sh
```

### Opción B — GitHub Actions

Repo: [github.com/elmauro/greenbyte](https://github.com/elmauro/greenbyte)

En el environment **`dev`** del repo (Settings → Environments):

| Tipo | Nombre | Valor (dev actual) |
| --- | --- | --- |
| Secret | `AWS_ACCESS_KEY_ID` | IAM user con S3 + CloudFront |
| Secret | `AWS_SECRET_ACCESS_KEY` | … |
| Variable | `AWS_REGION` | `us-east-1` |
| Variable | `WEB_S3_BUCKET` | `greenbyte-dev-web` |
| Variable | `CLOUDFRONT_DISTRIBUTION_ID` | `E38QB192T37GLT` |
| Variable | `CLOUDFRONT_DOMAIN_NAME` | `d3iom2jm2enk07.cloudfront.net` |

Workflow: **Actions → Deploy Web → Run workflow → dev**

## 4. Verificar

```bash
curl -I https://greenbyte-ag.com
```

Debe responder **200** con `index.html` (SPA).

## Notas

- El diseño del sitio está **inspirado** en portales AgTech corporativos (layout Syngenta-like); la marca visible es **GreenByte**, no Syngenta.
- Sin backend desplegado, la landing es estática (ideal para demo del hackathon).
- Coste estimado: ~1–3 USD/mes (S3 + CloudFront con tráfico bajo + hosted zone ~0,50 USD).

## Troubleshooting

Ver [`web-deployment.md`](web-deployment.md).
