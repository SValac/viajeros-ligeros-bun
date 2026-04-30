# Refactor Cotización — Fase 2C: Repositorio (Mutaciones Complejas)

**Objetivo:** Migrar las 6 operaciones multi-tabla + los 3 helpers de sincronización
DB al repositorio. Al terminar esta fase, el store no debe tener ningún `supabase.from()`
directo — solo orquestación, cache y llamadas cross-store.

**Dependencia:** Fases 1, 2A y 2B completadas.  
**Estado:** Pendiente

---

## Rol del asistente

**Modo:** Mentor / Guía de implementación  
**Comportamiento:** Esta es la fase más compleja. Explicar con detalle el *por qué*
del split entre repositorio y store en cada función. No escribir código a menos que
el usuario lo pida. El usuario escribe y corre typecheck después de cada sección.

---

## Visión general: qué va dónde

Estas funciones tienen operaciones DB **y** orquestación de store. La regla:

| Parte | Va al... |
|---|---|
| Queries / INSERT / UPDATE / DELETE a Supabase | Repositorio |
| Actualización de `loading`, `error` | Store |
| Actualización de arrays reactivos (cotizaciones, hospedajesQuotation, etc.) | Store |
| Llamadas a `useTravelsStore()` | Store (cross-store orchestration) |
| Algoritmo de reconciliación de habitaciones | Dominio (ya hecho en Fase 1) |

---

## Sección 1: Hospedajes (3 funciones → 2 tablas)

### `addAccommodation` en repositorio

**Origen en store:** `addHospedajeQuotation` — la parte DB (INSERT accommodation + INSERT details).

```ts
async function addAccommodation(
  quotationId: string,
  data: QuotationAccommodationFormData,
  detallesEnriquecidos: DetalleEnriquecido[],
  totalCost: number,
): Promise<{ accommodation: QuotationAccommodation; details: QuotationAccommodationDetail[] }>
```

Operaciones:
1. INSERT en `quotation_accommodations` (con totalCost calculado)
2. INSERT en `quotation_accommodation_details` (N filas, una por detalle)
3. Retornar ambos objetos mapeados

> **Nota:** `detallesEnriquecidos` (con `costPerPerson` calculado) viene del store.
> El cálculo `pricePerNight / maxOccupancy` se mantiene en el store porque usa
> datos del formulario que ya están en memoria.

---

### `updateAccommodation` en repositorio

**Origen en store:** `updateHospedajeQuotation` — patrón delete-insert en details.

```ts
async function updateAccommodation(
  id: string,
  data: QuotationAccommodationFormData,
  detallesEnriquecidos: DetalleEnriquecido[],
  totalCost: number,
): Promise<{ accommodation: QuotationAccommodation; details: QuotationAccommodationDetail[] }>
```

Operaciones:
1. UPDATE `quotation_accommodations` WHERE id
2. DELETE `quotation_accommodation_details` WHERE quotation_accommodation_id = id
3. INSERT nuevos `quotation_accommodation_details` (N filas)
4. Retornar ambos objetos mapeados

---

### `deleteAccommodation` en repositorio

```ts
async function deleteAccommodation(id: string): Promise<void>
// → DELETE quotation_accommodations WHERE id
// → La FK con ON DELETE CASCADE elimina los details en DB automáticamente
```

---

## Sección 2: Autobuses (3 funciones → quotation_buses + travel_buses)

### `addBus` en repositorio

**Origen en store:** `addBusQuotation` — INSERT quotation_bus + INSERT travel_bus.

```ts
async function addBus(
  data: QuotationBusFormData,
  travelId: string,
): Promise<{ quotationBus: QuotationBus; travelBusRow: Tables<'travel_buses'> }>
```

Operaciones:
1. INSERT en `quotation_buses`, retornar el row mapeado
2. INSERT en `travel_buses` (vinculado al quotation_bus recién creado)
3. Retornar `{ quotationBus, travelBusRow }` — el store necesita el `travelBusRow` para
   actualizar `useTravelsStore()` localmente

---

### `updateBus` en repositorio

**Origen en store:** `updateBusQuotation` — UPDATE quotation_bus + UPDATE travel_bus.rental_price.

```ts
async function updateBus(
  id: string,
  data: QuotationBusFormData,
): Promise<QuotationBus>
```

Operaciones:
1. UPDATE `quotation_buses` WHERE id
2. UPDATE `travel_buses` SET rental_price WHERE quotation_bus_id = id
3. Retornar el quotation_bus actualizado

---

### `deleteBus` en repositorio

```ts
async function deleteBus(id: string): Promise<void>
// → DELETE quotation_buses WHERE id
// → La FK con ON DELETE CASCADE elimina bus_payments en DB
// → El travel_bus vinculado también tiene CASCADE (verificar en schema)
```

> **Importante:** Verificar que la FK `travel_buses.quotation_bus_id` tiene
> `ON DELETE CASCADE` en el schema. Si no, el repositorio debe hacer el DELETE
> de `travel_buses` explícitamente antes de borrar el quotation_bus.

---

## Sección 3: Helpers de sincronización DB

Estas 4 funciones son extraídas de `_syncHospedajeToTravel` y `_syncPrecioToTravel`.
Cada una es una operación DB pura — sin lógica de negocio.

### `updateSeatPrice` en repositorio

**Origen:** `_syncPrecioToTravel` — la operación `supabase.from('quotations').update({ seat_price })`.

```ts
async function updateSeatPrice(quotationId: string, price: number): Promise<void>
// → UPDATE quotations SET seat_price WHERE id
```

---

### `getOccupiedAccommodationIds` en repositorio

**Origen:** Query dentro de `_syncHospedajeToTravel` (líneas ~628–636).

```ts
async function getOccupiedAccommodationIds(travelId: string): Promise<Set<string>>
// → SELECT travel_accommodation_id FROM travelers
//   WHERE travel_id = travelId AND travel_accommodation_id IS NOT NULL
// → Retorna Set<string> con los IDs ocupados
```

---

### `deleteUnoccupiedAccommodations` en repositorio

**Origen:** Bloque DELETE dentro de `_syncHospedajeToTravel` (líneas ~699–706).

```ts
async function deleteUnoccupiedAccommodations(ids: string[]): Promise<void>
// → DELETE travel_accommodations WHERE id IN (ids)
// → No hace nada si ids está vacío
```

---

### `insertTravelAccommodations` en repositorio

**Origen:** Bloque INSERT dentro de `_syncHospedajeToTravel` (líneas ~709–726).

```ts
async function insertTravelAccommodations(
  travelId: string,
  slots: RoomSlot[],
): Promise<TravelAccommodation[]>
// → INSERT travel_accommodations (travelId, providerId, hotelRoomTypeId, maxOccupancy, ...)
// → Retorna las filas insertadas mapeadas con mapTravelAccommodationRowToDomain
```

---

## Cómo queda el store después de 2C

### `_syncPrecioToTravel` en store (después)

```ts
async function _syncPrecioToTravel(quotationId: string): Promise<void> {
  const cotizacion = cotizaciones.value.find(c => c.id === quotationId);
  if (!cotizacion || cotizacion.status === 'confirmed') return;
  if (cotizacion.minimumSeatTarget === 0) return;

  const nuevoPrecio = domain.calcSeatPrice(
    cotizacion,
    proveedoresQuotation.value.filter(p => p.quotationId === quotationId),
    busesApartados.value.filter(b => b.quotationId === quotationId),
  );
  if (nuevoPrecio === 0) return;

  await repository.updateSeatPrice(quotationId, nuevoPrecio);  // ← DB al repo

  // Actualizar estado local (queda en store)
  const index = cotizaciones.value.findIndex(c => c.id === quotationId);
  if (index !== -1 && cotizaciones.value[index]) {
    cotizaciones.value[index] = { ...cotizaciones.value[index]!, seatPrice: nuevoPrecio };
  }

  // Cross-store (queda en store)
  const travelStore = useTravelsStore();
  await travelStore.updateTravel(cotizacion.travelId, { price: nuevoPrecio });
}
```

---

### `_syncHospedajeToTravel` en store (después)

```ts
async function _syncHospedajeToTravel(quotationId: string): Promise<{ skippedOccupied: number }> {
  const cotizacion = cotizaciones.value.find(c => c.id === quotationId);
  if (!cotizacion || cotizacion.status === 'confirmed') return { skippedOccupied: 0 };

  const travelStore = useTravelsStore();
  const travelId = cotizacion.travelId;

  // Dominio: construir desired
  const desired = domain.buildDesiredRoomsMap(
    hospedajesQuotation.value.filter(h => h.quotationId === quotationId),
  );

  // Estado local
  const existing = travelStore.getAccommodationsByTravel(travelId);

  // Repositorio: query DB
  const occupiedIds = await repository.getOccupiedAccommodationIds(travelId);

  // Dominio: algoritmo puro de reconciliación
  const { toDeleteIds, toInsert, skippedOccupied } = domain.reconcileAccommodations(
    desired, existing, occupiedIds,
  );

  // Repositorio: ejecutar cambios DB
  if (toDeleteIds.length > 0) {
    await repository.deleteUnoccupiedAccommodations(toDeleteIds);
  }

  let inserted: TravelAccommodation[] = [];
  if (toInsert.length > 0) {
    inserted = await repository.insertTravelAccommodations(travelId, toInsert);
  }

  // Cross-store (queda en store)
  travelStore.updateLocalAccommodations(travelId, new Set(toDeleteIds), inserted);
  return { skippedOccupied };
}
```

---

## Verificación de Fase 2C

Después de cada sección (hospedajes, autobuses, sync helpers):
- `bun run typecheck` sin errores

Al finalizar:
- `bun run lint:fix` limpio
- El store **no contiene** ningún `supabase.from(...)` directo (excepto `const supabase = useSupabase()` si se usara en otra cosa — verificar)
- Test manual:
  - Agregar hospedaje → habitaciones aparecen en el viaje
  - Actualizar hospedaje → habitaciones se reconcilian sin borrar ocupadas
  - Eliminar hospedaje → habitaciones del viaje se eliminan
  - Agregar autobús → aparece en el viaje
  - Cambiar precio proveedor → precio del viaje se actualiza
  - Confirmar cotización → estado cambia y precio del viaje se sincroniza

---

## Decisiones de diseño

| Decisión | Justificación |
|---|---|
| `_syncPrecioToTravel` y `_syncHospedajeToTravel` quedan en el store | Contienen cross-store orchestration (`useTravelsStore()`); el repositorio no debe referenciar otros stores |
| Helpers de sync DB son funciones pequeñas y enfocadas en el repo | Facilita testing individual y reutilización futura |
| `addBus` retorna `travelBusRow` crudo (sin mapear) | El store lo mapea con `mapTravelBusRowToDomain` para actualizar `travelStore.travels` — el repositorio no sabe nada del travels store |
| `_syncHospedajeToTravel` usa dominio + repositorio | El algoritmo de reconciliación (dominio) es puro y testeable; las operaciones DB (repo) son simples |
