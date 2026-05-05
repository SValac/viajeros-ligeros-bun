# 2. Pinia Stores

Todos los stores viven en `app/stores/`. Usan Composition API (`defineStore` con `setup`). El estado se sincroniza con Supabase — no hay localStorage.

El plugin `app/plugins/init-stores.client.ts` carga todos los stores en paralelo al iniciar la app.

### Patrón Repository + Domain

Todos los stores aplican el patrón de tres capas:

| Capa | Ubicación | Responsabilidad |
|---|---|---|
| **Domain** | `app/composables/<feature>/use-<feature>-domain.ts` | Lógica pura, funciones síncronas, sin Supabase ni stores |
| **Repository** | `app/composables/<feature>/use-<feature>-repository.ts` | Acceso a Supabase, mapeo a dominio, lanza errores tal cual |
| **Store** | `app/stores/use-<feature>-store.ts` | Estado reactivo, cache, loading/error, orquestación cross-store |

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

**Estado**: `providers[]`, `loading`, `error`, `activeFilters`

**Getters**:
- `allProviders` — ordenados por nombre (localización española)
- `activeProviders` — solo `active = true`
- `getProviderById`, `getProvidersByCategory`
- `statsByCategory` — conteo por categoría
- `filteredProviders` — aplica `activeFilters`
- `availableCiudades`, `availableEstados` — valores únicos para filtros
- `filteredCount`, `hasActiveFilters`

**Actions**: `fetchAll`, `addProvider`, `updateProvider`, `deleteProvider`, `toggleProviderStatus`, gestión de filtros (`setFilters`, `updateFilter`, `removeFilter`, `clearFilters`)

**Nota**: Al eliminar un provider también elimina sus datos de hotel via `useHotelRoomStore`.

---

## 2.3 Bus Store (`use-bus-store.ts`)

**Estado**: `buses[]`, `loading`, `error`

**Getters**:
- `activeBuses`
- `getBusById` — memoizado
- `getBusesByProvider` — mapa pre-computado `providerId → Bus[]`
- `totalBuses`

**Actions**: `fetchAll`, `addBus`, `updateBus`, `deleteBus`, `toggleBusStatus`

---

## 2.4 Coordinator Store (`use-coordinator-store.ts`)

**Estado**: `coordinators[]`, `loading`, `error`

**Getters**: `allCoordinators` (orden DESC por creación), `getCoordinatorById`

**Actions**: `fetchAll`, `addCoordinator`, `updateCoordinator`, `deleteCoordinator`

---

## 2.5 Traveler Store (`use-traveler-store.ts`)

Aplica patrón Repository + Domain: `composables/travelers/use-traveler-domain.ts` + `use-traveler-repository.ts`

**Estado**: `travelers[]`, `filters`, `loading`, `error`

**Getters**:
- `allTravelers` — DESC por creación
- `getTravelerById`, `getTravelersByTravel`, `getTravelersByBus`
- `getGroupMembers(representativeId)` — agrupa acompañantes
- `filteredTravelers` — filtrado básico
- `filteredGroupedTravelers` — jerarquía representante → hijos

**Actions**:
- `fetchAll`, `fetchByTravel(travelId)`
- `addTraveler`, `updateTraveler`
- `deleteTraveler` — desvincula acompañantes en cascada
- `setFilters`, `clearFilters`

---

## 2.6 Travel Store (`use-travel-store.ts`)

Aplica patrón Repository + Domain: `composables/travels/use-travel-domain.ts` + `use-travel-repository.ts`

**Estado**: `travels[]`, `loading`, `error`

**Getters**:
- `allTravels` — DESC por creación
- `getTravelById`, `getTravelsByStatus`
- `stats` — conteo por status
- `totalRevenue` — suma de viajes `confirmed` + `completed`

**Actions**:
- `fetchAll()` — carga viajes con todas las relaciones (actividades, servicios, buses, coordinadores)
- `addTravel(data)` — orquesta inserts en múltiples tablas vía repositorio (travels, activities, services, buses, coordinators)
- `updateTravel`, `deleteTravel`

---

## 2.7 Payment Store (`use-payment-store.ts`)

Aplica patrón Repository + Domain: `composables/payments/use-payments-domain.ts` + `use-payments-repository.ts`

**Estado**: `payments[]`, `accountConfigs[]`, `filters`, `loading`, `error`

**Getters**:
- `allPayments` — DESC por fecha
- `getPaymentById`, `getPaymentsByTravel`, `getPaymentsByTraveler`, `getPaymentsByTravelerAndTravel`
- `getAccountConfig(travelerId, travelId)`
- `getTravelerPaymentSummary` — **cálculo complejo**:
  - Aplica precio de niño o precio público según config
  - Calcula descuentos (fijo / porcentaje)
  - Calcula recargos (fijo / porcentaje)
  - Determina status: `pending` / `partial` / `paid`
- `filteredPayments` — por viaje, viajero, tipo, rango de fechas
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

**Estado**: `hotelRoomsData[]`, `loading`, `error`

**Getters**:
- `getRoomDataByProviderId`
- `hasRoomData`, `getTotalRoomsByProvider`, `getUsedRoomsByProvider`

**Actions**:
- `fetchAll()` — con tipos de habitación anidados
- `initRoomData(providerId, totalRooms)` — crea entrada base
- `updateTotalRooms` — valida que no baje del conteo usado
- `addRoomType(providerId, data)` — calcula `costPerPerson` automáticamente
- `updateRoomType`, `deleteRoomType`
- `deleteProviderRooms(providerId)` — limpieza al borrar proveedor

---

## 2.9 Quotation Store (`use-cotizacion-store.ts`)

Gestiona todo el flujo de cotización de un viaje. Aplica el patrón Repository + Domain:
- `app/composables/quotation/use-quotation-domain.ts` — lógica pura (calcPaymentStatus, calcSeatPrice, buildDesiredRoomsMap, reconcileAccommodations)
- `app/composables/quotation/use-quotation-repository.ts` — acceso a Supabase (~30 funciones, 8 tablas)
- `use-cotizacion-store.ts` — orquestación, cache reactivo, cross-store

**Estado**:
- `cotizaciones[]` — registros principales
- `proveedoresQuotation[]` — servicios de proveedores cotizados
- `pagosProveedor[]` — pagos a proveedores
- `hospedajesQuotation[]` — cotizaciones de hospedaje
- `pagosHospedaje[]` — pagos de hospedaje
- `preciosPublicos[]` — lista de precios públicos
- `busesApartados[]` — reservas de buses
- `pagosBus[]` — pagos de buses
- Cache interno: `travelFetchCache`, `travelFetchInFlight` (evita llamadas duplicadas)

**Getters clave**:
- `getCotizacionByTravel(travelId)`
- `getCostoTotal` — todos los proveedores
- `getCostoTipoMinimo` / `getCostoTipoTotal` — según split type
- `getTotalCostoHospedajes`
- `getMatrizPreciosReferencia` — matriz: precio por asiento + hospedaje por ocupación (queda en store porque depende de `useProviderStore` y `useHotelRoomStore`)
- Estados de pago: proveedores, hospedajes, buses

**Actions**:
- `fetchAll()`, `fetchByTravel(travelId)` — con caché anti-duplicado
- CRUD completo para: cotización principal, proveedores, hospedajes, buses, precios públicos
- Pagos: `addProviderPayment`, `addAccommodationPayment`, `addBusPayment` (y sus updates/deletes)
- `confirmQuotation(id)` — confirma cotización

---

[← Tipos TypeScript](./01-types.md) | [Volver al índice](./README.md) | [Siguiente: Componentes →](./03-components.md)
