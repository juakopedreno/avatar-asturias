# Evaluacion de proveedores de avatar hiperrealista

## Criterios de seleccion

- API en tiempo real para conversacion bidireccional.
- Region UE y condiciones DPA claras.
- Politica explicita de no entrenamiento con datos de cliente por defecto.
- SLA empresarial y soporte tecnico.
- Compatibilidad con integracion backend (`REST/WebRTC/WebSocket`).
- Capacidad de fallback a segundo proveedor.

## Candidatos recomendados para evaluacion

1. **D-ID**
   - Fuerte en avatar streaming y API.
   - Adecuado para time-to-market.
2. **HeyGen Interactive Avatar**
   - Buen nivel visual y APIs de interaccion.
   - Validar latencia real y terminos de uso de datos.
3. **Hour One**
   - Orientacion enterprise y gobernanza.
4. **Synthesia**
   - Fuerte en video pregrabado; validar ajuste para interaccion en vivo.

## Recomendacion practica

- Fase inicial: integrar `mock -> D-ID` via `AvatarAdapterService`.
- Fase de robustez: activar segundo proveedor bajo feature flag para continuidad.
