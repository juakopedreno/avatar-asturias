# Procedimiento de gestion de incidencias

## Objetivo

Garantizar deteccion, contencion y resolucion con trazabilidad completa.

## Flujo operativo

1. **Deteccion**
   - Alerta automatica o reporte manual.
2. **Registro**
   - Alta de incidente con ID unico y severidad.
3. **Analisis**
   - Diagnostico tecnico y evaluacion de impacto.
4. **Mitigacion**
   - Aplicacion de workaround o rollback controlado.
5. **Resolucion**
   - Validacion funcional y cierre documentado.
6. **Postmortem**
   - Causa raiz, acciones preventivas y responsables.

## SLAs internos propuestos

- Critico: respuesta en < 30 min.
- Alto: respuesta en < 2 h.
- Medio: respuesta en < 8 h.
- Bajo: respuesta en < 24 h.

## Referencias operativas

- Runbook de migraciones: `docs/operations/runbook-migrations.md`
- Runbook de rotacion de claves: `docs/operations/runbook-key-rotation.md`
