{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyOutsidePrimaryRegion",
      "Effect": "Deny",
      "NotAction": [
        "iam:*",
        "organizations:*",
        "account:*",
        "support:*",
        "cloudfront:*",
        "route53:*",
        "globalaccelerator:*",
        "budgets:*",
        "ce:*",
        "cur:*",
        "sts:*"
      ],
      "Resource": "*",
      "Condition": {
        "StringNotEquals": {
          "aws:RequestedRegion": "${allowed_region}"
        }
      }
    },
    {
      "Sid": "DenyLargeEc2Instances",
      "Effect": "Deny",
      "Action": "ec2:RunInstances",
      "Resource": "arn:aws:ec2:*:*:instance/*",
      "Condition": {
        "ForAnyValue:StringNotLike": {
          "ec2:InstanceType": [
            "t3.micro",
            "t3.small",
            "t3.medium",
            "t4g.micro",
            "t4g.small",
            "t4g.medium"
          ]
        }
      }
    },
    {
      "Sid": "DenyLargeRdsInstances",
      "Effect": "Deny",
      "Action": [
        "rds:CreateDBInstance",
        "rds:ModifyDBInstance"
      ],
      "Resource": "*",
      "Condition": {
        "ForAnyValue:StringNotLike": {
          "rds:DatabaseClass": [
            "db.t3.micro",
            "db.t3.small",
            "db.t4g.micro",
            "db.t4g.small"
          ]
        }
      }
    },
    {
      "Sid": "DenyExpensiveManagedServices",
      "Effect": "Deny",
      "Action": [
        "sagemaker:CreateNotebookInstance",
        "es:CreateDomain",
        "es:CreateElasticsearchDomain",
        "redshift:CreateCluster",
        "memorydb:CreateCluster",
        "elasticache:CreateReplicationGroup"
      ],
      "Resource": "*"
    }
  ]
}
