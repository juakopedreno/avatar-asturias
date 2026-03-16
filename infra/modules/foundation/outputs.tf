output "foundation_id" {
  value       = terraform_data.foundation_metadata.id
  description = "ID de metadata de la fundacion de infraestructura."
}

output "selected_provider" {
  value       = terraform_data.foundation_metadata.input.provider
  description = "Proveedor cloud seleccionado."
}
