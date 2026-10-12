# Fase 2 — Listados de viajes ligeros y conteos en el servidor

**Estado:** Pasos 1-5 completos, falta abrir el PR — rama `feature/on-demand-loading-phase-2` (desde `main` 571d805)
**Dependencia:** Fase 1
**Migración:** Ninguna (el conteo embebido con filtro funciona; plan B de la vista descartado)

---

## Avance

- [x] 1. `fetchSummaries(filters)` en el repositorio (29bf911)
- [x] 2. `travelKeys.list(filters)` + `travelListQuery` (3d666a5)
- [x] 3. Pantallas
  - [x] `/quotations` (ea516a9): una petición, estados de carga y error con Reintentar. Los
    totales se cuentan en el cliente porque esta pantalla no pagina.
  - [x] `/calendar` en 4 sub-pasos:
    - a (c154ab7) `getCalendarGridRange(month)` en `utils/travel-calendar.ts`.
    - b (a2bc43f) `useTravelCalendar` pide el rango de la cuadrícula de 42 días (incluye los
      días grises). Los estados se filtran en el cliente, no van en la clave, así que marcarlos
      no hace petición. `placeholderData` evita que la cuadrícula se vacíe al cambiar de mes.
    - c (11f7f89) El panel recibe solo `travelId` y lee `travelDetailQuery`: **sigue abierto
      al cambiar de mes** (decisión del usuario). Tipo nuevo `TravelDetail = Travel &
      { travelerCount }`; el select del detalle cuenta viajeros `kind = traveler`.
      `sellableSeats` sigue con `cotizacionStore` (Fase 4).
    - d (8ccf8ed) La página usa la misma `travelDetailQuery` (misma clave que el panel: una
      petición) para el link `?viaje=` y para deseleccionar al filtrar. El link corre una sola
      vez con una **bandera**, no con `const stop = watch(..., { immediate: true })`: con el
      viaje ya en caché el callback corre antes de que `watch()` devuelva y `stop` lanza
      `ReferenceError` (pasaba al volver con "atrás").
    - El calendario ya no usa `travelsStore` ni `travelerStore`.
  - [x] `/travels/dashboard` en 4 sub-pasos:
    - a (d6c9320) `fetchStatusCounts()`: una consulta `head: true` por estado en paralelo
      (solo vuelve el `count`, sin el límite de 1000) + `travelStatsQuery` bajo
      `['travels', 'stats']`. `TravelStats` pasa a `types/travel.ts`.
    - b (47e88f9) Tabla paginada (`UPagination`, 20 por página) con el filtro de estado
      **en la clave** (con paginación no se puede filtrar en el cliente). `statuses` se
      ordena antes de armar la clave (Colada no ordena arreglos), cambiar el filtro vuelve a
      la página 1, y sin estados marcados la query se desactiva y se muestra un aviso (un
      arreglo vacío traería todos los viajes). `TRAVEL_STATUSES` en `utils/travel-status.ts`.
    - c (31ffcc4) Tarjetas desde `travelStatsQuery`. El estado vacío distingue "no hay
      viajes" (`total === 0`) de "ningún viaje con estos estatus" (con Restablecer filtros).
    - d (27b29e5) `deleteTravel` quita el detalle y después invalida `travelKeys.root`
      (lista + totales). Si el viaje borrado era el único de la última página, se va a la
      última que existe.
    - Queda `travelsStore` solo para `deleteTravel` (paso 4).
  - [x] `/payments` en 5 sub-pasos. Decisión del usuario: las **tarjetas suman solo los
    viajes activos** (publicados y en curso); los completados crecen para siempre y sus
    saldos se ven en la tabla. Sin migración.
    - a (d1a9f1e) `fetchInBatches` (`utils/fetch-in-batches.ts`): pagos y configuraciones
      por viaje en tandas de `max_rows` con orden estable (`traveler_account_configs` no
      tiene `id`: su clave es `(travel_id, traveler_id)`).
    - b (4a35c96) `summarizeTravelPayments` (pura, en el dominio): suma los resúmenes por
      viajero de cada viaje; viajeros = unión de los que tienen config o pagos, así que no
      hace falta pedir viajeros. `travelPaymentTotalsQuery(ids)` en `queries/payments.ts`.
    - c (06d08b7) Tabla paginada: `travelListQuery` con los 3 estados cobrables + los
      totales de los ids de la página (la segunda query se activa sola al llegar la lista).
    - d (7452470) Tarjetas: misma pareja de queries con los activos y sin página. Sin
      activos la query de totales no corre: la guarda muestra 0, no "—" para siempre.
      `/payments` ya no usa stores.
    - e (0bfb25f) `add/update/deletePayment`, `setAccountConfig` y `deleteTraveler`
      (cascada) invalidan `paymentKeys.root`.
  - [x] `payments/traveler/[id].vue` en 2 sub-pasos:
    - a (292ec18) filtro `ids` en `fetchSummaries`. Un arreglo vacío devuelve **ningún**
      viaje (no se ignora el filtro, a diferencia de `statuses`).
    - b (a434731) la página pide los resúmenes de los viajes del viajero (ids ordenados para
      que la key de caché sea estable) y arma un `Map` id → label. `enabled` revisa
      `ids.length`: el objeto de filtros siempre es truthy.
- [x] 4. Escrituras invalidan `['travels']`
  - a (40c3026) `addTravel` y `updateTravel` (y con él `updateTravelStatus`) invalidan
    `travelKeys.root`: viaje nuevo, cambio de estado o de nombre se ven en listas, conteos
    y etiquetas de pagos. Las acciones de buses y habitaciones siguen invalidando solo el
    detalle (no cambian columnas de `TravelSummary`).
  - b (060571f) las escrituras ya no dependen de `travels.value`: sin `findIndex`, sin
    guards de "no encontrado" y sin rearmar la copia local. Solo escriben e invalidan, así
    que editar funciona aunque `fetchAll` no haya cargado el viaje. `addTravel` sigue
    devolviendo el `Travel` (lo usa `new.vue`) sin el `push`. Se borró
    `removeBusFromTravel` (sin llamadores) y `removeTravelBus` del repositorio.
    Cuidado al quitar la copia local: `replaceActivities`/`Services`/`Buses`/
    `Accommodations`/`Coordinators` **son las escrituras**, solo se quita la asignación.
  - Verificado en el navegador: actividad nueva persiste tras el refetch; cambio de estado
    actualiza las tarjetas del dashboard a los 17 s (dentro del `staleTime`, así que es la
    invalidación y no la caducidad).
- [x] 5. Quitar `travelsStore.fetchAll()` del arranque. `cotizacionStore` leía el arreglo
  global en **3** sitios (no solo `:295`); sin `fetchAll` los tres daban vacío sin error:
  - a (433d752) `_findRoomsToDrop` decide qué habitaciones se borran, así que pide el viaje
    fresco: `queryCache.fetch(queryCache.ensure(travelDetailQuery(id)))`. `fetch` ignora el
    `staleTime` (`refresh` no) y lanza si falla: el `catch` de quien llama corta la acción
    antes de escribir. Sin viaje (`null`) rechaza el cambio.
  - b (4acab32) `getAsientosVendibles` y `getRoomCountsByQuotation` leen con
    `queryCache.getQueryData(travelKeys.detail(id))`, marcado "Temporal hasta Fase 4". Es
    reactivo (`caches` es un `shallowRef` con `triggerRef` al crear entradas): verificado
    con recarga dura. Depende de que la pantalla monte `travelDetailQuery`; todas lo hacen.
  - (d3fcf96) De paso, el estado interno de `use-cotizacion-store` pasó a inglés; el
    `return` mantiene los nombres en español con alias. Ojo: la desestructuración del
    resultado en `fetchByTravel` tapaba los refs renombrados (`fetched*` ahora).
  - c (6e055a8) `add/update/deleteBusQuotation` ya no copian buses a `travelStore.travels`;
    solo invalidan el detalle. La pestaña Autobuses lista desde `cotizacionStore`, pero
    operadores, opciones de camión del viajero y la lista de viajeros leen `travel.buses`
    del detalle. Verificado: agregar, editar y borrar se reflejan sin recargar.
  - d (91ac521) Fuera `travelsStore.fetchAll()` del plugin, el arreglo `travels`, `loaded`,
    los getters, `stats` y `fetchAll` del repositorio. Al arrancar ya solo se piden los
    conteos `head` y el resumen de la pantalla.

## Objetivo

Que las 4 pantallas de listado pidan **solo las columnas que muestran**, filtradas y
acotadas en el servidor, y que los conteos los haga Postgres. Al final de la fase
`travelsStore.travels`, `allTravels`, `stats` y `travelsStore.fetchAll()` desaparecen.

---

## Pantallas

| Pantalla | Hoy | Después |
|---|---|---|
| `/travels/dashboard` | `allTravels` completo + `stats` en memoria | Lista resumida con filtro de estado en servidor (por defecto activos: `pending`, `published`, `in_progress`) y paginación (`.range()` + `count: 'exact'`). Totales por estado con consultas `head: true` |
| `/calendar` | `allTravels` + `getTravelersByTravel(id).length` | Solo viajes que se solapan con el mes visible (`start_date <= finMes AND end_date >= inicioMes`) + `travelers(count)` embebido |
| `/quotations` | `allTravels` × `getCotizacionByTravel` | Lista resumida con `quotations(id, status)` embebido |
| `/payments` | `allTravels` filtrado + **todos** los viajeros + `paymentStore.fetchByTravels(todos los ids)` | Lista resumida paginada; viajeros/pagos/configs **solo de los viajes de la página visible** |

### ⚠️ `/payments` también tiene el corte de 1000

`paymentStore.fetchByTravels(ids)` pide pagos y configs de **todos** los viajes
`published`/`in_progress`/`completed` — los completados crecen para siempre, así que los
pagos llegan al límite de 1000 igual que los viajeros. Paginar el listado acota los ids.
El cálculo de `getTravelerPaymentSummary` (descuentos, recargos, tipo de viajero) **se
queda en el cliente**: duplicarlo en SQL no vale la pena todavía.

---

## Pasos

### 1. Repositorio: `fetchSummaries(filters)`

Tipo `TravelSummary` (en `app/types/travel.ts`) con solo lo que usan los listados: id,
label, destino, fechas, estado, imagen, `featured`, `travelerCount`, `quotation`
(id/estado), `createdAt`. Una sola función con filtros opcionales (estados, rango de fechas,
página) o una por pantalla si los `select` divergen mucho — decidir al implementar.

**Conteo de viajeros:** `travelers(count)` con filtro `kind = 'traveler'` sobre el embebido,
para igualar `payingTravelers` de `use-traveler-store.ts:45`. Verificar que PostgREST
aplique el filtro al conteo; si no, plan B = vista `travel_traveler_counts`
(`security_invoker = true`, expand-only).

**Hecho:** una sola función `fetchSummaries(filters)` → `{ items, total }`, con
`selectTravelSummary()` + `mapTravelSummary()` en el repositorio (el tipo de la fila sale
del `select` con `QueryData`, por eso no va en `mappers.ts`). Verificado contra la base
local:

- `travelers` necesita la pista de FK (`travelers!travelers_travel_id_fkey(count)`): hay un
  segundo camino vía `traveler_account_configs` y sin ella PostgREST responde `PGRST201`.
- El filtro `travelers.kind = traveler` **sí** se aplica al conteo embebido (coordinadores
  quedan fuera). Plan B de la vista descartado.
- `created_at` puede empatar (filas del seed insertadas en la misma transacción): se
  desempata con `.order('id')` para que la paginación no repita ni salte viajes.
- Rango de fechas = solapamiento: `end_date >= desde AND start_date <= hasta`.

### 2. Queries

`travelKeys.list(filters)` — los filtros forman parte de la clave, así cambiar de mes o de
página es otra entrada de caché (volver atrás es instantáneo).

### 3. Pantallas

> **Pendiente de la Fase 1:** `calendar.vue` (viaje seleccionado) y
> `payments/traveler/[id].vue` (etiquetas de los viajes del viajero en `travelOptions` y
> `getTravelName`) siguen con `travelsStore.getTravelById`. Necesitan **varios** viajes
> (solo `label`), así que van con la lista resumida, no con `travelDetailQuery`. No
> llamar `useQuery` dentro de un `computed` ni de una función del template.

Migrar las 4 pantallas. El dashboard necesita UI de paginación y un control de filtro de
estado (Nuxt UI `UPagination` + el patrón de filtros que ya usa el calendario).

### 4. Escrituras

`addTravel`, `updateTravel`, `deleteTravel` → `useMutation` (o acciones que invalidan)
con `invalidateQueries({ key: ['travels'] })` (lista + detalle). Si el store queda vacío,
se elimina `use-travel-store.ts`.

### 5. Quitar `travelsStore.fetchAll()` del plugin de arranque

---

## Verificación

- Cada listado: una petición, sin relaciones de más (revisar el payload en Red).
- Conteos de viajeros iguales a los de antes en un viaje con coordinadores (no deben contar).
- Crear, editar y borrar viaje desde el dashboard: lista y totales se actualizan.
- Calendario: cambiar de mes pide solo ese mes; volver a un mes visto no vuelve a pedir
  (dentro del `staleTime`).
- `/payments`: totales por viaje iguales a antes en los viajes de la primera página.
