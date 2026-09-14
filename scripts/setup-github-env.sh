#!/usr/bin/env bash
# ONE-TIME setup: GitHub environment dev secrets/vars for Deploy Web workflow.
# Re-running rotates IAM access keys (deletes existing keys for github-greenbyte-deploy).
set -euo pipefail

USER=github-greenbyte-deploy
REPO=elmauro/greenbyte

for id in $(aws iam list-access-keys --user-name "$USER" --query "AccessKeyMetadata[].AccessKeyId" --output text); do
  [ -n "$id" ] && aws iam delete-access-key --user-name "$USER" --access-key-id "$id"
done

KEYS=$(aws iam create-access-key --user-name "$USER" --output json)
AK=$(echo "$KEYS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).AccessKey.AccessKeyId))")
SK=$(echo "$KEYS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).AccessKey.SecretAccessKey))")

gh secret set AWS_ACCESS_KEY_ID --env dev --repo "$REPO" --body "$AK"
gh secret set AWS_SECRET_ACCESS_KEY --env dev --repo "$REPO" --body "$SK"

gh variable set AWS_REGION --env dev --repo "$REPO" --body "us-east-1"
gh variable set WEB_S3_BUCKET --env dev --repo "$REPO" --body "greenbyte-dev-web"
gh variable set CLOUDFRONT_DISTRIBUTION_ID --env dev --repo "$REPO" --body "E38QB192T37GLT"
gh variable set CLOUDFRONT_DOMAIN_NAME --env dev --repo "$REPO" --body "d3iom2jm2enk07.cloudfront.net"

echo "GitHub dev environment configured."
