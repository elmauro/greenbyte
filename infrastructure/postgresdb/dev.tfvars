project     = "greenbyte"
environment = "dev"
aws_region  = "us-east-1"

database_name   = "greenbyte"
master_username = "greenbyte_user"

publicly_accessible = true
allowed_cidr_blocks = ["0.0.0.0/0"]

instance_class = "db.t4g.micro"
