# Fase 2 — Listados de viajes ligeros y conteos en el servidor

**Estado:** En progreso — rama `feature/on-demand-loading-phase-2` (desde `main` 571d805)
**Dependencia:** Fase 1
**Migración:** Ninguna (el conteo embebido con filtro funciona; plan B de la vista descartado)

---

## Avance

- [x] 1. `fetchSummaries(filters)` en el repositorio (29bf911)
- [x] 2. `travelKeys.list(filters)` + `travelListQuery` (3d666a5)
- [ ] 3. Pantallas
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
  - [ ] `/travels/dashboard`: paginación (`UPagination` + `total`), filtro de estado en el
    servidor (sí va en la clave: con paginación no se puede filtrar en el cliente; ordenar
    `statuses` antes de armar la clave, Colada no ordena arreglos), totales por estado con
    `head: true`.
  - [ ] `/payments`
  - [ ] `payments/traveler/[id].vue` (etiquetas de varios viajes, pendiente de la Fase 1)
- [ ] 4. Escrituras invalidan `['travels']`
- [ ] 5. Quitar `travelsStore.fetchAll()` del arranque

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
