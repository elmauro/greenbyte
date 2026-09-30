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

variable "vpc_id" {
  description = "Optional VPC ID. Leave empty to use the default VPC in the region."
  type        = string
  default     = ""
}

variable "database_name" {
  type    = string
  default = "greenbyte"
}

variable "master_username" {
  type    = string
  default = "greenbyte_user"
}

variable "master_password" {
  type      = string
  sensitive = true
}

variable "instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "publicly_accessible" {
  type    = bool
  default = true
}

variable "allowed_cidr_blocks" {
  description = "Restrict to your office/home IP (/32) when possible."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "skip_final_snapshot" {
  type    = bool
  default = true
}

variable "deletion_protection" {
  type    = bool
  default = false
}

locals {
  tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
    Capability  = "postgresdb"
  }
}
