terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

resource "aws_iam_group" "dev_engineers" {
  name = "${var.project_prefix}-dev-engineers"
}

resource "aws_iam_user" "dev_engineer" {
  for_each = toset(var.dev_engineer_emails)
  name     = each.value
  tags = {
    Project = var.project_prefix
    Role    = "dev-engineer"
  }
}

resource "aws_iam_user_group_membership" "dev_engineer" {
  for_each = aws_iam_user.dev_engineer
  user     = each.value.name
  groups   = [aws_iam_group.dev_engineers.name]
}

resource "aws_iam_group_policy_attachment" "power_user" {
  group      = aws_iam_group.dev_engineers.name
  policy_arn = "arn:aws:iam::aws:policy/PowerUserAccess"
}

resource "aws_iam_policy" "self_service" {
  name        = "${var.project_prefix}-dev-self-service-iam"
  description = "Own console password, MFA, and CLI access keys (PowerUser excludes most iam:*)."
  policy      = file("${path.module}/policies/allow-self-service.json")
}

resource "aws_iam_group_policy_attachment" "self_service" {
  group      = aws_iam_group.dev_engineers.name
  policy_arn = aws_iam_policy.self_service.arn
}

resource "aws_iam_policy" "deny_iam_admin" {
  name        = "${var.project_prefix}-dev-deny-iam-admin"
  description = "Block IAM identity administration for dev engineers."
  policy      = file("${path.module}/policies/deny-iam-admin.json")
}

resource "aws_iam_group_policy_attachment" "deny_iam_admin" {
  group      = aws_iam_group.dev_engineers.name
  policy_arn = aws_iam_policy.deny_iam_admin.arn
}

resource "aws_iam_policy" "cost_guardrails" {
  name        = "${var.project_prefix}-dev-cost-guardrails"
  description = "Deny known expensive SKUs and non-primary regions where possible."
  policy = templatefile("${path.module}/policies/cost-guardrails.json.tpl", {
    allowed_region = var.aws_region
  })
}

resource "aws_iam_group_policy_attachment" "cost_guardrails" {
  group      = aws_iam_group.dev_engineers.name
  policy_arn = aws_iam_policy.cost_guardrails.arn
}

resource "aws_iam_user_login_profile" "dev_engineer" {
  for_each = var.create_console_login ? aws_iam_user.dev_engineer : {}

  user                    = each.value.name
  password_length         = 20
  password_reset_required = true

  lifecycle {
    ignore_changes = [password_length, password_reset_required]
  }
}
