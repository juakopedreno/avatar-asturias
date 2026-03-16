# Runbook de rotacion de claves

## Claves cubiertas

- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `ANAM_API_KEY`
- `OPENAI_API_KEY` / `AZURE_OPENAI_API_KEY`

## Politica recomendada

- Rotacion programada cada 90 dias.
- Rotacion inmediata ante incidente o sospecha de fuga.

## Procedimiento

1. Generar nuevas claves en gestor de secretos.
2. Actualizar variables en entorno objetivo (dev/staging/prod).
3. Reiniciar despliegue de `@avatar/api`.
4. Verificar:
   - login y refresh funcionan,
   - `/api/avatar/provider-health` reporta estado esperado,
   - endpoints protegidos responden con RBAC correcto.

## Impacto esperado

- Al rotar `JWT_SECRET` o `JWT_REFRESH_SECRET`, las sesiones activas se invalidan.
- Comunicar ventana de mantenimiento a usuarios administradores.

## Evidencias para auditoria

- Ticket de cambio aprobado.
- Hora de rotacion, responsable y entorno.
- Captura de pruebas funcionales post-rotacion.
