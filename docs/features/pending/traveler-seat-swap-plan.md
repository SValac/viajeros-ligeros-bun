# Plan: cambio e intercambio de asientos de travelers

## Objetivo
Permitir cambiar el asiento de un traveler desde el mapa de asientos.  
Si el asiento destino está ocupado, se debe intercambiar el asiento entre ambos travelers de forma atómica y segura.

## Skills a utilizar
1. `vue-best-practices` — flujo UI en Vue 3 (`<script setup>`, estado predecible, props/emits claros).
2. `nuxt-ui` — adaptación de `UDropdownMenu`, `UAlert`, `UButton`, estados visuales y feedback UX.
3. `pinia` — nueva acción en store para orquestar el cambio/intercambio y sincronizar estado local.
4. `supabase` — RPC SQL para move/swap transaccional, manejo de errores y migraciones.
5. `supabase-postgres-best-practices` — bloqueo de filas (`FOR UPDATE`), validaciones y consistencia concurrente.

## Alcance funcional
- Acción `Cambiar asiento` sobre un asiento ocupado.
- Modo de selección de destino desde el mapa.
- Destino libre: mover traveler.
- Destino ocupado: intercambiar asientos.
- Cancelar operación en curso.
- Mensajes claros de éxito/error.

## Diseño propuesto

### 1) DB (fuente de verdad para swap atómico)
- Crear migración con función RPC (ej. `public.move_or_swap_traveler_seat`).
- Entradas mínimas: `p_traveler_id`, `p_target_seat`, `p_travel_bus_id`.
- Reglas:
  - validar traveler existente y perteneciente al bus indicado.
  - validar asiento destino válido (`> 0`).
  - bloquear filas relevantes con `FOR UPDATE`.
  - si destino ocupado: intercambio atómico usando asiento temporal válido para respetar índice único.
  - si destino libre: mover directo.
- Salida sugerida: payload con tipo de operación (`moved`/`swapped`) y travelers afectados.

### 2) Store (Pinia)
- Agregar acción dedicada (ej. `changeTravelerSeat`).
- Consumir RPC vía Supabase.
- Propagar errores tipados (asiento inválido, traveler no encontrado, conflicto concurrente).
- Actualizar estado local de `travelers` con los registros retornados o recargar viaje al finalizar.

### 3) UI de página de travelers
- En `app/pages/travels/[id]/travelers/index.vue`:
  - agregar estado reactivo de “modo cambio de asiento” (origen, bus, traveler, activo).
  - agregar acción `Cambiar asiento` en menú de asiento ocupado.
  - mostrar aviso contextual mientras el modo está activo.
  - manejar selección de asiento destino y ejecutar store action.
  - mostrar toasts diferenciados para mover/intercambiar/cancelar/error.

### 4) Componente BusSeatMap
- Extender contrato `props/emits`:
  - nuevo modo para seleccionar destino.
  - emitir selección para asiento ocupado y disponible cuando ese modo esté activo.
- Mantener comportamiento actual cuando el modo no esté activo.
- Añadir señal visual del asiento origen y del destino seleccionado.

## Criterios de aceptación
1. No es posible terminar con dos travelers en el mismo asiento.
2. Click en `Cambiar asiento` + selección de asiento libre mueve correctamente.
3. Click en `Cambiar asiento` + selección de asiento ocupado intercambia correctamente.
4. La operación resiste concurrencia (sin estados intermedios inválidos).
5. UX clara: estado activo, cancelar, éxito y errores.

## Validación técnica
- `bun run lint`
- `bun run typecheck`
- `bun run db:reset` (aplica migración y seed sin romper)

## Riesgos y mitigaciones
- **Riesgo:** conflicto por índice único durante swap.  
  **Mitigación:** hacer swap dentro de RPC SQL transaccional con asiento temporal y locks.
- **Riesgo:** desincronización UI tras operación.  
  **Mitigación:** actualizar store con filas retornadas o refrescar `fetchByTravel(travelId)`.
