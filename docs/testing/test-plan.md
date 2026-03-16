# Plan de pruebas

## Tipos de prueba

- Funcionales (API y frontend).
- Integracion (frontend + backend + rag + avatar adapter).
- Carga y rendimiento (latencia de chat y endpoints criticos).
- Seguridad (auth, MFA, validaciones, auditoria).
- UAT (escenarios reales del pliego).

## Casos minimos obligatorios

- Respuesta multilenguaje `ES/EN/FR/DE`.
- Citacion de fuentes y fecha de actualizacion.
- Bloqueo de preguntas fuera de dominio.
- Flujo de login admin + MFA.
- Gestion CRUD de contenidos y fuentes.
- Trazabilidad de eventos de auditoria.

## Evidencias a conservar

- Reportes de test automatizado.
- Capturas de ejecucion de escenarios UAT.
- Registros de carga y errores.
- Version de codigo y fecha de ejecucion.
- Evidencia de visibilidad PRTR en UI (capturas con menciones y logos obligatorios).
- Evidencia de export bundle con integridad (manifest + hash por bloque).
