# 2. Pinia Stores

Todos los stores viven en `app/stores/`. Usan Composition API (`defineStore` con `setup`). El estado se sincroniza con Supabase — no hay localStorage.

Nada se carga al arrancar la app: cada pantalla pide lo que usa con **Pinia Colada**
(`app/queries/`, ver [Flujo de datos](./04-data-flow.md#carga-de-datos-con-pinia-colada)).

- **Datos operativos** (viajes, viajeros, cotizaciones, totales de pagos): la pantalla monta
  la query con `useQuery` y lee de ella. Los stores de viajes y viajeros solo tienen las
  escrituras, que invalidan las queries afectadas.
- **Catálogos** (proveedores, coordinadores, autobuses, habitaciones): su store lee la query del
  catálogo con `useCatalogState`; los getters no cambian para las pantallas. La petición sale la
  primera vez que una pantalla usa el store.
- **Cotización**: la query copia cada resultado al store de cotizaciones (`hydrateTravel`), cuyos
  getters y escrituras trabajan sobre esa copia.

### Patrón Repository + Domain

Todos los stores aplican el patrón de tres capas:

| Capa | Ubicación | Responsabilidad |
|---|---|---|
| **Domain** | `app/composables/<feature>/use-<feature>-domain.ts` | Lógica pura, funciones síncronas, sin Supabase ni stores |
| **Repository** | `app/composables/<feature>/use-<feature>-repository.ts` | Acceso a Supabase, mapeo a dominio, lanza errores tal cual |
| **Store** | `app/stores/use-<feature>-store.ts` | Escrituras (loading/error), estado de cliente, invalidación de queries |

### Action errors

Rule from `docs/features/completed/standardize-store-error-handling.md`, applied to every store
in shared-components-dedup phase 10:

- An action returns `Promise<T>` (the saved row) or `Promise<void>`, never `boolean`,
  `{ error }` or `undefined` on failure.
- It throws on failure: the `catch` stores `toErrorMessage(e, fallback)` (`app/utils/error-message.ts`)
  in `error` and re-throws. A refusal (validation, a confirmed quotation, a row not found)
  throws `new Error('<user-facing message>')`. When the store translates the error
  (`toTravelSaveErrorMessage`, `toRoomAssignmentErrorMessage`) it throws
  `new Error(message, { cause: e })` so the caller gets the translated text.
- Stores never toast: the caller does, with `useActionToast().runWithToast(action, { success,
  error })` (`app/composables/use-action-toast.ts`), or a `try/catch` and
  `toErrorMessage(e, '<fallback>')` when it needs a `finally` or the action's result. A loader
  called on mount or in a watcher catches it too (toast, or `.catch(() => {})` when the data is
  optional, with a comment why).
- `toErrorMessage` shows our own `Error`s as they are. Supabase errors (PostgREST returns a plain
  `{ code, message, details, hint }` object, not an `Error`), Storage/Auth/Edge Function errors
  and runtime `TypeError`s etc. show their raw text only in development (`import.meta.dev`); in
  production they get a Spanish text for the common codes (23505, 23503, 42501, expired
  session, no network) or the fallback, since the raw text can name tables and constraints.
  So never put a Supabase `error.message` inside our own message: throw
  `new Error('<text>', { cause: error })` instead (development appends the cause).

---

## 2.1 Auth Store (`use-auth-store.ts`)

**Estado**: `user`, `session`, `loading`

**Getters**: `isAuthenticated`, `displayName`, `userEmail`, `avatarUrl`

**Actions**:
- `fetchSession()` — obtiene sesión activa
- `signIn(email, password)` — errores localizados en español
- `signUp(email, password, name?)` — retorna `requiresEmailVerification`
- `signOut()` — limpia sesión

---

## 2.2 Provider Store (`use-provider-store.ts`)

**Estado**: `loading`, `error` (de las escrituras), `activeFilters`

**Getters**:
- `providers` — el catálogo (`providersCatalogQuery`); `isLoaded`, `loadError`
- `allProviders` — ordenados por nombre (localización española)
- `activeProviders` — solo `active = true`
- `getProviderById`, `getProvidersByCategory`
- `statsByCategory` — conteo por categoría
- `filteredProviders` — aplica `activeFilters`
- `availableCities`, `availableStates` — valores únicos para filtros
- `filteredCount`, `hasActiveFilters`

**Actions**: `refetch`, `addProvider`, `updateProvider`, `deleteProvider`, `toggleProviderStatus`, gestión de filtros (`setFilters`, `updateFilter`, `removeFilter`, `clearFilters`)

**Nota**: Al eliminar un hotel invalida el catálogo de habitaciones (la base borra en cascada sus
`hotel_rooms`).

---

## 2.3 Bus Store (`use-bus-store.ts`)

**Estado**: `loading`, `error` (de las escrituras)

**Getters**:
- `buses` — el catálogo (`busesCatalogQuery`); `isLoaded`, `loadError`
- `activeBuses`
- `getBusById` — memoizado
- `getBusesByProvider` — mapa pre-computado `providerId → Bus[]`
- `totalBuses`

**Actions**: `refetch`, `addBus`, `updateBus`, `deleteBus`, `toggleBusStatus`

---

## 2.4 Coordinator Store (`use-coordinator-store.ts`)

**Estado**: `loading`, `error` (de las escrituras)

**Getters**: `coordinators` — el catálogo (`coordinatorsCatalogQuery`); `isLoaded`, `loadError`, `allCoordinators` (orden DESC por creación), `getCoordinatorById`

**Actions**: `refetch`, `addCoordinator`, `updateCoordinator`, `deleteCoordinator`, `inviteCoordinator`, `revokeCoordinatorAccess`

---

## 2.5 Traveler Store (`use-traveler-store.ts`)

Aplica patrón Repository + Domain: `composables/travelers/use-traveler-domain.ts` + `use-traveler-repository.ts`

Solo escrituras. Las lecturas van por `travelersByTravelQuery(travelId)` (viajeros del viaje +
asignaciones de habitación, en tandas de 1000) y `travelerDetailQuery(id)`; las derivaciones
(agrupar acompañantes, separar coordinadores) están en `use-traveler-domain`.

**Estado**: `loading`, `error`

**Actions**: `addTraveler`, `updateTraveler`, `deleteTraveler` (desvincula acompañantes), `changeTravelerSeat`, `setCoordinatorSeat`, `clearCoordinatorSeats`, `assignTravelerToRoom`, `removeTravelerFromRoom`. Cada una invalida `travelerKeys.root` y lo que cambia con ella (conteos de viajes, cotización, pagos).

---

## 2.6 Travel Store (`use-travel-store.ts`)

Aplica patrón Repository + Domain: `composables/travels/use-travel-domain.ts` + `use-travel-repository.ts`

Solo escrituras. Las lecturas van por `travelDetailQuery(id)` (viaje con sus relaciones),
`travelListQuery(filtros)` (listados paginados con conteo de viajeros en el servidor) y
`travelStatsQuery()` (totales por estado).

**Estado**: `loading`, `error`

**Actions**: `addTravel(data)` (inserts en travels, activities, services, buses, coordinators), `updateTravel`, `deleteTravel`, `updateTravelStatus`, `updateTravelBus`, `updateTravelAccommodation`, `addTravelRooms`, `deleteTravelRoom`. Cada una invalida `travelKeys.root`.

---

## 2.7 Payment Store (`use-payment-store.ts`)

Aplica patrón Repository + Domain: `composables/payments/use-payments-domain.ts` + `use-payments-repository.ts`

**Estado**: `payments[]`, `accountConfigs[]`, `loading`, `error`

**Getters**:
- `getPaymentsByTravel`, `getPaymentsByTraveler`, `getPaymentsByTravelerAndTravel`
- `getAccountConfig(travelerId, travelId)`
- `getTravelerPaymentSummary` — **cálculo complejo**:
  - Aplica precio de niño o precio público según config
  - Calcula descuentos (fijo / porcentaje)
  - Calcula recargos (fijo / porcentaje)
  - Determina status: `pending` / `partial` / `paid`
- `getTravelCashSummary`

**Actions**:
- `fetchByTravel(travelId)` — carga pagos + configs de cuenta
- `fetchByTraveler(travelerId)`
- `addPayment(data)` — valida que exista config y que no exceda balance
- `upsertAccountConfig` — crea o actualiza configuración de precios del viajero
- `deletePayment`

---

## 2.8 Hotel Room Store (`use-hotel-room-store.ts`)

Aplica patrón Repository + Domain: `composables/hotel-rooms/use-hotel-room-domain.ts` + `use-hotel-room-repository.ts`

**Estado**: `loading`, `error` (de las escrituras)

**Getters**:
- `hotelRoomsData` — el catálogo (`hotelRoomsCatalogQuery`); `isLoaded`, `loadError`
- `getRoomDataByProviderId`
- `hasRoomData`, `getTotalRoomsByProvider`, `getUsedRoomsByProvider`

**Actions**:
- `refetch`
- `initRoomData(providerId, totalRooms)` — crea entrada base si el hotel no tiene; revisa contra
  el catálogo fresco (`hotel_rooms` no tiene índice único por proveedor)
- `updateTotalRooms` — valida que no baje del conteo usado
- `addRoomType(providerId, data)` — calcula `costPerPerson` automáticamente
- `updateRoomType`, `deleteRoomType`

---

## 2.9 Quotation Store (`use-quotation-store.ts`)

Gestiona todo el flujo de cotización de un viaje. Aplica el patrón Repository + Domain:
- `app/composables/quotation/use-quotation-domain.ts` — lógica pura (calculateSeatPrice, countRoomsByType, findRoomsOutsideQuotation)
- `app/composables/quotation/use-quotation-repository.ts` — acceso a Supabase (~30 funciones, 8 tablas)
- `use-quotation-store.ts` — orquestación; guarda la copia que le pasa `quotationByTravelQuery`

**Estado**:
- `cotizaciones[]` — registros principales
- `proveedoresQuotation[]` — servicios de proveedores cotizados
- `pagosProveedor[]` — pagos a proveedores
- `hospedajesQuotation[]` — cotizaciones de hospedaje
- `pagosHospedaje[]` — pagos de hospedaje
- `publicPrices[]` — lista de precios públicos
- `busesApartados[]` — reservas de buses
- `pagosBus[]` — pagos de buses
- La query `quotationByTravelQuery(travelId)` decide cuándo pedir (dedupe, `staleTime`, refetch
  al volver a la pestaña) y copia cada resultado al store (`hydrateTravel`)

**Getters clave**:
- `getQuotationByTravel(travelId)`
- `getProvidersFullBusCost` — todos los proveedores
- `getProvidersMinimumSplitCost` / `getProvidersTotalSplitCost` — según split type
- `getAccommodationsTotalCost`
- `getReferencePriceMatrix` — matriz: precio por asiento + hospedaje por ocupación (queda en store porque depende de `useProviderStore` y `useHotelRoomStore`)
- Pagos de proveedores, hospedajes y buses: pagado, pendiente, pagado de más y estado. Los tres
  salen de `createSupplierPaymentSlice`; los componentes los leen con `useSupplierPaymentApi(kind)`

**Actions**:
- `fetchByTravel(travelId, { force })` — pasa por la caché de la query (`refresh` / `fetch`)
- CRUD completo para: cotización principal, proveedores, hospedajes, buses, precios públicos
- Pagos: `addProviderPayment`, `addAccommodationPayment`, `addBusPayment` (y sus updates/deletes)
- `confirmQuotation(id)` — confirma cotización

---

[← Tipos TypeScript](./01-types.md) | [Volver al índice](./README.md) | [Siguiente: Componentes →](./03-components.md)
