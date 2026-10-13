# Fase 4 — Cotizaciones por viaje

**Estado:** Partida en dos PRs, ambas completas y verificadas en local. **4a** en la rama
`feature/on-demand-loading-phase-4a` (desde `main` 455042b); **4b** en
`feature/on-demand-loading-phase-4b` (desde la 4a, fddce4b). Falta abrir los PRs.
**Dependencia:** Fase 1 (el detalle de viaje ya está en caché); puede ir en paralelo con 2-3
**Migración:** No

---

## 4a — Sin `fetchAll` al arrancar

Antes de quitar el `fetchAll` se revisó quién leía cotizaciones sin pedirlas: solo el panel del
calendario. Todo lo demás ya llamaba `fetchByTravel` (las pestañas de la cotización a través de
`quotations/[id].vue`).

### Avance

- [x] 1. `travel-calendar-summary` pide la cotización del viaje elegido con un `watch` sobre
  `travelId` (el panel no se desmonta al cambiar de viaje) (dd91e6a)
- [x] 2. `_syncSeatPrice` pide el detalle del viaje fresco (`queryCache.fetch`) antes de calcular:
  el precio se guarda en la base y los coordinadores que resta salían de la caché, que sin
  entrada contaba 0. Si falla, no se guarda el precio y el error llega al toast de la pantalla.
  `syncSeatPriceForTravel` devuelve `false` en ese caso y la edición del viaje avisa (d3224d8)
- [x] 3. Fuera `cotizacionStore.fetchAll()` del plugin, del store y del repositorio; fuera el
  getter `hasQuotation`, sin uso (fb7d538)

### Hallazgos

- **El precio por asiento del seed (1524) estaba desactualizado:** con los datos del viaje de
  prueba el cálculo da 3015 ((44,000 autobús + 6,300 gastos) / 20 + 500 por persona). Cualquier
  guardado lo corrige; en la verificación se regresó a 1524.
- **Los errores de Supabase no son `Error`:** el `catch` de las acciones muestra "Error
  desconocido". Para el precio por asiento se lanza un mensaje propio; el resto queda igual
  (pasa en toda la app).
- **`/quotations/[id]` se queda en blanco si falla el detalle del viaje** (sin spinner ni
  Reintentar). Se arregla en la 4b, cuando la cotización también pase a `useQuery`.

### Verificación (2026-10-12, local, playwright-cli, viaje de prueba `ff000000-…-0001`)

- [x] Carga completa de `/calendar?viaje=…`: ninguna petición de todas las cotizaciones; una de
  `quotations?travel_id=eq.…`; el panel muestra "3 de 43 lugares".
- [x] Parámetros → Guardar con la petición del detalle del viaje en 500: toast "No se pudo
  recalcular el precio por asiento porque no cargó el viaje", `seat_price` sin cambios en SQL.
- [x] Sin el 500: `seat_price` = 3015, igual al cálculo a mano. Con un gasto pasado a "total"
  da 2962, que corresponde a 43 asientos vendibles (44 − la coordinadora; con 0 daría 2961).
- Datos de prueba restaurados (`seat_price` 1524, gasto en "minimum").

---

## 4b — Cotización en Colada y sin puentes al viaje

### Decisión: Colada decide cuándo pedir, el store guarda la copia

`quotationByTravelQuery(travelId)` envuelve `repository.fetchByTravel` y, cada vez que pide,
**copia el resultado al store** (`hydrateTravel`). Los ~45 getters y ~30 acciones de escritura
siguen trabajando sobre esa copia, así que las ~25 pantallas no cambiaron cómo leen.

Se descartó que todo leyera directo de la query (como viajeros en la Fase 3): los getters y
las validaciones de las escrituras buscan por id de proveedor, pago, hospedaje o autobús, sin
saber el viaje, y habría que reescribir el store completo y todas las pantallas que lo usan.
Lo que se buscaba en esta fase sí se consigue: no hay caché a mano, las peticiones iguales
se juntan, la cotización se vuelve a pedir al regresar a la pestaña del navegador, y después
de cada escritura.

- **Solo la petición vigente escribe en el store:** una invalidación aborta la petición en
  vuelo (`signal.aborted`); su resultado podría ser de antes de la escritura.
- **Las escrituras invalidan en el `finally`:** también cuando la escritura entró a la base
  pero algo posterior falló (por ejemplo, recalcular el precio por asiento). La query vuelve a
  pedir la cotización y el store queda igual que el servidor.
- **El store y la caché viven lo mismo:** el logout recarga la página. Si un día deja de
  hacerlo, hay que vaciar los dos juntos.

### Avance

- [x] 1. `quotationKeys` + `quotationByTravelQuery`; `fetchByTravel` pasa por la caché
  (`refresh`; `force` = `fetch`); fuera `travelFetchCache`/`travelFetchInFlight`. Las 32
  escrituras invalidan `['quotations']`; alta/baja de viajeros y habitaciones del viaje también
  (la base recalcula lo que se le debe a cada servicio por persona y el costo de cada hotel).
  `_deleteRooms` invalida el detalle del viaje directo, sin pasar por el store de viajes (404b839)
- [x] 2. `getAsientosVendibles` y los getters que dependen de él reciben `coordinatorCount`;
  las pantallas lo leen de `travelDetailQuery` (`useTravelCoordinatorCount`). Fuera
  `getRoomCountsByQuotation`: hospedaje cuenta las habitaciones del detalle del viaje. El store
  de cotizaciones ya no lee la caché del viaje (58e3fc4)
- [x] 3. Las pantallas montan la query con `useQuery` en lugar de llamar `fetchByTravel` al
  montar. Spinner y "No se pudo cargar la cotización" + Reintentar donde la falta de cotización
  mentiría (la cotización, Autobuses, Habitaciones y Servicios opcionales del viaje).
  `/quotations/[id]` muestra error + Reintentar si falla el viaje (antes se quedaba girando).
  `/payments/traveler/[id]` sigue cargando una cotización por viaje con `fetchByTravel` (dbfff9f)

### Hallazgos

- **Un error en un refetch no tapa la pantalla:** los estados de error se muestran solo si nunca
  hubo datos (`status === 'error' && data === undefined`). Si falla el refetch al regresar a la
  pestaña, se queda lo que ya se veía.
- **Un cambio externo no recalcula el precio por asiento:** si otro usuario cambia un gasto, aquí
  se ve el gasto nuevo, pero el `seat_price` guardado solo cambia con la siguiente escritura de
  la cotización (igual que antes; el precio lo calcula el cliente).
- **`refreshProviderPayableCosts` al abrir la cotización y Servicios opcionales ya no hace falta:**
  la query trae `payable_cost`, y las altas/bajas de viajeros la invalidan.

### Verificación (2026-10-12, local, playwright-cli, viaje de prueba `ff000000-…-0001`)

- [x] Abrir la cotización: una petición de `quotations?travel_id=eq.…` (más sus tablas hijas);
  resumen con "43 asientos vendibles" (44 − la coordinadora).
- [x] Cotización en 500 → "No se pudo cargar la cotización"; Reintentar la recupera. Lo mismo en
  Autobuses, Habitaciones y Servicios opcionales del viaje (sin estados vacíos falsos).
- [x] Gasto cambiado por SQL (como otro usuario): la pestaña sigue con el valor en caché; al
  simular el regreso a la pestaña (`visibilitychange`, pasados los 30 s de `staleTime`) muestra
  el nuevo.
- [x] Marcar un proveedor sin confirmar y de nuevo confirmado: PATCH y luego se vuelve a pedir la
  cotización; la tabla y SQL coinciden.
- [x] Hospedaje: 20 habitaciones en el viaje (= SQL). Autobuses: costo por persona 2,200
  (44,000 ÷ 20). Resumen del viaje: 43 vendibles. Habitaciones 20/3/1. Servicios opcionales con
  "43 asientos vendibles". Pagos del viaje y del viajero con su precio público. Calendario
  "3 de 43 lugares".
- [x] Guardar parámetros con un gasto en "total": `seat_price` 2962 (43 vendibles).
- Datos de prueba restaurados (`seat_price` 1524, gasto 2000 en "minimum", proveedor confirmado).
- [ ] Sin probar en el navegador: borrar un hotel con habitaciones vacías (`_deleteRooms`) y el
  aviso de "Precio por asiento sin recalcular" al cambiar coordinadores en la edición del viaje.
  Los dos cambios son de una línea; quedan para la verificación de la Fase 6.

---

## Objetivo

Quitar `cotizacionStore.fetchAll()` del arranque y reemplazar el caché manual del store
por Colada. Romper el acoplamiento por el que el store de cotizaciones escribe dentro del
store de viajes.

---

## Situación actual

- `use-cotizacion-store.ts` (1530 líneas) — el store más grande.
- `fetchAll()` (`:590`) trae **todas** las filas de `quotations` (solo la tabla raíz).
- `fetchByTravel(travelId, { force })` (`:604`) ya implementa a mano caché por viaje
  (`travelFetchCache`) y dedupe en vuelo (`travelFetchInFlight`) — lo que Colada da hecho.
- Lecturas globales: `cotizacionStore.cotizaciones.find(c => c.id === quotationId)` en
  `cotizacion-resumen-financiero`, `cotizacion-precio-publico-section`,
  `cotizacion-header-actions`, `cotizacion-bus-form`. Funcionan porque el arreglo global
  tiene todo; con carga por viaje necesitan la query del viaje (o una por id).
- `/quotations` (listado) ya se resolvió en Fase 2 con `quotations(id, status)` embebido.
- **Acoplamiento** (resuelto a medias en Fase 2, paso 5): `travelStore.travels` ya no
  existe. `_findRoomsToDrop` pide el viaje fresco con `queryCache.fetch`; las acciones de
  autobús solo invalidan el detalle. **Puentes que quedan**: `getAsientosVendibles` y
  `getRoomCountsByQuotation` leen el viaje con `queryCache.getQueryData` (marcados
  "Temporal hasta Fase 4"): si la pantalla no montó `travelDetailQuery` cuentan 0. Aquí
  deben pasar a funciones puras con coordinadores y habitaciones como parámetro.
  `_deleteRooms` sigue llamando `updateLocalAccommodations` (solo invalida el detalle).

### Pendientes que dejó la Fase 1

- **`getAsientosVendibles` y `getRoomCountsByQuotation`** leen el viaje con
  `queryCache.getQueryData` desde la Fase 2 (puente). Son getters que también se llaman
  desde acciones async (`_syncSeatPrice`, cálculo del precio por asiento), así que **no
  pueden usar `useQuery`**. Aquí pasan a recibir coordinadores y habitaciones como
  parámetro; es una cadena larga (`getCostoTotal`, `getAsientoConGanancia`, ~27 llamadas).
- **La pestaña Autobuses del viaje lista los buses desde `cotizacionStore`**
  (`travel-buses-section.vue`), cargado una vez por viaje con `travelFetchCache`. Un
  camión agregado en otra pestaña del navegador o por otro usuario no aparece hasta
  recargar. Se resuelve con el paso 1 (query `byTravel` con `refetchOnWindowFocus`).
- `addBusQuotation` / `updateBusQuotation` / `deleteBusQuotation` ya solo invalidan
  `travelKeys.detail(travelId)`: las escrituras a `travelStore.travels[...]` se quitaron
  en la Fase 2 (6e055a8).

---

## Pasos

1. Query `quotationKeys.byTravel(travelId)` envolviendo `repository.fetchByTravel`
   (la cotización con proveedores, alojamientos, precios públicos y autobuses).
   Borrar `travelFetchCache` / `travelFetchInFlight`: el `force` pasa a ser
   `invalidateQueries` o `refetch`.
2. Lecturas por `quotationId` → resolver el `travelId` desde la ruta y usar la misma query
   (dedupe), o agregar `quotationKeys.detail(id)` si alguna pantalla no conoce el viaje.
3. Escrituras de cotización (proveedores, alojamientos, autobuses, precios públicos,
   parámetros, estado) → invalidar `byTravel(travelId)`.
4. **Desacoplar del viaje**: `_deleteRooms` llama `updateLocalAccommodations` (que solo
   invalida el detalle): invalidar directo. Los dos getters puente (coordinadores y
   habitaciones por tipo) pasan a recibir el dato como parámetro desde la query del viaje.
5. Precios públicos usados en `/payments` (`cotizacion-precio-publico-section`): confirmar
   que invalidar la cotización también refresca lo que depende de ella en pagos.
6. Quitar `cotizacionStore.fetchAll()` del plugin. **(Hecho en la 4a)**

Los pasos 1-5 quedaron en la 4b (arriba). El paso 2 no hizo falta: toda pantalla que lee por
`quotationId` está dentro de una que ya cargó la cotización de su viaje.

Por tamaño, esta fase puede partirse en 4a (lecturas + caché) y 4b (escrituras +
desacople) si al empezar se ve muy grande.

---

## Verificación

- Recorrido completo de una cotización: parámetros, servicios, hospedaje, autobuses,
  precios públicos, resumen financiero, confirmar.
- Agregar/quitar un autobús en la cotización: la pestaña Autobuses del viaje lo refleja
  (antes vía escritura directa al store, ahora vía invalidación).
- Alojamientos de la cotización ↔ habitaciones del viaje siguen sincronizados.
- Precios públicos: la advertencia de viajeros que los usan
  ([[project-public-price-travelers-warning]]) sigue funcionando.
