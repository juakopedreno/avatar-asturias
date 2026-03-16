# Checklist de demo tecnica

- [ ] Web de usuario funcionando con chat y voz.
- [ ] Panel admin autenticado con MFA.
- [ ] Contenidos cargados y actualizables.
- [ ] Fuentes sincronizables y trazables.
- [ ] Preguntas respondidas con fuentes.
- [ ] Evidencia de auditoria por accion admin.
- [ ] Simulacion de sesion de avatar hiperrealista via adapter.
- [ ] Export de datos/configuracion/logs en formato estandar.
- [ ] Bloque de visibilidad PRTR/NextGenerationEU visible en canal ciudadano y admin.
- [ ] Enlace "Sobre esta aplicacion" disponible hacia informacion PRTR.

## Checklist UAT hardening real

- [ ] Migraciones aplicadas desde cero con `db:deploy` y seed validado.
- [ ] Login con MFA admin devuelve `accessToken` + `refreshToken`.
- [ ] Refresh rotativo invalida token anterior y genera uno nuevo.
- [ ] Rutas sensibles (`content`, `sources`, `training`, `users-roles`, `audit`) bloquean roles no permitidos.
- [ ] Endpoint `GET /api/avatar/provider-health` operativo (HeyGen o fallback mock).
- [ ] Ingesta `pdf/web/api` crea `IngestionJob`, `SourceDocument` y `KnowledgeChunk`.
- [ ] `POST /api/rag/ask` devuelve citas con `sourceLabel` y `updatedAt`.
- [ ] Panel admin muestra proveedor avatar activo y jobs de ingesta.
