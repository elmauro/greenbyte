variable "aws_region" {
  type        = string
  description = "Region allowed for cost guardrails (and provider default)."
  default     = "us-east-1"
}

variable "dev_engineer_emails" {
  type        = list(string)
  description = "IAM user names (use corporate email if desired)."
}

variable "create_console_login" {
  type        = bool
  description = "Create IAM login profile for AWS Console (initial password in apply output)."
  default     = true
}

variable "project_prefix" {
  type    = string
  default = "greenbyte"
}
