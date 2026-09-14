# Cost Baseline - GreenByte

## Purpose

Track expected AWS cost drivers before the project grows.

## Main cost drivers

| Area | Notes |
| --- | --- |
| Frontend hosting | S3, CloudFront, Route 53 and ACM are usually low cost. |
| APIs | Lambda and API Gateway scale with requests. |
| Auth | Cognito depends on monthly active users. |
| Database | RDS is often the largest fixed cost if enabled. |
| Logs | CloudWatch can grow quickly without retention policies. |
| Local/dev resources | Non-production resources should be right-sized or disposable. |

## Guidelines

- Use separate estimates for dev, staging and prod.
- Set CloudWatch retention explicitly.
- Prefer on-demand/serverless resources for early-stage workloads.
- Review NAT Gateway, RDS and always-on compute before enabling them.
- Tag resources with `Project` and `Environment`.

