# Refactor Cotización — Fase 2B: Repositorio (Mutaciones Simples)

**Objetivo:** Migrar las 18 operaciones CRUD de una sola tabla al repositorio.
Son las mutaciones más mecánicas: una función = una tabla = una operación Supabase.

**Dependencia:** Fase 2A completada.  
**Estado:** Completada ✅

---

## Rol del asistente

**Modo:** Mentor / Guía de implementación  
**Comportamiento:** Explicar el *por qué* antes de cada grupo de funciones.
No escribir código a menos que el usuario lo pida. El usuario escribe y corre
typecheck después de cada sección.

---

## Estrategia: migrar por sección temática

Por el volumen (18 funciones), migrar en 5 grupos pequeños, corriendo typecheck
después de cada grupo. Esto evita acumular errores que sean difíciles de depurar.

**Orden recomendado:**
1. `quotations` (2 funciones) — las más simples, establecen el patrón
2. `quotation_providers` (4 funciones)
3. `provider_payments` (3 funciones)
4. `accommodation_payments` + `toggleConfirmadoHospedaje` (4 funciones)
5. `quotation_public_prices` (3 funciones) + `bus_payments` (3 funciones)

---

## Patrón de cada función del repositorio

Todas siguen el mismo patrón:

```ts
async function operacion(params): Promise<ReturnType> {
  const { data, error } = await supabase
    .from('tabla')
    .operacion(payload)
    .select()   // si retorna datos
    .single();  // si retorna una sola fila

  if (error) throw error;
  return mapXxxRowToDomain(data);  // o void para deletes
}
```

Reglas:
- **Nunca** maneja `loading`, `error`, validaciones de negocio — eso queda en el store
- **Siempre** mapea a objeto de dominio antes de retornar
- **Siempre** lanza el error tal cual (`throw error`) — el store decide cómo manejarlo

---

## Grupo 1: `quotations` (2 funciones)

Agregar en `use-cotizacion-repository.ts`:

```ts
async function createQuotation(data: QuotationFormData): Promise<Quotation>
// → INSERT en quotations, retorna mapQuotationRowToDomain(row)

async function updateQuotation(
  id: string,
  update: TablesUpdate<'quotations'>,
): Promise<Quotation>
// → UPDATE quotations WHERE id, retorna mapQuotationRowToDomain(row)
```

> **Nota:** El store actual construye el objeto `update: TablesUpdate<'quotations'>`
> con `if (data.X !== undefined) update.x = data.X`. Esa lógica queda en el store
> (es una decisión de negocio sobre qué campos actualizar). El repositorio recibe
> el objeto ya construido y lo persiste.

---

## Grupo 2: `quotation_providers` (4 funciones)

```ts
async function addProvider(data: QuotationProviderFormData): Promise<QuotationProvider>
// → INSERT en quotation_providers, retorna mapQuotationProviderRowToDomain(row)

async function updateProvider(
  id: string,
  update: TablesUpdate<'quotation_providers'>,
): Promise<QuotationProvider>
// → UPDATE quotation_providers WHERE id

async function deleteProvider(id: string): Promise<void>
// → DELETE quotation_providers WHERE id (sin retorno)

async function toggleProviderConfirmado(id: string, confirmed: boolean): Promise<void>
// → UPDATE quotation_providers SET confirmed WHERE id (sin retorno)
```

> **¿Por qué `toggleProviderConfirmado` sin retorno?** El store ya tiene el valor
> correcto en memoria (lo setea optimistamente o post-operación). Un void es
> suficiente; si lanza error, el store lo captura y revierte si es necesario.

---

## Grupo 3: `provider_payments` (3 funciones)

```ts
async function addProviderPayment(data: ProviderPaymentFormData): Promise<ProviderPayment>
// → INSERT en provider_payments, retorna mapProviderPaymentRowToDomain(row)

async function updateProviderPayment(
  id: string,
  update: TablesUpdate<'provider_payments'>,
): Promise<ProviderPayment>
// → UPDATE provider_payments WHERE id

async function deleteProviderPayment(id: string): Promise<void>
// → DELETE provider_payments WHERE id
```

---

## Grupo 4: `quotation_accommodations` + `accommodation_payments` (4 funciones)

```ts
// quotation_accommodations
async function toggleAccommodationConfirmado(id: string, confirmed: boolean): Promise<void>
// → UPDATE quotation_accommodations SET confirmed WHERE id

// accommodation_payments
async function addAccommodationPayment(
  data: AccommodationPaymentFormData,
): Promise<AccommodationPayment>

async function updateAccommodationPayment(
  id: string,
  update: TablesUpdate<'accommodation_payments'>,
): Promise<AccommodationPayment>

async function deleteAccommodationPayment(id: string): Promise<void>
```

---

## Grupo 5: `quotation_public_prices` + `bus_payments` (6 funciones)

```ts
// quotation_public_prices
async function addPublicPrice(data: QuotationPublicPriceFormData): Promise<QuotationPublicPrice>
async function updatePublicPrice(
  id: string,
  update: TablesUpdate<'quotation_public_prices'>,
): Promise<QuotationPublicPrice>
async function deletePublicPrice(id: string): Promise<void>

// bus_payments
async function addBusPayment(data: BusPaymentFormData): Promise<BusPayment>
async function updateBusPayment(
  id: string,
  update: TablesUpdate<'bus_payments'>,
): Promise<BusPayment>
async function deleteBusPayment(id: string): Promise<void>
```

---

## Actualizar store (por cada grupo)

Para cada función migrada, en el store:

1. Reemplazar el bloque `supabase.from(...)` por `repository.metodo(...)`
2. Mantener en el store:
   - `loading.value = true / false`
   - `error.value = ...`
   - validaciones previas (cotización confirmed, saldo pendiente, etc.)
   - actualización del array reactivo (push, filter, reemplazo por índice)
   - llamadas a `_syncPrecioToTravel` o `_syncHospedajeToTravel` si aplica

**Ejemplo antes/después para `addProviderPayment`:**

```ts
// ANTES (en store):
const { data: row, error: err } = await supabase
  .from('provider_payments')
  .insert(mapProviderPaymentToInsert(data))
  .select()
  .single();
if (err) throw err;
const payment = mapProviderPaymentRowToDomain(row);
pagosProveedor.value.push(payment);
return payment;

// DESPUÉS (en store):
const payment = await repository.addProviderPayment(data);
pagosProveedor.value.push(payment);
return payment;
```

---

## Verificación de Fase 2B

Correr typecheck después de cada grupo de funciones:
- `bun run typecheck` sin errores
- `bun run lint:fix` limpio

Al finalizar el grupo 5:
- El store no debe contener `supabase.from('quotation_providers')`,
  `supabase.from('provider_payments')`, `supabase.from('accommodation_payments')`,
  `supabase.from('quotation_public_prices')`, `supabase.from('bus_payments')`
  en las acciones simples
- Test manual: agregar/editar/eliminar proveedor y sus pagos
- Test manual: agregar/editar/eliminar precio público
- Test manual: agregar/editar/eliminar pago de autobús

---

## Decisiones de diseño

| Decisión | Justificación |
|---|---|
| `TablesUpdate<'tabla'>` como parámetro en vez de tipo de dominio | El store ya construye el objeto de actualización con validaciones condicionales; el repositorio recibe el payload final |
| `toggle*` retorna void | El store gestiona el estado local; un error implica que algo fue mal, no que necesita el row actualizado |
| Migrar por grupos, typecheck entre grupos | El store tiene ~600 líneas de acciones; errores acumulados son costosos de depurar |
