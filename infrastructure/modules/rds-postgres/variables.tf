variable "project" {
  type = string
}

variable "environment" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "vpc_id" {
  description = "VPC for RDS. Empty string uses the account default VPC."
  type        = string
  default     = ""
}

variable "database_name" {
  description = "Initial PostgreSQL database name (db_name on the instance)."
  type        = string
}

variable "master_username" {
  type = string
}

variable "master_password" {
  type      = string
  sensitive = true
}

variable "instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "allocated_storage_gb" {
  type    = number
  default = 20
}

variable "engine_version" {
  type    = string
  default = "16"
}

variable "publicly_accessible" {
  description = "When true, RDS gets a public IP (requires subnets with IGW routes — default VPC subnets qualify)."
  type        = bool
  default     = false
}

variable "allowed_cidr_blocks" {
  description = "IPv4 CIDRs allowed to connect on port 5432. Restrict in production."
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

variable "backup_retention_period" {
  type    = number
  default = 1
}

variable "tags" {
  type    = map(string)
  default = {}
}
