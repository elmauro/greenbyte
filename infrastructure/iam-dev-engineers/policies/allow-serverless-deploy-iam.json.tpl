{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ServerlessGreenbyteExecutionRoles",
      "Effect": "Allow",
      "Action": [
        "iam:CreateRole",
        "iam:DeleteRole",
        "iam:GetRole",
        "iam:PassRole",
        "iam:PutRolePolicy",
        "iam:DeleteRolePolicy",
        "iam:AttachRolePolicy",
        "iam:DetachRolePolicy",
        "iam:UpdateAssumeRolePolicy",
        "iam:TagRole",
        "iam:UntagRole",
        "iam:ListRolePolicies",
        "iam:GetRolePolicy"
      ],
      "Resource": "arn:aws:iam::${account_id}:role/greenbyte-*"
    }
  ]
}
