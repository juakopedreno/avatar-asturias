# Matriz de controles ENS (base)

## Alcance

Base de controles tecnicos orientados a categoria media para evolucion a certificacion formal.

## Controles implementados en esta fase

- **Autenticacion y acceso**
  - Login admin con MFA (flujo inicial en `auth`).
  - Roles base: `admin`, `editor`, `viewer`, `auditor`.
  - Secrets JWT obligatorias sin fallback inseguro en runtime.
- **Trazabilidad**
  - Registro de auditoria en modulo `audit`.
  - Endpoints de salud y estado para supervision.
  - Export bundle firmado con hash por bloque para integridad.
- **Proteccion de datos y minimizacion**
  - Politica en training para evitar uso de consultas de usuario como entrenamiento.
  - Respuesta con incertidumbre si no hay fuente fiable.
  - Retencion automatizada y anonimizado de mensajes de usuario por politica de privacidad.
- **Hardening aplicable**
  - Validacion de entrada con `ValidationPipe`.
  - API documentada y versionada mediante OpenAPI.
  - Cabeceras de seguridad con `helmet` y rate limit con `Throttler`.

## Controles pendientes de completar para auditoria formal

- Cifrado de secretos gestionado por vault/KMS.
- Integracion SIEM y centralizacion de logs.
- Evidencias de pruebas de intrusion y hardening SO.
- Verificacion de restauracion de backups en entorno productivo.
