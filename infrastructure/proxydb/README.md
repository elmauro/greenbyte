# RDS Proxy

Not used for the hackathon.

`greenbyte-dev-postgres` is publicly accessible in the default VPC. The plant-queue Lambda connects to it directly with `pg` over TLS (`infrastructure/postgresdb/`). An RDS Proxy, private subnets, and a NAT gateway would add a standing hourly cost and are not required at this traffic.

Add `aws_db_proxy` here only if the database is moved to private subnets.

