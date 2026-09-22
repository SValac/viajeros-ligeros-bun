# Refactor Cotización — Fase 2A: Repositorio (Lecturas)

**Objetivo:** Crear el esqueleto de `use-cotizacion-repository.ts` con las dos
operaciones de lectura: `fetchAll` y `fetchByTravel`. El store deja de llamar
a Supabase directamente en estas funciones.

**Dependencia:** Fase 1 completada.  
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
  ├── use-cotizacion-domain.ts      ← ya existe (Fase 1)
  └── use-cotizacion-repository.ts  ← NUEVO (esta fase: solo reads)
app/stores/
  └── use-cotizacion-store.ts       ← MODIFICADO
~/types/
  └── quotation.ts                  ← MODIFICADO (agregar CotizacionFetchResult)
```

---

## Tipo nuevo: `CotizacionFetchResult`

Agregar en `~/types/quotation.ts`:

```ts
export type CotizacionFetchResult = {
  quotation: Quotation;
  providers: QuotationProvider[];
  providerPayments: ProviderPayment[];
  accommodations: QuotationAccommodation[];
  accommodationPayments: AccommodationPayment[];
  publicPrices: QuotationPublicPrice[];
  buses: QuotationBus[];
  busPayments: BusPayment[];
};
```

Este tipo es el contrato entre el repositorio y el store para `fetchByTravel`.
El store recibe un objeto estructurado ya mapeado a dominio y solo tiene que
hacer el merge en el estado reactivo.

---

## Funciones del repositorio (Fase 2A)

```ts
export function useCotizacionRepository() {
  const supabase = useSupabase();

  async function fetchAll(): Promise<Quotation[]>

  async function fetchByTravel(travelId: string): Promise<CotizacionFetchResult | null>

  return { fetchAll, fetchByTravel }
  // (en fases siguientes se agregarán más métodos)
}
```

### `fetchAll()`

Una sola query, sin joins:
```ts
const { data, error } = await supabase
  .from('quotations')
  .select('*')
  .order('created_at', { ascending: false });

if (error) throw error;
return data.map(mapQuotationRowToDomain);
```

---

### `fetchByTravel(travelId)`

**El más complejo del proyecto.** Dos pasos:

**Paso 1 — obtener la cotización:**
```ts
const { data: quotRow, error: quotErr } = await supabase
  .from('quotations')
  .select('*')
  .eq('travel_id', travelId)
  .maybeSingle();

if (quotErr) throw quotErr;
if (!quotRow) return null;

const quotationId = quotRow.id;
```

**Paso 2 — Promise.all con las 4 tablas relacionadas:**
```ts
const [
  providersResult,
  accommodationsResult,
  publicPricesResult,
  busesResult,
] = await Promise.all([
  supabase
    .from('quotation_providers')
    .select('*, provider_payments(*)')
    .eq('quotation_id', quotationId),
  supabase
    .from('quotation_accommodations')
    .select('*, quotation_accommodation_details(*), accommodation_payments(*)')
    .eq('quotation_id', quotationId),
  supabase
    .from('quotation_public_prices')
    .select('*')
    .eq('quotation_id', quotationId),
  supabase
    .from('quotation_buses')
    .select('*, bus_payments(*)')
    .eq('quotation_id', quotationId),
]);
```

**Paso 3 — verificar errores y mapear:**
- Verificar errores de cada result (`if (result.error) throw result.error`)
- Mapear providers → separar `provider_payments` de la fila del provider
- Mapear accommodations → separar `quotation_accommodation_details` y `accommodation_payments`
  - Para cada detalle: agregar `costPerPerson = pricePerNight / maxOccupancy`
- Mapear buses → separar `bus_payments` de la fila del bus

**Retornar:**
```ts
return {
  quotation: mapQuotationRowToDomain(quotRow),
  providers,
  providerPayments,
  accommodations,
  accommodationPayments,
  publicPrices: (publicPricesResult.data ?? []).map(mapQuotationPublicPriceRowToDomain),
  buses,
  busPayments,
};
```

> **Nota importante:** El mapeo del detalle de accommodation incluye computar
> `costPerPerson = d.price_per_night / d.max_occupancy` (línea ~854 del store actual).
> Este cálculo va en el repositorio porque es parte del proceso de transformar
> la fila DB al objeto de dominio.

---

## Actualizar store (Fase 2A)

**2A.1** Agregar al inicio del store:
```ts
const repository = useCotizacionRepository()
```

**2A.2** Reemplazar `fetchAll()`:
```ts
// Antes:
const { data, error: err } = await supabase.from('quotations').select('*')...
cotizaciones.value = (data ?? []).map(mapQuotationRowToDomain);

// Después:
cotizaciones.value = await repository.fetchAll();
```

**2A.3** Reemplazar `fetchByTravel()` — la lógica del `run()` interno:

El store mantiene:
- La lógica del cache (`travelFetchCache`, `travelFetchInFlight`)
- El manejo de `loading`/`error`
- La lógica de "si null: limpiar entidades de ese travelId del cache"
- El merge de estado en los 8 arrays reactivos

El store delega al repositorio:
- Las queries a Supabase (todo el bloque `supabase.from(...)`)
- El mapeo de filas a objetos de dominio

```ts
// En el try del run():
const result = await repository.fetchByTravel(travelId);

if (!result) {
  // limpiar cache local si existía (misma lógica que antes)
  ...
  travelFetchCache.add(travelId);
  return;
}

// Merge en estado reactivo (igual que antes, pero con result.*)
cotizaciones.value = [...cotizaciones.value.filter(c => c.travelId !== travelId), result.quotation];
proveedoresQuotation.value = [...filtrados, ...result.providers];
pagosProveedor.value = [...filtrados, ...result.providerPayments];
// ... etc.
```

**2A.4** Verificación de Fase 2A:
- `bun run typecheck` sin errores
- `bun run lint:fix` limpio
- El store no contiene `supabase.from('quotations').select` en `fetchAll` ni `fetchByTravel`
- Test manual: navegar a cotizacion de un viaje → datos cargan correctamente
- Test manual: navegar a dos viajes distintos → cada uno carga su cotización (no duplicados)

---

## Decisiones de diseño

| Decisión | Justificación |
|---|---|
| `Promise.all` en el repositorio, no en el store | Es estrategia de acceso a datos (paralelismo de I/O); el store no debería saber cómo se buscan los datos |
| `fetchByTravel` retorna `null` si no hay cotización | Permite al store distinguir "no existe" de "error"; más claro que retornar objeto vacío |
| Cache y in-flight dedup quedan en el store | Son preocupaciones de UI state, no de acceso a datos |
| Merge de estado en el store, no en el repositorio | El repositorio no toca estado reactivo; el store decide cómo integrar los datos nuevos |
