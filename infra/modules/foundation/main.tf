terraform {
  required_version = ">= 1.6.0"
}

locals {
  name_prefix = "${var.project_name}-${var.environment}"
}

# Base neutra para multicloud.
# En fases posteriores se sustituye por recursos reales de cada proveedor.
resource "terraform_data" "foundation_metadata" {
  input = {
    provider    = var.cloud_provider
    environment = var.environment
    project     = var.project_name
  }
}
