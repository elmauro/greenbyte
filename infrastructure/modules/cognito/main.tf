resource "aws_cognito_user_pool" "this" {
  name = "${var.project}-${var.environment}-users"

  auto_verified_attributes = ["email"]

  tags = {
    Project     = var.project
    Environment = var.environment
  }
}

resource "aws_cognito_user_pool_client" "web" {
  name         = "${var.project}-${var.environment}-web"
  user_pool_id = aws_cognito_user_pool.this.id

  generate_secret = false
}

output "user_pool_id" {
  value = aws_cognito_user_pool.this.id
}

output "user_pool_client_id" {
  value = aws_cognito_user_pool_client.web.id
}
