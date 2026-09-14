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

variable "price_class" {
  description = "CloudFront price class."
  type        = string
  default     = "PriceClass_100"
}

variable "domain_name" {
  description = "Optional custom domain name for the web site, for example example.com."
  type        = string
  default     = ""
}

variable "hosted_zone_name" {
  description = "Route 53 hosted zone name used for DNS records and ACM validation. Leave empty to use domain_name."
  type        = string
  default     = ""
}

variable "create_www_alias" {
  description = "Whether to also create and attach the www.<domain_name> alias."
  type        = bool
  default     = false
}

locals {
  custom_domain_enabled = trimspace(var.domain_name) != ""
  hosted_zone_name      = trimspace(var.hosted_zone_name) != "" ? trimspace(var.hosted_zone_name) : trimspace(var.domain_name)
  web_domain_names      = local.custom_domain_enabled ? compact(concat([trimspace(var.domain_name)], var.create_www_alias ? ["www.${trimspace(var.domain_name)}"] : [])) : []

  tags = {
    Project     = var.project
    Environment = var.environment
  }
}
