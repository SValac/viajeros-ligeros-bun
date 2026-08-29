# Fase 2 — Eliminar `buses.rental_price` del catálogo

**Estado:** Pendiente
**Dependencia:** Ninguna
**Migración:** `supabase migration new drop_buses_rental_price`

---

## Objetivo

Sacar el precio del **catálogo de autobuses del proveedor**. El precio de un autobús no es
un atributo del vehículo: es el resultado de una negociación, y ese resultado ya vive en
`quotation_buses.total_cost`.

---

## Por qué el catálogo no debería tener precio

`buses` describe **el vehículo**: proveedor, modelo, marca, año, cantidad de asientos.
`rental_price` es un dato de **otra naturaleza** — cambia por temporada, por duración, por
negociación, y no es una propiedad del autobús.

Tenerlo ahí genera tres problemas concretos:

1. **Envejece en silencio.** Nadie actualiza el catálogo cuando cambia una tarifa, así que
   el número que se muestra deja de ser cierto sin que nada avise.
2. **Es la tercera copia** del mismo precio (catálogo → cotización → viaje).
3. **Es un dato comercial dentro de una tabla de referencia**, justo la clase de mezcla que
   esta feature está desarmando.

Su único uso real hoy es **prellenar un formulario que está muerto**
(`travel-bus-form.vue:107`, ver Fase 3).

---

## Alcance del cambio

```sql
ALTER TABLE public.buses DROP COLUMN rental_price;
```

Es `NOT NULL` hoy, así que no hay nada que preservar salvo los valores mismos. **Exportarlos
antes** si sirven como referencia histórica de tarifas:

```sql
-- Guardar antes de borrar, por las dudas
SELECT b.id, p.name AS proveedor, b.model, b.brand, b.rental_price
FROM public.buses b
JOIN public.providers p ON p.id = b.provider_id
ORDER BY p.name;
```

### Código afectado

| Archivo | Línea | Cambio |
|---|---|---|
| `app/types/bus.ts` | 8 | Quitar `rentalPrice: number` de `Bus` |
| `app/utils/mappers.ts` | 116, 130 | Quitar del mapper de fila y del de insert |
| `app/components/bus-form.vue` | 37, 49, 63, 133-137 | Quitar el campo del schema Zod, del estado, del submit y del template |
| `app/components/bus-list.vue` | 140-143 | Quitar la columna de la tabla |
| `app/components/travel-bus-form.vue` | 107 | Muere con el archivo en la Fase 3 |

`BusFormData` y `BusUpdateData` derivan de `Bus` con `Omit`, así que se actualizan solos.

⚠️ **`bus-form.vue` valida `rentalPrice` con Zod.** Hay que sacarlo del schema **y** del
objeto de estado inicial, o el form queda con un campo fantasma que rompe el submit.

---

## Gotchas

1. **`bus-list.vue` está vivo** — lo usa `app/pages/providers/bus-agencies/[id].vue:39`.
   No confundirlo con `travel-bus-list.vue`, que sí es código muerto (Fase 3).
2. **Verificar que ningún reporte lo consuma** antes de borrar. Búsqueda de control:
   ```bash
   grep -rn "rentalPrice" app/ | grep -v travel-bus
   ```
   Debería quedar vacío al terminar la fase.
3. **`DROP COLUMN` es irreversible.** Exportar primero si el histórico de tarifas importa.
4. Esta fase **no toca** `travel_buses.rental_price` — es la Fase 3. Se separan porque
   tienen razones distintas: acá el precio no pertenece a la tabla; allá es una copia.

---

## Verificación

- [ ] Export de los precios guardado (si se decidió conservarlo)
- [ ] El catálogo de autobuses de un proveedor lista y se ve bien, sin la columna
- [ ] Crear un autobús nuevo en el catálogo → funciona, sin campo de precio
- [ ] Editar un autobús existente → funciona
- [ ] El flujo de cotización de buses sigue intacto (ahí vive el precio real)
- [ ] `grep -rn "rentalPrice" app/ | grep -v travel-bus` → sin resultados
- [ ] `bun run db:types`, `bun run typecheck`, `bun run lint` limpios

---

## Comandos (los corre el usuario)

```bash
supabase migration new drop_buses_rental_price
bun run db:reset
bun run db:types
bun run typecheck && bun run lint:fix
```
