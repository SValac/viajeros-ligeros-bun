# Feature: Estados compartidos de carga, error y vacío

**Objetivo:** Un solo componente para carga y error (`LoadState`) y uno para vacíos
(`EmptyState`), en vez de copiar el mismo bloque en cada pantalla. Sin cambios de lógica.

**Complejidad:** Media — muchos archivos (~40), pero cada cambio es de plantilla.

**Estado:** En progreso (rama `feature/shared-load-states`).

---

## Contexto

Tarea del backlog del project #3: "Refactor: componente compartido para estados de carga, error y
vacío". En la fase 5 de on-demand loading (PR #129) nació `app/components/catalog-load-state.vue`
(spinner → error + "Reintentar" → slot), y hoy lo usan 13 pantallas de catálogos. Las pantallas de
viajes, cotizaciones, pagos y calendario repiten el mismo bloque a mano en unos 13 lugares más, y
los estados vacíos están copiados con al menos tres estilos distintos (`w-16 text-gray-300` + h3,
`w-12 text-muted`, `size-10 opacity-40`), con textos distintos en cada pantalla. Objetivo: un
componente para carga y error, y un `EmptyState` sobre `UEmpty` (Nuxt UI 4, ya usado en
`travel-access-code-card.vue`) con un texto genérico por sección. No cambia la lógica.

De paso se arregla un detalle: en Pinia Colada, `status` sigue en `'error'` mientras corre el
reintento, así que hoy las pantallas no muestran el spinner al pulsar "Reintentar". El cálculo de
`catalogs.ts` (`loadError` vacío mientras `asyncStatus === 'loading'`) sí lo hace. Ese es el
comportamiento que se generaliza.

## Diseño

### 1. `LoadState` (renombre de `CatalogLoadState`)
- `git mv app/components/catalog-load-state.vue app/components/load-state.vue`: ya no es solo
  para catálogos.
- Props: `isLoaded`, `loadError`, `label` (como hoy) más `fill?: boolean`. Con `fill`, el spinner
  y el error se centran en `h-full` (pantallas completas como `travels/[id]`,
  `quotations/[id]`, `quotations/index`). Sin `fill` quedan en `py-12`, como hoy.
- Emite `retry`. Se actualizan los 13 usos actuales (cambio mecánico del nombre).

### 2. Helper `useQueryLoadState(query)` (nuevo, `app/queries/load-state.ts`)
- Recibe `{ data, error, asyncStatus }` de un `useQuery` y devuelve `reactive({ isLoaded, loadError })`:
  - `isLoaded = data != null`. Así un detalle `null` (no encontrado → el `watch` redirige) sigue
    mostrando el spinner en vez del slot con `travel` nulo. Las listas con `placeholderData`
    conservan el contenido al paginar o cambiar de mes.
  - `loadError = asyncStatus === 'loading' ? null : error`.
- `app/queries/catalogs.ts:83-85` pasa a usarlo, para que la regla viva en un solo lugar.
- Uso en las pantallas:
  `const travelersLoad = useQueryLoadState(travelersQuery)` →
  `<LoadState v-bind="travelersLoad" label="los viajeros" @retry="refetchTravelers()">`.
  Donde hoy solo se desestructura `{ data, status, refetch }`, se guarda también el objeto
  completo del `useQuery`.
- Dos queries en la misma pantalla: dos `LoadState` anidados, cada uno con su mensaje y su
  reintento. No hace falta un helper para combinarlas.

### 3. Vacíos: `EmptyState` con un texto genérico por sección
Los vacíos actuales se agregaron sin diseño ni pensando en reutilizarlos, así que **no se conservan
sus textos**: cada sección del CRM tiene un solo vacío genérico.

- `app/utils/empty-states.ts`: mapa `EMPTY_STATES` por sección →
  `{ icon, title, description }`. Más una entrada genérica `noResults` ("Sin resultados" /
  "Prueba con otros filtros o términos de búsqueda", `i-lucide-search-x`) para cualquier lista
  filtrada. Secciones (borrador de textos, se ajustan en la revisión visual):
  - `travels`: viajes ("Todavía no hay viajes");
  - `quotation`: la cotización y sus secciones (buses, gastos, proveedores, hospedaje);
  - `travelers`: viajeros y habitaciones del viaje;
  - `payments`: pagos e historiales de pago;
  - `providers`: proveedores y sus categorías;
  - `coordinators`;
  - `buses`;
  - `rooms`: habitaciones del hotel;
  - `optionalServices`;
  - `gallery`;
  - `activities`.
  La sección exacta de cada bloque se decide con el inventario: si dos casos de una misma sección
  necesitan decir cosas distintas, se separan en dos entradas. No se crean textos por pantalla.
- `app/components/empty-state.vue`: envuelve `UEmpty`. Props `section: keyof typeof EMPTY_STATES`,
  `compact?: boolean` (dentro de un card o una sección: `size="sm"`, `variant="naked"`; si no,
  `size="lg"`) y `actions?` (los mismos `ButtonProps[]` de `UEmpty`). Slot `#actions` para botones
  que no son simples (por ejemplo `:to` con params).
- Se mantiene la distinción "sin datos" (`section`, con la acción de crear de cada pantalla) vs
  "sin resultados con estos filtros" (`section="noResults"`, sin acción).
- `travel-access-code-card.vue` queda con su `UEmpty` propio: sus textos son estados del código,
  no listas vacías.

## Inventario

**Carga/error a `LoadState`** (los 13 de catálogos solo cambian de nombre):
- Pantalla completa (`fill`): `pages/travels/[id].vue`, `pages/quotations/[id].vue` (exterior),
  `pages/quotations/index.vue`, `pages/payments/traveler/[id].vue`.
- Sección: `pages/quotations/[id].vue` (cotización), `pages/travels/dashboard.vue` (el aviso
  "Elegí al menos un estatus" queda afuera, antes del componente), `pages/payments/index.vue`
  (lista + totales anidados), `pages/calendar.vue` (exponer `data` y el query desde
  `composables/travels/use-travel-calendar.ts`), `pages/travels/[id]/travelers/index.vue`,
  `pages/travels/[id]/habitaciones/index.vue` (viajeros + cotización anidados),
  `pages/travels/[id]/optional-services.vue` (cotización y, adentro, viajeros),
  `components/travel-buses-section.vue`, `components/travel-payments-panel.vue`,
  `components/travel-calendar-summary.vue` (hoy no tiene estado de error; lo gana).
- Spinner y error ya no van dentro de un `UCard` propio (habitaciones, travelers,
  optional-services), igual que en catálogos. Es un cambio visual menor.
- Fuera: `pages/profile.vue`. Usa store Pinia (`loading`/`error`) y un `UAlert`, no un query de
  Colada. Se deja como está.

**Vacíos a `EmptyState`** (de `grep` de íconos grandes con `mx-auto`):
- Página o lista principal: `travels/dashboard.vue` (×2), `quotations/index.vue`,
  `quotations/[id].vue` ("Sin cotización"), `payments/index.vue`, `payments/traveler/[id].vue`,
  `coordinators/index.vue` (×2), `providers/index.vue`, `provider-category-list.vue`,
  `bus-list.vue`, `travels/[id]/travelers/index.vue`, `travel-payments-panel.vue` (×2: sin
  viajeros / sin resultados).
- Sección o card: `travels/[id]/habitaciones/index.vue`, `travels/[id]/optional-services.vue`,
  `travel-buses-section.vue`, `cotizacion-buses-section.vue`, `cotizacion-gastos-section.vue`,
  `cotizacion-proveedor-tabla.vue`, `cotizacion-hospedaje-tabla.vue`,
  `cotizacion-hospedaje-resumen.vue`, `pago-bus-historial.vue`, `pago-proveedor-historial.vue`,
  `pago-hospedaje-historial.vue`, `travel-gallery-viewer.vue`, `travel-activity-list.vue`,
  `hotel/hotel-rooms-manager.vue`.
- Si algún bloque resulta ser otra cosa (por ejemplo un placeholder de imagen y no un vacío), se
  deja y se anota en el doc.

## Pasos y commits (rama `feature/shared-load-states`)

1. `docs`: `docs/features/pending/shared-load-states/PLAN.md` (este plan) y link desde el item
   del project #3. El item pasa a "In progress".
2. `refactor(ui): rename CatalogLoadState to LoadState and add fill`, con los 13 usos.
3. `refactor(queries): extract useQueryLoadState from the catalog store`, con `catalogs.ts`.
4. `refactor(...)`: `LoadState` en las pantallas, un commit por área (viajes, cotizaciones,
   pagos, calendario).
5. `feat(ui): add EmptyState with one generic empty state per section` (`empty-states.ts` +
   componente). Después, `refactor(...)`: reemplazar los vacíos, un commit por área (listas de
   página, secciones de cotización, historiales de pago, detalle del viaje).
6. `docs`: actualizar `docs/architecture/04-data-flow.md:144` (`CatalogLoadState` → `LoadState`
   + helper) y mover la carpeta a `docs/features/completed/` en este mismo PR. Agregar la entrada
   en `docs/claude/07-documentation.md`.
7. Commit de cada fase al terminarla. Sin atribución de Claude en commits ni en el PR. El título
   del PR va en Conventional Commits.

## Verificación

- `bun run lint:fix` después de cada área. `typecheck` sobre una copia en el scratchpad (gotcha:
  correrlo con `nuxt dev` encendido rompe el servidor de desarrollo).
- playwright-cli contra el seed local (`dev@viajeros-ligeros.local` / `password123`), en un
  servidor aparte:
  - Error y reintento: abortar con `route` la petición de cada query (`travels`, `quotations`,
    `travelers`, `payments`) → mensaje + "Reintentar". Al pulsarlo con la ruta liberada → spinner →
    contenido. Pantallas: detalle del viaje, cotización, viajeros, habitaciones, servicios
    opcionales, pagos (lista y panel), calendario y su resumen, dashboard.
  - Deep link a un viaje inexistente: spinner y luego la redirección de siempre (sin error de
    plantilla por `travel` nulo).
  - Paginación del dashboard y de `/payments`, y cambio de mes del calendario: el contenido
    anterior sigue visible, sin spinner a pantalla completa.
  - Vacíos: los datos `VOL` del calendario o el dashboard con filtros sin resultados ("Sin
    resultados"); una cotización sin gastos, buses ni hospedaje; un viaje sin galería ni
    actividades. Captura de pantalla de cada tipo en escritorio y tablet.
- Consola sin warnings nuevos.

## Progreso

- [x] 1. Plan y item del project
- [ ] 2. `CatalogLoadState` → `LoadState` + `fill`
- [ ] 3. `useQueryLoadState`
- [ ] 4. `LoadState` en viajes, cotizaciones, pagos y calendario
- [ ] 5. `EmptyState` y reemplazo de los vacíos
- [ ] 6. Docs de arquitectura, mover a `completed/`
- [ ] Verificación
