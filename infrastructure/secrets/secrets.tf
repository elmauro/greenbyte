resource "aws_secretsmanager_secret" "database_url" {
  name = "${var.project}/${var.environment}/database-url"
}
