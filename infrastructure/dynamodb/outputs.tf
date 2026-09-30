output "app_config_table_name" {
  description = "Legacy app config table."
  value       = aws_dynamodb_table.app_config.name
}

output "demo_plant_state_table_name" {
  description = "UC1 BFF stub queue/planVersion state."
  value       = aws_dynamodb_table.demo_plant_state.name
}

output "demo_plant_state_table_arn" {
  description = "IAM resource ARN for core-api Lambda."
  value       = aws_dynamodb_table.demo_plant_state.arn
}
