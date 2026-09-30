# Cognito

User pool and app client for `GreenByte`.

Remote state: `cognito/terraform.tfstate` — [`../REMOTE-STATE.md`](../REMOTE-STATE.md).

```powershell
terraform init -backend-config=../backend.dev.hcl
terraform plan -var-file=dev.tfvars
```

