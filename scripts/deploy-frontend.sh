#!/usr/bin/env bash
# Build + sync frontend to S3 + invalidate CloudFront.
# Requires: AWS CLI, prior terraform apply in infrastructure/web/
#
# Usage:
#   export AWS_PROFILE=default AWS_REGION=us-east-1
#   ./scripts/deploy-frontend.sh
#   ./scripts/deploy-frontend.sh --bucket greenbyte-dev-web --distribution-id E1234567890

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUCKET=""
DIST_ID=""
REGION="${AWS_REGION:-us-east-1}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --bucket) BUCKET="$2"; shift 2 ;;
    --distribution-id) DIST_ID="$2"; shift 2 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$BUCKET" || -z "$DIST_ID" ]]; then
  echo "Reading Terraform outputs (infrastructure/web)..."
  pushd "$ROOT/infrastructure/web" >/dev/null
  terraform init -input=false >/dev/null
  BUCKET="${BUCKET:-$(terraform output -raw web_bucket_name)}"
  DIST_ID="${DIST_ID:-$(terraform output -raw cloudfront_distribution_id)}"
  popd >/dev/null
fi

echo "=== Build frontend ==="
cd "$ROOT/frontend"
npm ci
npm run build

echo "=== Upload s3://$BUCKET ==="
aws s3 sync ./dist/ "s3://$BUCKET/" --delete --region "$REGION"

echo "=== Invalidate CloudFront $DIST_ID ==="
INVALIDATION_ID=$(aws cloudfront create-invalidation \
  --distribution-id "$DIST_ID" \
  --paths "/*" \
  --query 'Invalidation.Id' \
  --output text)
aws cloudfront wait invalidation-completed \
  --distribution-id "$DIST_ID" \
  --id "$INVALIDATION_ID"

echo "=== Done ==="
echo "Site: https://greenbyte-ag.com (when DNS and ACM certificate are ready)"
