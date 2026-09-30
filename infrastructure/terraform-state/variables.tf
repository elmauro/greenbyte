variable "project" {
  type    = string
  default = "greenbyte"
}

variable "environment" {
  type    = string
  default = "dev"
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

locals {
  bucket_name = "${var.project}-${var.environment}-terraform-state"
  lock_table  = "${var.project}-${var.environment}-terraform-locks"

  tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
    Capability  = "terraform-state"
  }
}
