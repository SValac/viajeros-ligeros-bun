# Fase 2 — Listados de viajes ligeros y conteos en el servidor

**Estado:** Pendiente
**Dependencia:** Fase 1
**Migración:** No prevista (plan B: vista `security_invoker`, expand-only)

---

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

### 2. Queries

`travelKeys.list(filters)` — los filtros forman parte de la clave, así cambiar de mes o de
página es otra entrada de caché (volver atrás es instantáneo).

### 3. Pantallas

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
