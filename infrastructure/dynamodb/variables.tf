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
  tags = {
    Project     = var.project
    Environment = var.environment
  }
}
