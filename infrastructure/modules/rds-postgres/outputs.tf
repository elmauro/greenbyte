output "endpoint" {
  description = "RDS connection hostname (without port)."
  value       = aws_db_instance.this.address
}

output "port" {
  value = aws_db_instance.this.port
}

output "database_name" {
  value = aws_db_instance.this.db_name
}

output "master_username" {
  value = aws_db_instance.this.username
}

output "instance_identifier" {
  value = aws_db_instance.this.identifier
}

output "security_group_id" {
  value = aws_security_group.postgres.id
}

output "connection_url_hint" {
  description = "Non-secret JDBC-style hint (password omitted)."
  value       = "postgresql://${aws_db_instance.this.username}@${aws_db_instance.this.address}:${aws_db_instance.this.port}/${aws_db_instance.this.db_name}"
}
