# UC1 demo plant queue state (BFF stub). Shared across Lambda invocations.
resource "aws_dynamodb_table" "demo_plant_state" {
  name         = "${var.project}-${var.environment}-demo-plant-state"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"

  attribute {
    name = "pk"
    type = "S"
  }

  tags = merge(local.tags, {
    Purpose = "uc1-demo-plant-bff-stub"
  })
}
