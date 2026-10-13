# Fase 3 — Viajeros y asignaciones de habitación por viaje

**Estado:** Completa en la rama `feature/on-demand-loading-phase-3` (desde `main` 55c76df), verificada en local; falta el PR
**Dependencia:** Fase 2 (los conteos de los listados ya no usan el store)
**Migración:** No

---

## Avance

- [x] 1. `travelerKeys` + `travelersByTravelQuery(travelId)` → `{ travelers, roomAssignments }`, coordinadores incluidos (52de675)
- [x] 2. Escrituras invalidan `travelerKeys.root`; alta y baja también `travelKeys.root` (cambia `travelerCount`); `addTravel`/`updateTravel` con `coordinatorIds` invalidan viajeros (el trigger `travel_coordinators_create_traveler` crea su fila) (e129df4)
- [x] 3. Lecturas
  - a. Badge de la pestaña "Viajeros" → `travel.travelerCount` del detalle (5673745)
  - b. `travel-access-code-card` + `selectPayingTravelers()` en `use-traveler-domain` (69d2497)
  - c. `travel-payments-panel`, con estados de carga y error (87f3c3d)
  - d. `optional-services` (occupants, con carga/error) y `edit.vue` (ya no recarga viajeros: lo cubre la invalidación) (a03869f)
  - e. `cotizacion-bus-form`: asiento máximo ocupado desde la query; al editar no guarda mientras no hay viajeros (5cef064)
  - f. `quotation-parameters-card`: coordinadores sentados con `queryCache.fetch(queryCache.ensure(...))`; si falla, no sigue (af418fd)
  - g. `cotizacion-precio-publico-section`: nombres de viajeros por id desde la query (3129f48)
  - h. `habitaciones`: occupants por habitación y hoteles por viajero desde las asignaciones de la query, con carga/error (7a7291c)
  - i. `travelers/index`: filtros pasan del store a la página; "Nuevo viajero" deshabilitado hasta tener viajeros; carga/error (087270e)
- [x] 4. `/payments/traveler/[id]`: `fetchById` + `travelerDetailQuery`; redirige solo si la query resuelve `null` (cfdbc8f)
- [x] 5. Fuera `travelerStore.fetchAll()` del plugin; el store queda solo con las escrituras (`loading`, `error` y 8 acciones); fuera `fetchAll`/`fetchRoomAssignments` del repositorio (c1b3c65)

### Hallazgos

- **Dos pantallas dependían de `fetchAll` sin saberlo:** `travel-payments-panel` y `habitaciones` leían
  el store sin llamar nunca a `fetchByTravel`. Con solo quitar el `fetchAll` se habrían quedado vacías.
- **"Mover viajero entre viajes" no existe en la app:** `TravelerForm` siempre recibe
  `locked-travel-id`. Igual queda cubierto: toda escritura invalida la raíz `['travelers']`.
- **Estado vacío que miente:** antes los datos ya estaban cargados al llegar a la pantalla; ahora
  cada pantalla pide los suyos, así que cada una distingue cargando / error / vacío
  (`status === 'pending' && !data` → spinner; `error` → Reintentar).
- **Protecciones que dependen de los viajeros** (unidad más chica que el asiento ocupado,
  coordinadores sentados): sin datos no se escribe. En el formulario de autobús, un clic en
  Guardar sin datos avisa y vuelve a pedirlos; en parámetros de cotización, el `fetch` lanza y se aborta.
- **`deleteTraveler` llama siempre a `unlinkCompanions`:** ya no hay arreglo para saber si tenía
  acompañantes; el UPDATE por `representative_id` no toca filas cuando no los hay.
- La query de un viaje devuelve todos sus viajeros (coordinadores incluidos). Cada pantalla elige:
  `selectPayingTravelers()` para pagos, grupos y conteos; la lista completa para asientos,
  habitaciones y servicios por persona.

---

## Objetivo

Eliminar `travelerStore.fetchAll()` (todos los viajeros + todas las
`traveler_room_assignments` de la cuenta) y cargar viajeros **solo del viaje abierto**.
Es la colección que primero llega al corte de 1000 filas.

---

## Situación anterior

- `fetchAll()` se llamaba al arrancar.
- `fetchByTravel(id)` ya existía y hacía merge en el arreglo global para no pisar viajeros de
  otros viajes — es exactamente lo que una clave de Colada hace gratis.
- Pantallas que llamaban `fetchByTravel`: `travels/[id]/travelers`, `travels/[id]/edit`,
  `travels/[id]/optional-services`, `travel-access-code-card`, `quotation-parameters-card`,
  `cotizacion-bus-form`.
- Lecturas por viaje (`getTravelersByTravel` y compañía) en `travels/[id].vue` (badge de la
  pestaña), `travel-payments-panel`, `habitaciones`, `travel-access-code-card`,
  `cotizacion-precio-publico-section` (por id) y `/payments/traveler/[id]` (por id).

---

## Pasos

1. Query `travelersByTravelQuery(travelId)` que devuelve viajeros y asignaciones juntos (como el
   `Promise.all` de `fetchByTravel`).
2. Escrituras (antes que las lecturas, para que cada pantalla migrada quede fresca):
   invalidar `travelerKeys.root` y, cuando cambia el conteo, `travelKeys.root`.
3. Migrar las lecturas a `useQuery`, pantalla por pantalla, con estados de carga y error.
4. `/payments/traveler/[id]`: cargar el viajero por id.
5. Quitar `travelerStore.fetchAll()` del plugin y lo que quede sin uso en store y repositorio.

---

## Verificación (2026-10-12, local, playwright-cli, viaje de prueba `ff000000-…-0001`)

- [x] Abrir un viaje: una petición de `travelers` y una de `traveler_room_assignments`, ambas
  con `travel_id=eq.…`; ninguna petición de todos los viajeros al arrancar.
- [x] Pestaña Viajeros: estadísticas 3/2/1 iguales a SQL, badge 3, tarjeta de coordinadores,
  mapa de asientos con la coordinadora en el 44.
- [x] Alta de viajero → estadística y badge a 4 sin recargar (se piden de nuevo viajeros y
  detalle del viaje); cambio de asiento 10 → 11; baja con confirmación → de vuelta a 3.
- [x] Habitaciones: 20 / 3 / 1 iguales a SQL; asignar y quitar habitación actualiza la tarjeta y
  "Personas sin habitación".
- [x] Servicios por persona: viajeros + coordinadora; Pagos del viaje: tabla con filas.
- [x] Formulario de autobús: la unidad de 40 asientos sale bloqueada (asiento 44 ocupado); con la
  petición de viajeros en 500, Guardar avisa, no escribe y vuelve a pedirlos.
- [x] `/payments/traveler/[id]`: carga por id; id inexistente → `/payments`; 500 → Reintentar.
- [x] Con 500 en la petición de viajeros, cada pantalla muestra "No se pudieron cargar los
  viajeros" y Reintentar la recupera.
- Datos de prueba restaurados (4 filas en `travelers`, 3 asignaciones).
- [ ] Código de acceso del viaje con un viaje publicado (el de prueba no lo está) — en la verificación de la Fase 6.
