# Remote state for GreenByte dev capabilities.
# Bucket + lock table from: infrastructure/terraform-state (terraform output backend_config_snippet)

bucket         = "greenbyte-dev-terraform-state"
region         = "us-east-1"
dynamodb_table = "greenbyte-dev-terraform-locks"
encrypt        = true
