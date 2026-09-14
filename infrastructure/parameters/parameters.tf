resource "aws_ssm_parameter" "app_name" {
  name  = "/${var.project}/${var.environment}/app-name"
  type  = "String"
  value = "GreenByte"
}
