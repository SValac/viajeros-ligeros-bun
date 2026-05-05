# Refactor: use-cotizacion-store

**Objetivo:** Aplicar el patrón Repository + Domain composables al store de cotización.
Sin cambios en la API pública del store ni en las páginas.

**Patrón elegido:** Repository + Domain composables  
**Complejidad:** Muy Alta — el store más grande del proyecto (2111 líneas), 8 tablas,
~26 acciones async, Promise.all en fetchByTravel  
**Estado:** Todas las fases completadas ✅

---

## Índice de documentos por fase

| Documento | Contenido | Estado |
|---|---|---|
| [refactor-cotizacion-fase1-domain.md](refactor-cotizacion-fase1-domain.md) | Crear `use-cotizacion-domain.ts` (4 funciones puras) | Completada ✅ |
| [refactor-cotizacion-fase2a-repository-reads.md](refactor-cotizacion-fase2a-repository-reads.md) | Crear repositorio con `fetchAll` y `fetchByTravel` | Completada ✅ |
| [refactor-cotizacion-fase2b-repository-writes-simple.md](refactor-cotizacion-fase2b-repository-writes-simple.md) | Migrar 18 operaciones CRUD de una tabla al repositorio | Completada ✅ |
| [refactor-cotizacion-fase2c-repository-writes-complex.md](refactor-cotizacion-fase2c-repository-writes-complex.md) | Migrar 6 operaciones multi-tabla + helpers de sync | Completada ✅ |
| [refactor-cotizacion-fase3-cleanup.md](refactor-cotizacion-fase3-cleanup.md) | Limpieza final + verificación de capas | Completada ✅ |

---

## Rol del asistente

**Modo:** Mentor / Guía de implementación  
**Comportamiento:** Explicar el *por qué* antes de cada cambio, no realizar cambios
al código a menos que el usuario lo pida explícitamente. El usuario escribe el código
y corre `bun run typecheck` después de cada acción migrada.

**Skills a cargar:**
```
@.claude/skills/vue
@.claude/skills/vue-best-practices
@.claude/skills/nuxt
@.claude/skills/pinia
@.claude/skills/supabase
```

**Contexto de referencia:**
- Store refactorizado (referencia): `app/stores/use-traveler-store.ts`
- Repositorio simple (referencia): `app/composables/travelers/use-traveler-repository.ts`
- Dominio (referencia): `app/composables/travelers/use-traveler-domain.ts`
- Repositorio con Promise.all (referencia): `app/composables/travels/use-travel-repository.ts`

---

## Estructura objetivo

```
app/
├── composables/
│   └── quotation/
│       ├── use-quotation-domain.ts       ← lógica pura (CREADO ✅)
│       └── use-quotation-repository.ts   ← acceso Supabase (NUEVO)
├── stores/
│   └── use-cotizacion-store.ts           ← orquestación + cache (MODIFICADO)
└── types/
    └── quotation.ts                      ← agregar CotizacionFetchResult (MODIFICADO)
```

---

## Fase 0 — Análisis ✅ COMPLETADA

### Tablas (8 propias + 3 auxiliares)

**Propias:**
- `quotations` — cotización principal
- `quotation_providers` — proveedores en cotización
- `provider_payments` — pagos a proveedores
- `quotation_accommodations` — hospedajes (con detalles anidados)
- `quotation_accommodation_details` — detalle de habitaciones (child de accommodation)
- `accommodation_payments` — pagos de hospedajes
- `quotation_buses` — autobuses apartados
- `bus_payments` — pagos de autobuses

**Auxiliares (no propias, se leen/escriben pero no son el dominio principal):**
- `travel_buses` — se crea/actualiza como side effect de buses apartados
- `travel_accommodations` — se sincroniza desde hospedajes de cotización
- `travelers` — se lee para detectar habitaciones ocupadas

### Estado del store

| Ref | Tipo | Descripción |
|---|---|---|
| `cotizaciones` | `ref<Quotation[]>` | Array de cotizaciones |
| `proveedoresQuotation` | `ref<QuotationProvider[]>` | Proveedores en cotizaciones |
| `pagosProveedor` | `ref<ProviderPayment[]>` | Pagos a proveedores |
| `hospedajesQuotation` | `ref<QuotationAccommodation[]>` | Hospedajes con detalles |
| `pagosHospedaje` | `ref<AccommodationPayment[]>` | Pagos de hospedajes |
| `preciosPublicos` | `ref<QuotationPublicPrice[]>` | Precios al público |
| `busesApartados` | `ref<QuotationBus[]>` | Autobuses apartados |
| `pagosBus` | `ref<BusPayment[]>` | Pagos de autobuses |
| `loading` | `shallowRef<boolean>` | Indicador de carga |
| `error` | `shallowRef<string\|null>` | Mensaje de error |
| `filters` | `ref<QuotationProviderFilters>` | Filtros activos |
| `travelFetchCache` | `Set<string>` | IDs de viajes ya fetched |
| `travelFetchInFlight` | `Map<string, Promise<void>>` | Dedup de fetches concurrentes |

### Clasificación de operaciones

**READ (2):** `fetchAll`, `fetchByTravel`

**WRITE_SIMPLE (18)** — una tabla, una operación:
- quotations: `createQuotation`, `updateQuotation`
- quotation_providers: `addProveedorQuotation`, `updateProveedorQuotation`, `deleteProveedorQuotation`, `toggleConfirmadoProveedor`
- provider_payments: `addProviderPayment`, `updateProviderPayment`, `deleteProviderPayment`
- quotation_accommodations: `toggleConfirmadoHospedaje`
- accommodation_payments: `addPagoHospedaje`, `updatePagoHospedaje`, `deletePagoHospedaje`
- quotation_public_prices: `addPrecioPublico`, `updatePrecioPublico`, `deletePrecioPublico`
- bus_payments: `addBusPayment`, `updateBusPayment`, `deleteBusPayment`

**WRITE_COMPLEX (6)** — múltiples tablas o replace pattern:
- `addHospedajeQuotation` → INSERT accommodation + INSERT N details
- `updateHospedajeQuotation` → UPDATE accommodation + DELETE details + INSERT new details
- `deleteHospedajeQuotation` → DELETE accommodation (cascade en DB)
- `addBusQuotation` → INSERT quotation_bus + INSERT travel_bus
- `updateBusQuotation` → UPDATE quotation_bus + UPDATE travel_bus.rental_price
- `deleteBusQuotation` → DELETE quotation_bus (cascade)

**SYNC HELPERS (3)** — orquestación DB + cross-store:
- `_syncPrecioToTravel` → UPDATE quotations.seat_price + llama travelStore
- `_addTravelBusForQuotation` → INSERT travel_bus + actualiza travelStore local
- `_syncHospedajeToTravel` → SELECT travelers + DELETE/INSERT travel_accommodations + llama travelStore

### Lógica de dominio identificada (para Fase 1)

| Función | Origen en store | Por qué al dominio |
|---|---|---|
| `calcPaymentStatus(paid, total)` | Repetida 3 veces en store | Eliminar duplicación |
| `calcSeatPrice(cotizacion, providers, buses)` | `getPrecioAsientoCalculado` (líneas 252–273) | Fórmula de negocio central |
| `buildDesiredRoomsMap(hospedajes)` | Primer bloque de `_syncHospedajeToTravel` | Puro, testeable |
| `reconcileAccommodations(desired, existing, occupiedIds)` | Algoritmo de `_syncHospedajeToTravel` (líneas 640–695) | ~80 líneas de lógica pura |

### fetchByTravel — estructura del Promise.all

```
Paso 1: SELECT quotations WHERE travel_id → quotRow (o null)
Paso 2 (si existe): Promise.all([
  quotation_providers + provider_payments nested,
  quotation_accommodations + quotation_accommodation_details + accommodation_payments nested,
  quotation_public_prices,
  quotation_buses + bus_payments nested,
])
→ Retorna CotizacionFetchResult (tipo nuevo en ~/types/quotation.ts)
```

---

## Decisiones de diseño

| Decisión | Justificación |
|---|---|
| `Promise.all` en el repositorio | Estrategia de acceso a datos; el store no debe saber cómo se paraleliza |
| `CotizacionFetchResult` como tipo DTO | Contrato claro entre repositorio y store para fetchByTravel |
| `_syncHospedajeToTravel` split: dominio + repositorio + store | El algoritmo de reconciliación es dominio puro; las queries DB van al repo; cross-store queda en el store |
| Getters simples (filter/reduce) quedan en store | Son acceso a cache, no lógica de negocio |
| `getMatrizPreciosReferencia` queda en store | Depende de `useProviderStore()` y `useHotelRoomStore()` — no puede ser función pura |
| Fases 2A/2B/2C separadas | Por el volumen (26 acciones), permite typecheck incremental |

---

## Advertencia

Este es el store más complejo del proyecto. Recomendaciones:
1. Hacer `bun run typecheck` después de **cada acción** migrada, no al final de la fase
2. Seguir el orden de fases estrictamente — las dependencias entre fases son reales
3. Probar manualmente los flujos de sincronización (hospedajes → travel_accommodations,
   precio → travel.price) después de cada fase que los afecte
