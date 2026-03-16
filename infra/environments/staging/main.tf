terraform {
  required_version = ">= 1.6.0"
}

module "foundation" {
  source         = "../../modules/foundation"
  project_name   = "avatar-torremolinos"
  environment    = "staging"
  cloud_provider = var.cloud_provider
}
