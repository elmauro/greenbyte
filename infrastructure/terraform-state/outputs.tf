output "state_bucket_name" {
  description = "S3 bucket for Terraform remote state (use in backend.dev.hcl)."
  value       = aws_s3_bucket.terraform_state.id
}

output "lock_table_name" {
  description = "DynamoDB table for state locking."
  value       = aws_dynamodb_table.terraform_locks.name
}

output "backend_config_snippet" {
  description = "Values for infrastructure/backend.dev.hcl after bootstrap."
  value       = <<-EOT
    bucket         = "${aws_s3_bucket.terraform_state.id}"
    region         = "${var.aws_region}"
    dynamodb_table = "${aws_dynamodb_table.terraform_locks.name}"
    encrypt        = true
  EOT
}
