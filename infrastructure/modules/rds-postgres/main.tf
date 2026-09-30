data "aws_vpc" "selected" {
  default = var.vpc_id == ""
  id      = var.vpc_id != "" ? var.vpc_id : null
}

data "aws_subnets" "db" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.selected.id]
  }
}

resource "aws_db_subnet_group" "this" {
  name       = "${var.project}-${var.environment}-postgres"
  subnet_ids = data.aws_subnets.db.ids

  tags = merge(var.tags, {
    Name = "${var.project}-${var.environment}-postgres"
  })
}

resource "aws_security_group" "postgres" {
  name        = "${var.project}-${var.environment}-postgres"
  description = "PostgreSQL access for ${var.project} ${var.environment}"
  vpc_id      = data.aws_vpc.selected.id

  ingress {
    description = "PostgreSQL from allowed CIDRs"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "${var.project}-${var.environment}-postgres"
  })
}

resource "aws_db_instance" "this" {
  identifier = "${var.project}-${var.environment}-postgres"

  engine         = "postgres"
  engine_version = var.engine_version
  instance_class = var.instance_class

  allocated_storage     = var.allocated_storage_gb
  max_allocated_storage = var.allocated_storage_gb * 2
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = var.database_name
  username = var.master_username
  password = var.master_password
  port     = 5432

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.postgres.id]
  publicly_accessible    = var.publicly_accessible

  backup_retention_period = var.backup_retention_period
  skip_final_snapshot     = var.skip_final_snapshot
  deletion_protection     = var.deletion_protection
  apply_immediately       = var.environment == "dev"

  auto_minor_version_upgrade = true
  copy_tags_to_snapshot      = true

  tags = merge(var.tags, {
    Name = "${var.project}-${var.environment}-postgres"
  })
}
