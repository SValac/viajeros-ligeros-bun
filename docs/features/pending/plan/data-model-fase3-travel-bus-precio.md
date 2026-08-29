# Fase 3 — Eliminar `travel_buses.rental_price` y el código muerto

**Estado:** Pendiente
**Dependencia:** Fase 2
**Migración:** `supabase migration new drop_travel_buses_rental_price`

---

## Objetivo

Eliminar la copia denormalizada del costo del autobús dentro de `travel_buses`, y borrar el
camino manual muerto que la sostenía.

Con esto, `travel_buses` queda **sin ninguna columna financiera** — y la vista
`coordinator_travel_buses` del plan de coordinadores deja de hacer falta.

---

## Por qué se puede eliminar

`travel_buses.rental_price` es una **copia literal** de `quotation_buses.total_cost`,
escrita en dos lugares:

```ts
// use-quotation-repository.ts:577 — al crear
rental_price: quotationBus.totalCost,

// use-quotation-repository.ts:627 — al actualizar
.update({ rental_price: updated.totalCost }).eq('quotation_bus_id', id)
```

No es un snapshot histórico deliberado: es duplicación sincronizada a mano. El único lugar
que la **mostraba** es `travel-bus-list.vue:134`, que es código muerto.

### ⚠️ Verificar antes de borrar

Si existen filas donde los valores **no** coinciden, hay historia real ahí y la decisión
cambia:

```sql
SELECT tb.id, tb.rental_price, qb.total_cost
FROM public.travel_buses tb
JOIN public.quotation_buses qb ON qb.id = tb.quotation_bus_id
WHERE tb.rental_price IS DISTINCT FROM qb.total_cost;

-- Filas creadas por el camino manual (sin cotización asociada)
SELECT count(*) FROM public.travel_buses WHERE quotation_bus_id IS NULL;
```

- **Ambas dan 0** → adelante, es duplicación pura.
- **La primera trae filas** → hay divergencia. Decidir si es un bug de sincronización
  (arreglar y seguir) o un dato intencional (entonces no se borra).
- **La segunda trae filas** → existen buses creados por el camino manual antes de que
  muriera. Su precio no está en ninguna cotización: **exportarlo antes de borrar.**

---

## Bloque 1: la migración

```sql
ALTER TABLE public.travel_buses DROP COLUMN rental_price;
```

---

## Bloque 2: borrar el código muerto

El camino manual de alta de autobuses en un viaje **no está conectado a ningún template**.
Confirmado: ningún `.vue` referencia `<TravelBusForm>` ni `<TravelBusList>`.

| Archivo / símbolo | Acción |
|---|---|
| `app/components/travel-bus-form.vue` | 🗑️ Borrar |
| `app/components/travel-bus-list.vue` | 🗑️ Borrar |
| `use-travel-store.ts` → `addTravelBus` | 🗑️ Borrar (sin llamadores) |
| `use-travel-repository.ts` → `insertTravelBus` | 🗑️ Borrar |
| `use-travel-repository.ts` → `insertBuses` | ⚠️ Ver abajo |
| `use-travel-store.ts` → `updateTravelBus` | ✅ **Conservar** — lo usa `travel-buses-section.vue:98` |

### El caso de `insertBuses`

Se llama en `use-travel-store.ts:98`, dentro de `addTravel`:

```ts
if (data.buses.length > 0)
  extras.buses = await repository.insertBuses(travel.id, data.buses);
```

Pero `travel-form.vue:173` pasa `buses: travel?.buses ?? []`, y al **crear** un viaje no
hay `travel` previo → la lista siempre llega vacía. La rama nunca se ejecuta hoy.

**No borrarlo a ciegas.** Confirmar primero que no exista un flujo de "duplicar viaje" que
sí la use. Si no existe, sacar `insertBuses`, el campo `buses` de `TravelFormData` y la
rama del store. Si hay dudas, **dejarlo** — es inofensivo y no bloquea nada de esta feature.

### Lo que se conserva

`travel-buses-section.vue` es el componente **vivo** (`[id]/index.vue:433` y
`[id]/edit.vue:118`). Itera sobre `QuotationBus`, resuelve el `travel_bus` con
`getTravelBusForQuotationBus()` y guarda **solo los operadores**. No toca `rental_price`,
así que esta fase no lo afecta.

### Cambios de tipos y mappers

| Archivo | Línea | Cambio |
|---|---|---|
| `app/types/travel.ts` | 37 | Quitar `rentalPrice: number` de `TravelBus` |
| `app/utils/mappers.ts` | 208 | Quitar de `mapTravelBusRowToDomain` |
| `use-quotation-repository.ts` | 577 | Quitar del `insert` |
| `use-quotation-repository.ts` | 626-627 | El `.update()` queda **sin campos** → borrar el statement entero |

⚠️ **Ojo con `use-quotation-repository.ts:626`.** `rental_price` es lo único que ese
`.update()` escribe, así que dejarlo con un objeto vacío no es un no-op inofensivo: hay que
eliminar el bloque completo, incluido su manejo de error.

> **Ese bloque vuelve en la [Fase 4](data-model-fase4-travel-bus-satelite.md)**, pero
> sincronizando lo que corresponde (`provider_id`, `model`, `seat_count`) en vez del costo.
> Borrarlo acá no empeora nada —esas tres columnas ya estaban sin sincronizar— pero deja el
> código momentáneamente sin ningún punto de propagación. Si preferís no abrir esa ventana,
> **reemplazá** el bloque acá mismo con el de la Fase 4 en vez de borrarlo y reponerlo.

---

## Gotchas

1. **Cómo verificar que un componente está muerto en Nuxt.** Los componentes se
   auto-importan por nombre, así que no hay `import` que seguir. Buscar el nombre en
   PascalCase en los templates:
   ```bash
   grep -rn "TravelBusForm\|TravelBusList" app/
   ```
   Cuidado con los falsos positivos por substring: `BusList` matchea `TravelBusList`, y
   `BusForm` matchea `PagoBusForm`, `CotizacionBusForm` y `QuotationBusFormData`.

2. **Borrar en el orden correcto:** primero los componentes, después las funciones del
   store, después las del repository. Al revés, `typecheck` explota con errores en cadena
   que ocultan lo importante.

3. **Este es el borrado más grande de la feature.** Si algo se siente dudoso, `git` es la
   red: commitear la migración y el borrado por separado para poder revertir uno sin el
   otro.

---

## Verificación

- [ ] Las dos queries de control dieron 0 (o su resultado se analizó y documentó)
- [ ] Export de precios de buses sin cotización, si los había
- [ ] La sección de autobuses del viaje se ve bien en `[id]/index.vue` y en `edit.vue`
- [ ] Guardar operadores de un bus → persiste
- [ ] Asignar coordinadores a un bus → sigue funcionando
- [ ] Crear un bus desde el flujo de **cotización** → se crea su `travel_buses`
- [ ] Actualizar el costo de un bus en la cotización → no rompe nada
- [ ] Eliminar un bus de la cotización → cascade correcto
- [ ] `grep -rn "rentalPrice\|rental_price" app/` → **sin resultados**
- [ ] `grep -rn "TravelBusForm\|TravelBusList" app/` → sin resultados
- [ ] `bun run db:types`, `bun run typecheck`, `bun run lint` limpios

---

## Comandos (los corre el usuario)

```bash
supabase migration new drop_travel_buses_rental_price
bun run db:reset
bun run db:types
bun run typecheck && bun run lint:fix
```
