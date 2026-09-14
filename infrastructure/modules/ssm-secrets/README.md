# ssm-secrets

Contrato para parametros y secretos comunes.

## Inputs esperados

- `project`
- `environment`
- `parameters`
- `secrets`

## Reglas

- No almacenar valores sensibles en archivos versionados.
- Usar `SecureString` o Secrets Manager para secretos.
- Documentar consumidores de cada parametro.

