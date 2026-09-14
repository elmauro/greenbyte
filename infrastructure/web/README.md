# Web

Static web hosting for the frontend.

Resources:

- S3 bucket
- CloudFront distribution
- CloudFront Origin Access Control
- Private bucket policy for CloudFront access

## Create dev web infrastructure

```bash
terraform init
terraform plan -var-file=dev.tfvars
terraform apply -var-file=dev.tfvars
```

## Outputs

- `web_bucket_name`
- `cloudfront_distribution_id`
- `cloudfront_domain_name`
- `web_url`

Use these outputs as GitHub environment variables for the web deployment workflow.

