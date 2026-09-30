terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Bootstrap: local state only. Do not add an S3 backend here (chicken-and-egg).
}

provider "aws" {
  region = var.aws_region
}
