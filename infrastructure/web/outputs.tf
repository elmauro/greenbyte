output "web_bucket_name" {
  value = aws_s3_bucket.web.bucket
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.web.id
}

output "cloudfront_domain_name" {
  value = aws_cloudfront_distribution.web.domain_name
}

output "web_url" {
  value = local.custom_domain_enabled ? "https://${local.web_domain_names[0]}" : "https://${aws_cloudfront_distribution.web.domain_name}"
}

output "web_domain_names" {
  value = local.web_domain_names
}

output "acm_certificate_arn" {
  value = local.custom_domain_enabled ? aws_acm_certificate_validation.web[0].certificate_arn : null
}
