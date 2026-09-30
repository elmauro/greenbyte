# rds-postgres

Reusable **Amazon RDS PostgreSQL** module for GreenByte capabilities.

## Inputs

| Variable | Purpose |
| --- | --- |
| `project`, `environment`, `aws_region` | Naming and tags |
| `vpc_id` | Empty → account **default VPC** |
| `database_name`, `master_username`, `master_password` | Instance login |
| `publicly_accessible` | `true` for connections from outside AWS (with SG CIDR rules) |
| `allowed_cidr_blocks` | Who may reach port **5432** |
| `instance_class` | Default `db.t4g.micro` (dev / hackathon) |

## Outputs

`endpoint`, `port`, `database_name`, `master_username`, `connection_url_hint`

## Usage

Consumed by `infrastructure/postgresdb/` (separate Terraform state per capability).
