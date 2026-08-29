# Fase 4 — Sincronizar `travel_buses` con `quotation_buses`

**Estado:** Pendiente
**Dependencia:** Fase 3
**Migración:** `supabase migration new travel_buses_sync_constraints`

---

## ⚠️ Esta fase cambió de propósito

La versión original proponía **quitar de `travel_buses` las columnas que "duplican"
`quotation_buses`** (`provider_id`, `model`, `seat_count`). **Eso quedó descartado.**

Decisión del usuario (2026-08-29): *"`travel_buses` es para saber qué autobuses están
registrados en ese viaje, y de qué agencia son — eso es totalmente visible para el
coordinador. Lo único que no debería poder ver es el costo del autobús que se pone cuando
se hace la cotización."*

El coordinador **no puede tener acceso a `quotation_buses`**: es donde vive `total_cost`. Si
`travel_buses` pierde esas columnas, la información que debe ver deja de ser alcanzable.

**La duplicación no es redundancia: es la proyección operativa del autobús, del lado
correcto de la frontera de seguridad.**

| Tabla | Rol | Quién la ve |
|---|---|---|
| `quotation_buses` | Vista **comercial**: `total_cost`, `payment_method`, `split_type`, `confirmed` | Solo admin |
| `travel_buses` | Vista **operativa**: proveedor, unidad, capacidad, operadores | Admin + coordinador |

Que ambas tengan el número de unidad y la capacidad es **deliberado**. Anotarlo en el
esquema para que nadie lo "optimice" más adelante.

Lo que sí hay que arreglar es un bug real de esa duplicación.

---

## 🔴 El bug: la sincronización está incompleta

`updateBus` (`app/composables/quotation/use-quotation-repository.ts:588-630`) actualiza
`quotation_buses` con todo lo que venga, pero propaga a `travel_buses` **una sola columna**:

```ts
const { error: travelBusErr } = await supabase
  .from('travel_buses')
  .update({ rental_price: updated.totalCost })   // ← lo único que sincroniza
  .eq('quotation_bus_id', id);
```

Si el admin cambia `provider_id`, `unit_number` o `capacity` en la cotización,
`travel_buses.provider_id`, `.model` y `.seat_count` **quedan desactualizados en silencio**.

**No es cosmético.** `travel_buses.seat_count` alimenta el mapa de asientos y la asignación
de viajeros:

- `app/components/traveler-form.vue:58` → `maxSeats`
- `app/pages/travels/[id]/travelers/index.vue:798` → `:total-seats`

Una capacidad desactualizada significa asientos que no existen, o asientos reales que la app
no ofrece.

### Ojo con el orden respecto de la Fase 3

La Fase 3 **borra ese bloque entero**, porque `rental_price` deja de existir. Eso no empeora
nada (las otras tres columnas ya estaban sin sincronizar), pero deja el código sin **ningún**
punto de propagación. Esta fase lo repone haciendo lo correcto.

Si preferís no dejar esa ventana abierta entre commits, se puede **reemplazar** el bloque
directamente en la Fase 3 en vez de borrarlo y volver a agregarlo acá. Las dos formas son
válidas; separarlas mantiene los commits atómicos (Fase 3 = quitar columna financiera,
Fase 4 = arreglar sincronización).

---

## Bloque 1: arreglar la propagación

En `updateBus`, reemplazar la actualización de una sola columna por la de las tres que
importan:

```ts
const travelBusUpdate: TablesUpdate<'travel_buses'> = {};
if (data.providerId !== undefined)
  travelBusUpdate.provider_id = updated.providerId;
if (data.unitNumber !== undefined)
  travelBusUpdate.model = updated.unitNumber;
if (data.capacity !== undefined)
  travelBusUpdate.seat_count = updated.capacity;

if (Object.keys(travelBusUpdate).length > 0) {
  const { error: travelBusErr } = await supabase
    .from('travel_buses')
    .update(travelBusUpdate)
    .eq('quotation_bus_id', id);

  if (travelBusErr)
    throw new Error(`No se pudo sincronizar el autobús del viaje: ${travelBusErr.message}`);
}
```

Se propaga **solo lo que vino en `data`**, siguiendo el mismo patrón condicional que ya usa
la función para `quotation_buses`. Así una edición que solo toca el costo no reescribe las
columnas operativas.

> **Alternativa considerada:** un trigger `AFTER UPDATE` en `quotation_buses`. Garantiza la
> propagación pase lo que pase, incluso desde SQL directo o desde otro cliente. Se
> **descarta** porque el proyecto no usa triggers para lógica de negocio (solo
> `moddatetime`), y esconder la sincronización en la base la vuelve invisible para quien lea
> el repository. Reconsiderar si aparece un segundo escritor de `quotation_buses`.

### El caso del `INSERT`

`insertBus` (`:568`) ya copia `provider_id`, `model` y `seat_count` correctamente al crear.
Lo único que cambia ahí es quitar `rental_price` — eso ya está en la Fase 3.

---

## Bloque 2: integridad del vínculo

```sql
ALTER TABLE public.travel_buses
  ADD CONSTRAINT travel_buses_quotation_bus_id_key UNIQUE (quotation_bus_id);
```

Un bus de la cotización debe tener **como máximo un** `travel_buses`. Hoy nada lo impide, y
si se duplicara, `updateBus` actualizaría las dos filas y la app mostraría el autobús
repetido.

⚠️ **Verificar antes** que no haya duplicados ya en la base, o la migración falla:

```sql
SELECT quotation_bus_id, count(*)
FROM public.travel_buses
WHERE quotation_bus_id IS NOT NULL
GROUP BY quotation_bus_id
HAVING count(*) > 1;
```

### Sobre `NOT NULL`

**No se agrega.** `UNIQUE` permite múltiples `NULL` en Postgres, así que la restricción no
molesta a las filas viejas del camino manual.

Poner `NOT NULL` cerraría para siempre la posibilidad de registrar un autobús sin cotización
—un bus de último momento, un reemplazo por avería en ruta— y nadie confirmó que ese
escenario esté muerto. Agregarlo después es una migración de una línea; recuperar un flujo
eliminado cuesta mucho más.

---

## Bloque 3: columnas sin escritor — ✅ **decidido: se quedan**

`brand`, `year` y `bus_id` solo los llenaba el formulario manual que muere en la Fase 3. El
flujo de cotización **no los escribe**, y `quotation_buses` ni siquiera tiene un vínculo al
catálogo del que sacarlos. Para toda fila nueva quedan en `NULL` permanentemente.

**Decisión del usuario (2026-08-29): dejarlas por ahora.** Esta fase **no las toca**.

Son tres columnas nullable que no cuestan nada, y la pregunta de fondo —¿el catálogo de
autobuses debería vincularse a la cotización?— es de producto, no de esquema. Borrarlas
sigue siendo fácil más adelante; borrarlas ahora cerraría la opción de repoblarlas.

Consecuencia práctica: **esta fase no aplica ningún `DROP COLUMN`**, así que no necesita
export previo ni entra en el bloque de advertencias de datos destructivos de la Fase 5. Es
la única fase de la feature que no borra nada.

> Si en el futuro se decide borrarlas, exportar primero las filas viejas que sí tienen
> datos:
> ```sql
> SELECT id, travel_id, bus_id, brand, year
> FROM public.travel_buses
> WHERE bus_id IS NOT NULL OR brand IS NOT NULL OR year IS NOT NULL;
> ```

---

## Fuera de alcance

**Qué pasa con los asientos ya asignados cuando cambia la capacidad.** Si un viaje tiene
viajeros en los asientos 40-45 y la cotización baja la capacidad a 38, quedan asientos
huérfanos: el `UNIQUE (travel_id, travel_bus_id, seat)` no valida contra `seat_count`, así
que nada avisa.

El usuario confirmó que **se está analizando una feature aparte para resolverlo**, con su
propio plan. Esta fase se limita a que la capacidad esté **actualizada**; qué hacer con los
viajeros afectados se decide allá.

---

## Verificación

- [ ] La query de duplicados del Bloque 2 devuelve 0 filas
- [ ] Cambiar la **capacidad** de un bus en la cotización → `travel_buses.seat_count` se
      actualiza
- [ ] El mapa de asientos refleja la capacidad nueva sin recargar la app
- [ ] Cambiar el **número de unidad** → `travel_buses.model` se actualiza
- [ ] Cambiar el **proveedor** → `travel_buses.provider_id` se actualiza
- [ ] Cambiar **solo el costo** → las columnas operativas **no** se tocan
- [ ] Crear un bus desde la cotización → `travel_buses` nace con los tres campos correctos
- [ ] Intentar dos `travel_buses` para el mismo `quotation_bus_id` → falla por `UNIQUE`
- [ ] Eliminar un bus de la cotización → cascade correcto
- [ ] Los operadores guardados sobreviven a una edición de la cotización
- [ ] `bun run db:types`, `bun run typecheck`, `bun run lint` limpios

---

## Comandos (los corre el usuario)

```bash
supabase migration new travel_buses_sync_constraints
bun run db:reset
bun run db:types
bun run typecheck && bun run lint:fix
```
