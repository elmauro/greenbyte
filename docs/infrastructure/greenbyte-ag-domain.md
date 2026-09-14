# greenbyte-ag.com domain on AWS

Guide to serve the frontend at **https://greenbyte-ag.com** with S3 + CloudFront + Route 53 + ACM.

## Prerequisites

1. **greenbyte-ag.com** registered (Route 53 or another registrar).
2. AWS CLI and Terraform ≥ 1.9.
3. Frontend builds: `cd frontend && npm install && npm run build`.

## 1. Delegate DNS to Route 53

If the domain is **not** in Route 53:

```bash
cd infrastructure/web
terraform init
terraform plan -var-file=dev.tfvars
```

On the first `apply`, Terraform may create the hosted zone. Copy the **4 name servers** from the output or Route 53 console and configure them at your registrar (GoDaddy, Namecheap, etc.).

If the zone already exists in Route 53, ensure `hosted_zone_name = "greenbyte-ag.com"` in `dev.tfvars` matches.

## 2. Apply web infrastructure

```bash
cd infrastructure/web
terraform init
terraform plan -var-file=dev.tfvars
terraform apply -var-file=dev.tfvars
```

Resources created:

- S3 `greenbyte-dev-web` (private)
- CloudFront with aliases `greenbyte-ag.com` and `www.greenbyte-ag.com`
- ACM certificate (automatic DNS validation in the hosted zone)
- A/AAAA alias records to CloudFront

Capture outputs:

```bash
terraform output web_bucket_name
terraform output cloudfront_distribution_id
terraform output web_url
```

## 3. Deploy the site

### Option A — Local script (Git Bash)

```bash
export AWS_REGION=us-east-1
./scripts/deploy-frontend.sh
```

### Option B — GitHub Actions

Repo: [github.com/elmauro/greenbyte](https://github.com/elmauro/greenbyte)

In the repo **`dev`** environment (Settings → Environments):

| Type | Name | Value (current dev) |
| --- | --- | --- |
| Secret | `AWS_ACCESS_KEY_ID` | IAM user with S3 + CloudFront |
| Secret | `AWS_SECRET_ACCESS_KEY` | … |
| Variable | `AWS_REGION` | `us-east-1` |
| Variable | `WEB_S3_BUCKET` | `greenbyte-dev-web` |
| Variable | `CLOUDFRONT_DISTRIBUTION_ID` | `E38QB192T37GLT` |
| Variable | `CLOUDFRONT_DOMAIN_NAME` | `d3iom2jm2enk07.cloudfront.net` |

**Automatic CI:** every push to `master` that touches `frontend/**` triggers **Deploy Web** → `dev` environment.

Manual deploy: **Actions → Deploy Web → Run workflow → dev**

## 4. Verify

```bash
curl -I https://greenbyte-ag.com
```

Should return **200** with `index.html` (SPA).

## Notes

- Site design is **inspired by** corporate AgTech portals (Syngenta-like layout); visible brand is **GreenByte**, not Syngenta.
- Without a deployed backend, the landing is static (ideal for hackathon demo).
- Estimated cost: ~$1–3/month (S3 + CloudFront with low traffic + hosted zone ~$0.50).

## Troubleshooting

See [`web-deployment.md`](web-deployment.md).
