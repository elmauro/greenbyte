# Security Baseline - GreenByte

## Secrets

- Do not commit real `.env` files, tokens, private keys or Terraform variable files with secrets.
- Use AWS SSM Parameter Store or Secrets Manager for sensitive values.
- Rotate credentials when a team member leaves or a secret may have leaked.

## AWS

- Use least-privilege IAM policies.
- Keep S3 buckets private by default.
- Enable encryption at rest for databases, buckets and queues.
- Configure CloudWatch log retention explicitly.
- Protect Terraform state with encryption and locking.

## Web

- Restrict CORS to known origins per environment.
- Use HTTPS only.
- Avoid storing long-lived secrets in the browser.
- Validate all backend inputs, even if the frontend validates them.

## Review checklist

- Are new secrets documented but not committed?
- Are new public endpoints intentional?
- Are IAM permissions scoped to the minimum required?
- Are logs useful without exposing sensitive data?

