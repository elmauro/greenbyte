#!/usr/bin/env bash
# Initialize Terraform remote backend for all capabilities with state.tf
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BACKEND="$ROOT/infrastructure/backend.dev.hcl"
CAPS=(dynamodb postgresdb web cognito)

[[ -f "$BACKEND" ]] || { echo "Missing $BACKEND — bootstrap terraform-state first." >&2; exit 1; }

for cap in "${CAPS[@]}"; do
  dir="$ROOT/infrastructure/$cap"
  [[ -f "$dir/state.tf" ]] || { echo "Skip $cap (no state.tf)"; continue; }
  echo "=== init $cap ==="
  (cd "$dir" && terraform init -backend-config="$BACKEND" -reconfigure)
done

echo "Done. Plan/apply per capability README."
