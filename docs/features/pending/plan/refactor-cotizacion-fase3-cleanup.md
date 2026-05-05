# Refactor Cotización — Fase 3: Limpieza Final

**Objetivo:** Verificar que cada capa tiene exactamente lo que debe tener.
Eliminar código muerto. Sin cambios funcionales.

**Dependencia:** Fases 1, 2A, 2B y 2C completadas.  
**Estado:** Completada ✅

---

## Checklist por archivo

### `app/composables/cotizacion/use-cotizacion-domain.ts`

- [ ] No importa `useSupabase` ni ningún client de Supabase
- [ ] No importa ningún store de Pinia (`useTravelsStore`, etc.)
- [ ] Todas las funciones son síncronas (sin `async`)
- [ ] No tiene estado reactivo (`ref`, `computed`, `reactive`)
- [ ] Exporta exactamente: `calcPaymentStatus`, `calcSeatPrice`,
  `buildDesiredRoomsMap`, `reconcileAccommodations` (y `useCotizacionDomain` que las engloba)
- [ ] Los tipos internos (`RoomSlot`, `DesiredGroup`, `ReconcileResult`) están definidos

---

### `app/composables/cotizacion/use-cotizacion-repository.ts`

- [ ] No modifica ningún `ref`, `reactive` ni estado de Pinia
- [ ] No importa ni llama a `useTravelsStore` ni ningún otro store
- [ ] Cada función hace exactamente una operación Supabase (o un Promise.all de queries)
- [ ] Todas las funciones retornan datos mapeados a dominio (usando los mappers de `~/utils/mappers`)
- [ ] Todas las funciones lanzan el error tal cual (`throw error`) — sin swallowing
- [ ] Exporta las funciones de Fase 2A + 2B + 2C a través de `return { ... }`

**Funciones esperadas en el repositorio (lista completa):**
```
Reads:         fetchAll, fetchByTravel
Quotations:    createQuotation, updateQuotation, updateSeatPrice
Providers:     addProvider, updateProvider, deleteProvider, toggleProviderConfirmado
ProvPayments:  addProviderPayment, updateProviderPayment, deleteProviderPayment
Accommodations: addAccommodation, updateAccommodation, deleteAccommodation, toggleAccommodationConfirmado
AccPayments:   addAccommodationPayment, updateAccommodationPayment, deleteAccommodationPayment
PublicPrices:  addPublicPrice, updatePublicPrice, deletePublicPrice
Buses:         addBus, updateBus, deleteBus
BusPayments:   addBusPayment, updateBusPayment, deleteBusPayment
Sync helpers:  getOccupiedAccommodationIds, deleteUnoccupiedAccommodations, insertTravelAccommodations
```
Total: ~30 funciones

---

### `app/stores/use-cotizacion-store.ts`

- [ ] **No contiene** ninguna llamada directa a `supabase.from(...)` o `supabase.rpc(...)`
- [ ] **No contiene** `const supabase = useSupabase()` (si se eliminaron todas las llamadas directas)
- [ ] Contiene `const domain = useCotizacionDomain()` y `const repository = useCotizacionRepository()`
- [ ] Los helpers privados `_syncPrecioToTravel`, `_addTravelBusForQuotation`, `_syncHospedajeToTravel`
  usan `repository.*` y `domain.*` para las operaciones DB y cálculos
- [ ] La API pública del store **no cambió**: todas las funciones retornadas siguen siendo las mismas
- [ ] Los importes en la parte superior están limpios (eliminar mappers y tipos no usados directamente)

---

## Pasos de limpieza

**3.1** Revisar imports en `use-cotizacion-store.ts`:
- Eliminar importaciones de mappers que ahora solo usa el repositorio
- Eliminar tipos de `~/types/database.types` que ya no se usan directamente
- Verificar que `formatBedConfiguration` (de `~/utils/hotel-room-helpers`) sigue siendo necesario
  en el store (lo usa `getMatrizPreciosReferencia` — este getter puede quedarse en el store
  porque depende de otros stores, `useProviderStore()` y `useHotelRoomStore()`)

**3.2** Confirmar que `getMatrizPreciosReferencia` queda en el store:
- Esta función llama a `useProviderStore()` y `useHotelRoomStore()` — no puede ir al dominio
- Queda como `computed` en el store; es una excepción justificada

**3.3** Eliminar cualquier variable o función privada que haya quedado obsoleta tras las fases anteriores.

**3.4** Verificar que `travelFetchCache` y `travelFetchInFlight` siguen funcionando correctamente
tras la migración de `fetchByTravel` a `repository.fetchByTravel()`.

---

## Verificación final

**Typecheck y lint:**
- `bun run typecheck` — sin errores
- `bun run lint:fix` — limpio

**Test manual completo:**

| Escenario | Verificar |
|---|---|
| Navegar a cotización de un viaje nuevo | Datos cargan correctamente |
| Agregar proveedor | Aparece en la lista; precio se recalcula |
| Agregar pago a proveedor | Saldo pendiente se actualiza |
| Toggle confirmado en proveedor | Estado cambia |
| Agregar hospedaje con N habitaciones | Habitaciones aparecen en la sección de viajeros del viaje |
| Actualizar hospedaje (cambiar cantidad) | Habitaciones se reconcilian sin borrar ocupadas |
| Eliminar hospedaje | Habitaciones del viaje se eliminan (las no ocupadas) |
| Agregar precio público | Aparece en matriz de precios de referencia |
| Agregar autobús apartado | Aparece en la lista de autobuses del viaje |
| Cambiar precio de autobús | Precio del viaje se actualiza |
| Confirmar cotización | Estado cambia a confirmed; precio del viaje se sincroniza |
| Navegar entre dos viajes distintos | Cada viaje carga su propia cotización (sin duplicados) |

---

## Decisiones de diseño

| Decisión | Justificación |
|---|---|
| `getMatrizPreciosReferencia` queda en store | Depende de `useProviderStore()` y `useHotelRoomStore()` — no puede ser función pura de dominio |
| `travelFetchCache` y `travelFetchInFlight` quedan en store | Son optimizaciones de UI state (dedup de requests), no de acceso a datos |
| Sin cambios en API pública | Las páginas `cotizacion.vue`, `cotizacion-proveedor.vue`, etc. no se tocan en ninguna fase |
