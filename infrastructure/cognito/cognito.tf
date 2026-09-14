resource "aws_cognito_user_pool" "this" {
  name = "${var.project}-${var.environment}-users"

  auto_verified_attributes = ["email"]

  tags = local.tags
}

resource "aws_cognito_user_pool_client" "web" {
  name         = "${var.project}-${var.environment}-web"
  user_pool_id = aws_cognito_user_pool.this.id

  generate_secret = false
}
