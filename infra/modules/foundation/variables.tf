variable "project_name" {
  type        = string
  description = "Nombre del proyecto."
}

variable "environment" {
  type        = string
  description = "Entorno objetivo (dev/staging/prod)."
}

variable "cloud_provider" {
  type        = string
  description = "Proveedor cloud preferido para este despliegue."
  validation {
    condition     = contains(["aws", "azure", "gcp"], var.cloud_provider)
    error_message = "cloud_provider debe ser aws, azure o gcp."
  }
}
