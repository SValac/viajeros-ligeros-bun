# Fase 4 — Cotizaciones por viaje

**Estado:** Pendiente
**Dependencia:** Fase 1 (el detalle de viaje ya está en caché); puede ir en paralelo con 2-3
**Migración:** No

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
- **Acoplamiento**: el store lee y escribe `travelStore.travels` (`:253`, `:566`, `:584`,
  `:1256`, `:1304`, `:1356`) para mantener alineados autobuses y alojamientos del viaje.

### Pendientes que dejó la Fase 1

- **`getAsientosVendibles` lee coordinadores de `travelStore.getTravelById`.** Es un
  getter del store que también se llama desde acciones async (`_syncSeatPrice`, cálculo
  del precio por asiento), así que **no puede usar `useQuery`**: no hay contexto de
  componente y crearía una query por llamada. Opciones: recibir el número de
  coordinadores como parámetro, o leerlo con `queryCache.getQueryData(travelKeys.detail(id))`
  (no crea la entrada: solo sirve si alguien ya montó la query del viaje). Mientras
  tanto, un viaje fuera de las 1000 filas cuenta 0 coordinadores.
- **La pestaña Autobuses del viaje lista los buses desde `cotizacionStore`**
  (`travel-buses-section.vue`), cargado una vez por viaje con `travelFetchCache`. Un
  camión agregado en otra pestaña del navegador o por otro usuario no aparece hasta
  recargar. Se resuelve con el paso 1 (query `byTravel` con `refetchOnWindowFocus`).
- `addBusQuotation` / `updateBusQuotation` / `deleteBusQuotation` ya invalidan
  `travelKeys.detail(travelId)` (Fase 1, paso 4b); el paso 4 solo tiene que quitar las
  escrituras a `travelStore.travels[...]` que quedan junto a esa invalidación.

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
4. **Desacoplar del viaje**: donde hoy escribe `travelStore.travels[...]` o llama
   `updateLocalAccommodations`, invalidar `['travels', 'detail', travelId]` en su lugar.
   Lo que lee del viaje (coordinadores `:253`, alojamientos `:566`) lo recibe como
   parámetro o lo lee del caché con `queryCache.getQueryData`.
5. Precios públicos usados en `/payments` (`cotizacion-precio-publico-section`): confirmar
   que invalidar la cotización también refresca lo que depende de ella en pagos.
6. Quitar `cotizacionStore.fetchAll()` del plugin.

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
