# Contributing

## Local workflow

1. Read `README.md`, `docs/architecture.md` and the relevant `cursor/projects/*/project-context.md`.
2. Create or update a feature artifact under `cursor/analysis/features/<feature-slug>/`.
3. Keep frontend, backend and infrastructure contracts aligned.
4. Run the checks that apply to the changed areas.

## Checks

```bash
cd frontend && npm run build
cd backend && npm test
cd infrastructure/environments/dev && terraform fmt -check && terraform validate
```

## Security

- Never commit secrets, tokens, private keys or real `.env` files.
- Use SSM Parameter Store or Secrets Manager for sensitive values.
- Document new required configuration in `.env.example` or Terraform variables.

