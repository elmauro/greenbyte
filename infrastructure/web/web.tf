resource "aws_s3_bucket" "web" {
  bucket = "${var.project}-${var.environment}-web"

  tags = local.tags
}

resource "aws_s3_bucket_public_access_block" "web" {
  bucket = aws_s3_bucket.web.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "web" {
  bucket = aws_s3_bucket.web.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "web" {
  bucket = aws_s3_bucket.web.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_cloudfront_origin_access_control" "web" {
  name                              = "${var.project}-${var.environment}-web-oac"
  description                       = "OAC for ${var.project} ${var.environment} web bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

data "aws_route53_zone" "web" {
  count = local.custom_domain_enabled ? 1 : 0

  name         = "${trimsuffix(local.hosted_zone_name, ".")}."
  private_zone = false
}

resource "aws_acm_certificate" "web" {
  count = local.custom_domain_enabled ? 1 : 0

  provider                  = aws.us_east_1
  domain_name               = local.web_domain_names[0]
  subject_alternative_names = length(local.web_domain_names) > 1 ? slice(local.web_domain_names, 1, length(local.web_domain_names)) : []
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = local.tags
}

resource "aws_route53_record" "web_certificate_validation" {
  for_each = local.custom_domain_enabled ? {
    for option in aws_acm_certificate.web[0].domain_validation_options : option.domain_name => {
      name   = option.resource_record_name
      record = option.resource_record_value
      type   = option.resource_record_type
    }
  } : {}

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.web[0].zone_id
}

resource "aws_acm_certificate_validation" "web" {
  count = local.custom_domain_enabled ? 1 : 0

  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.web[0].arn
  validation_record_fqdns = [for record in aws_route53_record.web_certificate_validation : record.fqdn]
}

resource "aws_cloudfront_distribution" "web" {
  enabled             = true
  default_root_object = "index.html"
  aliases             = local.web_domain_names
  price_class         = var.price_class
  comment             = "${var.project}-${var.environment}-web"

  origin {
    domain_name              = aws_s3_bucket.web.bucket_regional_domain_name
    origin_id                = "s3-web"
    origin_access_control_id = aws_cloudfront_origin_access_control.web.id
  }

  default_cache_behavior {
    target_origin_id       = "s3-web"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn            = local.custom_domain_enabled ? aws_acm_certificate_validation.web[0].certificate_arn : null
    cloudfront_default_certificate = !local.custom_domain_enabled
    minimum_protocol_version       = local.custom_domain_enabled ? "TLSv1.2_2021" : null
    ssl_support_method             = local.custom_domain_enabled ? "sni-only" : null
  }

  tags = local.tags
}

data "aws_iam_policy_document" "web_bucket" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.web.arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.web.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "web" {
  bucket = aws_s3_bucket.web.id
  policy = data.aws_iam_policy_document.web_bucket.json
}

resource "aws_route53_record" "web_ipv4" {
  for_each = local.custom_domain_enabled ? toset(local.web_domain_names) : []

  zone_id = data.aws_route53_zone.web[0].zone_id
  name    = each.value
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.web.domain_name
    zone_id                = aws_cloudfront_distribution.web.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "web_ipv6" {
  for_each = local.custom_domain_enabled ? toset(local.web_domain_names) : []

  zone_id = data.aws_route53_zone.web[0].zone_id
  name    = each.value
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.web.domain_name
    zone_id                = aws_cloudfront_distribution.web.hosted_zone_id
    evaluate_target_health = false
  }
}
