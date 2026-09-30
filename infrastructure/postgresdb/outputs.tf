output "postgres_endpoint" {
  description = "RDS hostname for psql / JDBC."
  value       = module.postgres.endpoint
}

output "postgres_port" {
  value = module.postgres.port
}

output "postgres_database_name" {
  value = module.postgres.database_name
}

output "postgres_username" {
  value = module.postgres.master_username
}

output "postgres_connection_url_hint" {
  value = module.postgres.connection_url_hint
}
