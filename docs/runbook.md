# Runbook - GreenByte

## Ownership

Owner team: `greenbyte-hackathon`

## Deploy

Frontend web:

1. Create infrastructure in `infrastructure/web`.
2. Configure GitHub environment with Terraform outputs.
3. Run the `Deploy Web` workflow (or push to `master` with frontend changes).
4. Open the CloudFront URL or https://greenbyte-ag.com.

See `docs/infrastructure/web-deployment.md` and `docs/infrastructure/greenbyte-ag-domain.md`.

## Rollback

Document rollback strategy per component.

## Operational checks

- Frontend available.
- API healthcheck responds.
- Logs without critical errors.
- Alarms reviewed.
