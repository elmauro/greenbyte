output "dev_engineer_user_arns" {
  description = "IAM user ARNs for dev engineers."
  value       = { for k, u in aws_iam_user.dev_engineer : k => u.arn }
}

output "console_sign_in_url" {
  description = "Account-specific IAM user sign-in URL (same for all users in the account)."
  value       = "https://${data.aws_caller_identity.current.account_id}.signin.aws.amazon.com/console"
}

output "initial_console_passwords" {
  description = "One-time console passwords (sensitive). Only at first apply; users must change on first login."
  sensitive   = true
  value = var.create_console_login ? {
    for name, profile in aws_iam_user_login_profile.dev_engineer : name => profile.password
  } : {}
}

data "aws_caller_identity" "current" {}
