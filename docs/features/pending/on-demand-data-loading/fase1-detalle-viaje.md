# Fase 1 — Piloto: detalle de viaje por id

**Estado:** Pendiente
**Dependencia:** Fase 0
**Migración:** No

---

## Objetivo

Que todo lo que hoy hace `travelsStore.getTravelById(id)` lea el viaje con
`useQuery(['travels', 'detail', id])`, que pide **ese** viaje a Supabase con sus relaciones.

Corrige un bug real: un viaje que quede fuera de las 1000 filas del `fetchAll()` hoy da
"no encontrado" en `/travels/<id>`.

Es el **piloto** de Colada: al final hay un punto de decisión para seguir con el resto o
volver a la opción A (caché manual).

---

## Consumidores a migrar

`getTravelById` se usa hoy en:

| Archivo | Uso |
|---|---|
| `app/composables/travels/use-travel-route.ts` | Estado compartido de `/travels/[id]` y sus pestañas — **el punto de entrada principal** |
| `app/pages/travels/[id].vue` | Redirect si no existe (`watch` sobre `travelsStore.loaded`) |
| `app/pages/travels/[id]/travelers/index.vue` | Viaje + `getAccommodationsByTravel` |
| `app/pages/travels/[id]/habitaciones/index.vue` | `getAccommodationsByTravel`, `updateTravelAccommodation` |
| `app/pages/quotations/[id].vue` | Redirect si no existe (`travelStore.loaded`) |
| `app/pages/payments/travel/[id].vue`, `payments/traveler/[id].vue` | Viaje para encabezados |
| `app/pages/calendar.vue` | Viaje seleccionado (se resuelve en Fase 2 con el listado) |
| Componentes: `travel-buses-section`, `travel-services-editor`, `traveler-form`, `travel-payments-panel`, `quotation-parameters-card`, `cotizacion-bus-form` | Leen el viaje por id |
| `app/stores/use-cotizacion-store.ts:253`, `:566` | Lee coordinadores y alojamientos del viaje |

---

## Pasos

### 1. Repositorio: `fetchById(id)`

En `use-travel-repository.ts`, extraer el `select` con relaciones y el mapeo que hoy vive
dentro de `fetchAll()` (líneas 21-45) a un helper, y agregar `fetchById(id)` con
`.eq('id', id).maybeSingle()`. `null` = no existe o RLS no lo deja ver.

### 2. Query: `travelDetailQuery(id)`

En `app/queries/travels.ts`. El `undefined`/`null` del resultado reemplaza a la
combinación `getTravelById(...) === undefined && loaded`.

### 3. `useTravelRoute()`

Que devuelva `travel` desde la query, más `isPending` / `error`. Las páginas que hoy
esperan `travelsStore.loaded` para decidir el redirect pasan a esperar que la query
termine (`status !== 'pending'`) y que el dato sea `null`.

> Ojo con [[bugfix-detail-redirect-before-load]] y [[bugfix-not-found-watcheffect-loop]]:
> el redirect solo después de que la query resuelva, y con `watch` de fuente explícita.

### 4. Escrituras: mantener cache y store sincronizados (transición)

Durante esta fase `travelsStore.travels` sigue existiendo (los listados lo usan hasta la
Fase 2). Las acciones del store que modifican un viaje (`updateTravel`, `deleteTravel`,
`updateTravelBus`, `removeBusFromTravel`, `updateTravelAccommodation`,
`updateLocalAccommodations`) además:

- `updateTravel` y similares → `queryCache.setQueryData(detail(id), viajeActualizado)` (o
  `invalidateQueries`).
- `deleteTravel` → quitar la entrada del caché.

`use-cotizacion-store.ts` escribe directo en `travelStore.travels[...]` (líneas ~1256,
~1304, ~1356, autobuses de la cotización). Esas escrituras también tienen que invalidar
`detail(travelId)`. Es acoplamiento que se elimina del todo en Fase 4.

### 5. Componentes

Los componentes que reciben el id y llaman `getTravelById` pasan a `useQuery` con la misma
clave: Colada deduplica, así que N componentes en la misma pantalla = **una** petición.

---

## Verificación

- Navegar `/travels/<id>` y todas sus pestañas: una sola petición del viaje (pestaña Red).
- Editar viaje, buses, alojamientos y servicios: la UI refleja el cambio sin recargar.
- `/travels/<uuid-inexistente>` redirige con el toast de "no encontrado", sin bucles.
- Deep link directo a `/travels/<id>/habitaciones` con la app recién abierta.
- Volver a la pestaña del navegador tras editar desde otra sesión: se refresca solo.
- `lint:fix` + `typecheck`.

---

## 🔀 Punto de decisión (al cerrar la fase)

Evaluar con el usuario antes de seguir:

- ¿El código de las páginas quedó más simple o más complejo que con el store?
- ¿La transición store + caché generó bugs de sincronización?
- ¿Colada se integró bien con Nuxt UI / auto-imports / typecheck?

**Sí** → Fases 2-6. **No** → revertir a caché manual (opción A) reutilizando el
`fetchById` del repositorio, que sirve igual.
