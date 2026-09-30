#!/usr/bin/env bash
set -euo pipefail

STAGE="${1:-dev}"
REGION="${AWS_REGION:-us-east-1}"

LAYERS=(layer-transversal)
APIS=(core-api auth-api)

for layer in "${LAYERS[@]}"; do
  if [ -f "$layer/serverless.yml" ]; then
    echo "Deploying $layer"
    (cd "$layer" && npx serverless@3 deploy --stage "$STAGE" --region "$REGION")
  fi
done

for api in "${APIS[@]}"; do
  if [ -f "$api/serverless.common.yml" ]; then
    echo "Deploying $api"
    if [ -f "$api/package.json" ]; then
      (cd "$api" && npm install --omit=dev)
    fi
    (cd "$api" && npx serverless@3 deploy --config serverless.common.yml --stage "$STAGE" --region "$REGION")
  fi
done

