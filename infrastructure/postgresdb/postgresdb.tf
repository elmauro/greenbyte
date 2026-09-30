module "postgres" {
  source = "../modules/rds-postgres"

  project     = var.project
  environment = var.environment
  aws_region  = var.aws_region
  vpc_id      = var.vpc_id

  database_name   = var.database_name
  master_username = var.master_username
  master_password = var.master_password

  instance_class      = var.instance_class
  publicly_accessible = var.publicly_accessible
  allowed_cidr_blocks = var.allowed_cidr_blocks
  skip_final_snapshot = var.skip_final_snapshot
  deletion_protection = var.deletion_protection

  tags = local.tags
}
