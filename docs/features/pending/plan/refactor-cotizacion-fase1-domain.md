# Refactor Cotización — Fase 1: Dominio

**Objetivo:** Crear `use-cotizacion-domain.ts` con las funciones de lógica pura
extraídas del store. Sin cambios en la API pública del store ni en las páginas.

**Dependencia:** Ninguna — esta es la primera fase.  
**Estado:** Completada ✅

---

## Rol del asistente

**Modo:** Mentor / Guía de implementación  
**Comportamiento:** Explicar el *por qué* antes de cada paso. No escribir código
a menos que el usuario lo pida explícitamente. El usuario escribe y corre typecheck.

---

## Estructura objetivo

```
app/composables/cotizacion/
  └── use-cotizacion-domain.ts   ← NUEVO
app/stores/
  └── use-cotizacion-store.ts    ← MODIFICADO (consume domain)
```

---

## Qué va al dominio

Solo las funciones con lógica de negocio no trivial. Los getters simples
(`filter`, `reduce`, `find`) quedan como `computed` en el store — son acceso
a cache, no lógica de negocio.

### Función 1 — `calcPaymentStatus`

**Origen:** Lógica repetida 3 veces en el store:
- `getProviderPaymentStatus` (líneas ~328–340)
- `getAccommodationPaymentStatus` (líneas ~374–386)
- `getBusPaymentStatus` (líneas ~479–491)

**Firma:**
```ts
export function calcPaymentStatus(
  paid: number,
  total: number,
): 'pending' | 'partial' | 'paid'
```

**Lógica:** `if (paid <= 0) 'pending'; if (paid >= total) 'paid'; else 'partial'`

---

### Función 2 — `calcSeatPrice`

**Origen:** Inline de `getPrecioAsientoCalculado` computed (líneas ~252–273).
Es la fórmula central del negocio: calcula el precio por asiento a partir de
los costos divididos por el tipo de split.

**Firma:**
```ts
export function calcSeatPrice(
  cotizacion: Pick<Quotation, 'minimumSeatTarget' | 'busCapacity'>,
  providers: Pick<QuotationProvider, 'totalCost' | 'splitType'>[],
  buses: Pick<QuotationBus, 'totalCost' | 'splitType'>[],
): number
```

**Lógica:**
```
costoMinimo     = sum(providers where splitType = 'minimum' | totalCost)
costoCapacidad  = sum(providers where splitType = 'total'   | totalCost)
busesMinimo     = sum(buses     where splitType = 'minimum' | totalCost)
busesTotal      = sum(buses     where splitType = 'total'   | totalCost)

parteMinimo    = minimumSeatTarget > 0 ? (costoMinimo + busesMinimo) / minimumSeatTarget : 0
parteCapacidad = busCapacity       > 0 ? (costoCapacidad + busesTotal) / busCapacity     : 0

return (parteMinimo + parteCapacidad === 0) ? 0 : Math.ceil(parteMinimo + parteCapacidad)
```

---

### Función 3 — `buildDesiredRoomsMap`

**Origen:** Primer bloque de `_syncHospedajeToTravel` (líneas ~604–623).
Construye el mapa de slots deseados a partir de los hospedajes de la cotización.

**Firma:**
```ts
type RoomSlot = { providerId: string; hotelRoomTypeId?: string; maxOccupancy: number };
type DesiredGroup = { key: string; slots: RoomSlot[] };

export function buildDesiredRoomsMap(
  hospedajes: QuotationAccommodation[],
): Map<string, DesiredGroup>
```

**Lógica:** Por cada hospedaje → por cada detalle → por cada unidad de `quantity`:
agrupa en `Map<"providerId:roomTypeId", DesiredGroup>`.

---

### Función 4 — `reconcileAccommodations`

**Origen:** Algoritmo principal de `_syncHospedajeToTravel` (líneas ~640–695).
Compara el estado deseado vs existente y produce las listas de IDs a eliminar
y slots a insertar. Es la lógica más compleja del store — encapsularla la hace
testeable sin Supabase.

**Firma:**
```ts
type ReconcileResult = {
  toDeleteIds: string[];
  toInsert: RoomSlot[];
  skippedOccupied: number;
};

export function reconcileAccommodations(
  desired: Map<string, DesiredGroup>,
  existing: TravelAccommodation[],
  occupiedIds: Set<string>,
): ReconcileResult
```

**Lógica:**
1. Agrupa `existing` en un Map por `"providerId:hotelRoomTypeId"`
2. Para cada grupo deseado: si `desired > existing` → agregar al `toInsert`;
   si `desired < existing` → marcar unoccupied del final para eliminar
3. Para grupos existentes que NO están en desired → marcar unoccupied para eliminar
4. Retorna `{ toDeleteIds, toInsert, skippedOccupied }`

---

## Pasos de implementación

**1.1** Crear `app/composables/cotizacion/use-cotizacion-domain.ts`:
- Exportar las 4 funciones puras listadas arriba
- Sin `import` de Supabase ni de stores Pinia
- Tipos `RoomSlot`, `DesiredGroup`, `ReconcileResult` pueden definirse en este archivo
  o en `~/types/quotation.ts` si se reusan

**1.2** Actualizar `app/stores/use-cotizacion-store.ts`:

```ts
// Al inicio del store (junto a los otros composables)
const domain = useCotizacionDomain()
```

Reemplazar en cada getter/acción:

| Origen en store | Reemplazar por |
|---|---|
| lógica inline de `getProviderPaymentStatus` | `domain.calcPaymentStatus(anticipado, proveedor.totalCost)` |
| lógica inline de `getAccommodationPaymentStatus` | `domain.calcPaymentStatus(anticipado, hospedaje.totalCost)` |
| lógica inline de `getBusPaymentStatus` | `domain.calcPaymentStatus(anticipado, bus.totalCost)` |
| cuerpo de `getPrecioAsientoCalculado` | `domain.calcSeatPrice(cotizacion, proveedoresQuotation.value.filter(...), busesApartados.value.filter(...))` |
| bloques de construcción del desired map en `_syncHospedajeToTravel` | `domain.buildDesiredRoomsMap(hospedajes)` |
| algoritmo de reconciliación en `_syncHospedajeToTravel` | `domain.reconcileAccommodations(desired, existing, occupiedIds)` |

**1.3** Verificación de Fase 1:
- `bun run typecheck` sin errores
- `bun run lint:fix` limpio
- `use-cotizacion-domain.ts` no importa Supabase ni Pinia
- Test manual: agregar/editar hospedaje → verificar que `travel_accommodations` se sincroniza
- Test manual: cambiar proveedor → verificar que el precio recalcula correctamente

---

## Decisiones de diseño

| Decisión | Justificación |
|---|---|
| Solo 4 funciones en dominio | Menos es más; getters simples (filter/reduce) son acceso a cache, no dominio |
| `calcSeatPrice` acepta arrays completos, no solo sums | El caller (computed) tiene acceso a los arrays; así la función puede filtrar por splitType internamente |
| Tipos internos en el archivo de dominio (RoomSlot, etc.) | Evitar contaminar `~/types/quotation.ts` con tipos de implementación interna |
| `useCotizacionDomain()` como composable (no export de funciones sueltas) | Consistente con el patrón ya establecido en `use-traveler-domain.ts` |
