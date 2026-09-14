# ssm-secrets

Contract for common parameters and secrets.

## Expected inputs

- `project`
- `environment`
- `parameters`
- `secrets`

## Rules

- Do not store sensitive values in versioned files.
- Use `SecureString` or Secrets Manager for secrets.
- Document consumers of each parameter.
