# Arquitectura del sistema

## Componentes

- `apps/web`: interfaz ciudadana + panel admin.
- `apps/api`: backend NestJS (auth, contenido, fuentes, training, audit, analytics, rag, avatar).
- `packages/shared-types`: contratos compartidos.
- `infra`: base IaC multicloud.

## Flujo principal de conversacion

1. Usuario realiza consulta desde Web/Kiosko/Holobox.
2. API procesa idioma y contexto de sesion.
3. Motor RAG recupera fragmentos relevantes.
4. Orquestador responde con fuentes y fecha de actualizacion.
5. Adapter de avatar renderiza respuesta para canal visual/voz.

## Principios tecnicos

- Separacion por dominios.
- Adaptadores para evitar lock-in de proveedor.
- Trazabilidad completa (eventos de auditoria y fuentes citadas).
- Preparacion para despliegue multicloud.
