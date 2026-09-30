terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    key     = "postgresdb/terraform.tfstate"
    region  = "us-east-1"
    encrypt = true
    # bucket and dynamodb_table: terraform init -backend-config=../backend.dev.hcl
  }
}
