# Runbook - GreenByte

## Ownership

Owner team: `greenbyte-hackathon`

## Deploy

Frontend web:

1. Crear infraestructura en `infrastructure/web`.
2. Configurar GitHub environment con outputs de Terraform.
3. Ejecutar workflow `Deploy Web`.
4. Abrir la URL de CloudFront.

Ver `docs/infrastructure/web-deployment.md`.

## Rollback

Documentar estrategia de rollback por componente.

## Operational checks

- Frontend disponible.
- API healthcheck responde.
- Logs sin errores criticos.
- Alarmas revisadas.

