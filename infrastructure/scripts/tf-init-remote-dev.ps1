# Initialize Terraform remote backend (greenbyte-dev-terraform-state) for all ready capabilities.
$ErrorActionPreference = "Stop"
$InfraRoot = Split-Path -Parent $PSScriptRoot
$Backend = Join-Path $InfraRoot "backend.dev.hcl"
$Caps = @("dynamodb", "postgresdb", "web", "cognito")

if (-not (Test-Path $Backend)) {
  Write-Error "Missing $Backend — run terraform-state bootstrap first."
}

foreach ($cap in $Caps) {
  $dir = Join-Path $InfraRoot $cap
  if (-not (Test-Path (Join-Path $dir "state.tf"))) {
    Write-Warning "Skip $cap (no state.tf)"
    continue
  }
  Write-Host "`n=== init $cap ===" -ForegroundColor Cyan
  Push-Location $dir
  terraform init "-backend-config=$Backend" -reconfigure
  if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
  Pop-Location
}

Write-Host "`nDone. Plan/apply per capability README." -ForegroundColor Green
