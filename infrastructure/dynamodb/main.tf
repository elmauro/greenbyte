resource "aws_dynamodb_table" "app_config" {
  name         = "${var.project}-${var.environment}-app-config"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"

  attribute {
    name = "pk"
    type = "S"
  }

  tags = local.tags
}
