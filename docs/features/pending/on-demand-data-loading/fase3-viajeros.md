# Fase 3 — Viajeros y asignaciones de habitación por viaje

**Estado:** Pendiente
**Dependencia:** Fase 2 (los conteos de los listados ya no usan el store)
**Migración:** No

---

## Objetivo

Eliminar `travelerStore.fetchAll()` (todos los viajeros + todas las
`traveler_room_assignments` de la cuenta) y cargar viajeros **solo del viaje abierto**.
Es la colección que primero llega al corte de 1000 filas.

---

## Situación actual

- `fetchAll()` (`use-traveler-store.ts:101`) se llama al arrancar.
- `fetchByTravel(id)` (`:125`) ya existe y hace merge en el arreglo global para no pisar
  viajeros de otros viajes — es exactamente lo que una clave de Colada hace gratis.
- Pantallas que ya llaman `fetchByTravel`: `travels/[id]/travelers`, `travels/[id]/habitaciones`,
  `travels/[id]/edit`, `travel-access-code-card`, `quotation-parameters-card`,
  `cotizacion-bus-form`.
- Lecturas por viaje (`getTravelersByTravel`) en `travels/[id].vue` (badge de la pestaña),
  `travel-payments-panel`, `travel-access-code-card`, `travel-calendar-summary` (este último
  ya resuelto en Fase 2 con el conteo embebido).

---

## Pasos

1. Queries `travelerKeys.byTravel(travelId)` y `roomAssignmentKeys.byTravel(travelId)` (o
   una sola query que devuelva ambos, como hoy `fetchByTravel` hace `Promise.all`).
2. Migrar las lecturas a `useQuery`. El badge de la pestaña "Viajeros" puede usar la misma
   query (dedupe) o el conteo del detalle.
3. Escrituras (`addTraveler`, `updateTraveler`, `deleteTraveler`, mover viajero de viaje,
   asignar asiento/habitación) → invalidar `byTravel(travelId)` y, cuando cambia el
   conteo, `['travels', 'list']`. **Mover viajero entre viajes** invalida ambos viajes.
4. `/payments/traveler/[id]`: cargar el viajero por id (si hoy depende del arreglo global).
5. Quitar `travelerStore.fetchAll()` del plugin; quitar `fetchAll`/`fetchRoomAssignments`
   del repositorio si quedan sin uso.

---

## Verificación

- Abrir un viaje: una petición de viajeros y una de asignaciones, filtradas por `travel_id`.
- Asientos y habitaciones (pestañas Autobuses y Habitaciones) se ven y se guardan igual.
- Mover un viajero a otro viaje: desaparece de uno y aparece en el otro sin recargar.
- Código de acceso del viaje: lista de viajeros completa.
