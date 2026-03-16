# Runbook de migraciones Prisma

## Objetivo

Aplicar y validar migraciones de base de datos sin perdida de trazabilidad.

## Prerrequisitos

- Variable `DATABASE_URL` apuntando al entorno correcto.
- Backup reciente de la base (staging/prod).
- `npm install` ejecutado en la raiz del monorepo.

## Flujo en entorno local

1. Generar cliente Prisma:
   - `npm run db:generate -w @avatar/api`
2. Crear/actualizar migracion:
   - `npm run db:migrate -w @avatar/api`
3. Sembrar datos base:
   - `npm run db:seed -w @avatar/api`
4. Verificar esquema:
   - `npm run db:studio -w @avatar/api`

Atajo recomendado:

- `npm run hardening:bootstrap`

## Flujo en staging/produccion

1. Confirmar backup y ventana de despliegue.
2. Desplegar build de API.
3. Ejecutar migraciones no interactivas:
   - `npm run db:deploy -w @avatar/api`
4. Validar health:
   - `GET /api/health/live`
   - `GET /api/health/ready`
5. Validar login y lectura de modulos protegidos.
6. Ejecutar smoke end-to-end:
   - `npm run hardening:smoke`

## Rollback operativo

- Si falla una migracion en despliegue:
  - detener rollout,
  - restaurar backup,
  - abrir incidencia con detalle SQL/stacktrace,
  - preparar migracion correctiva.
