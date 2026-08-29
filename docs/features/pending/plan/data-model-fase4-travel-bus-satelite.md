# Fase 4 — Formalizar `travel_buses` como satélite de `quotation_buses`

**Estado:** Pendiente — **es una decisión, no una tarea**
**Dependencia:** Fase 3
**Migración:** `supabase migration new travel_buses_satellite`

---

## ⚠️ Esta fase es opcional

**No bloquea el acceso de coordinadores.** Con la Fase 3 terminada, `travel_buses` ya no
tiene columnas financieras y el plan de coordinadores funciona con una policy RLS normal.

Lo de acá es **higiene de modelo**: eliminar duplicación que hoy no molesta pero que va a
envejecer mal. Si la prioridad es llegar a la app de coordinadores, **posponer esta fase es
una decisión legítima** — está documentada y se puede retomar cuando sea.

---

## El hallazgo

`travel_buses` fue diseñada como tabla autónoma (alta manual del autobús de un viaje), pero
**en la práctica ya funciona como satélite de `quotation_buses`**. Sus filas las crea el
flujo de cotización, vinculadas por `quotation_bus_id`, y el camino manual murió (Fase 3).

Columna por columna:

| Columna de `travel_buses` | Origen | ¿Duplica? |
|---|---|---|
| `provider_id` | `quotationBus.providerId` | ✅ sí |
| `model` | `quotationBus.unitNumber` | ✅ sí |
| `seat_count` | `quotationBus.capacity` | ✅ sí |
| `brand`, `year` | catálogo, vía el form muerto | ⚠️ hoy sin fuente |
| `bus_id` | catálogo, vía el form muerto | ⚠️ hoy sin fuente |
| `operator1_name/phone` | asignación operativa | ❌ **propio** |
| `operator2_name/phone` | asignación operativa | ❌ **propio** |
| `quotation_bus_id` | el vínculo | ❌ propio |

De 12 columnas, **solo 5 llevan información propia**.

---

## Por qué NO mover los operadores a `quotation_buses`

Es la alternativa obvia —una tabla menos— y es la **decisión equivocada**, por la misma
razón que motiva toda esta feature.

`quotation_buses` es una tabla **financiera**: `total_cost`, `payment_method`,
`split_type`, `confirmed`. Mover ahí los datos de los operadores obligaría a darle acceso a
esa tabla a cualquier rol que necesite saber quién maneja el autobús — **el coordinador,
exactamente el caso que estamos habilitando**. Volveríamos a mezclar lo operativo con lo
comercial en una sola fila, que es el problema del que venimos.

**La separación correcta es la que ya existe:** la cotización es de la agencia, los
operadores son de la operación. Lo que falta es que el esquema lo diga.

---

## El cambio propuesto

```sql
-- 1. Toda fila debe venir de una cotización, y una cotización tiene un solo travel_bus
ALTER TABLE public.travel_buses
  ALTER COLUMN quotation_bus_id SET NOT NULL;

ALTER TABLE public.travel_buses
  ADD CONSTRAINT travel_buses_quotation_bus_id_key UNIQUE (quotation_bus_id);

-- 2. Quitar los duplicados
ALTER TABLE public.travel_buses
  DROP COLUMN provider_id,
  DROP COLUMN model,
  DROP COLUMN seat_count,
  DROP COLUMN brand,
  DROP COLUMN year,
  DROP COLUMN bus_id;
```

`travel_buses` queda como: `id`, `travel_id`, `quotation_bus_id`, y los cuatro campos de
operadores. Una tabla que hace **una sola cosa**: decir quién maneja cada autobús de cada
viaje.

### Prerequisito

El `SET NOT NULL` falla si existen filas con `quotation_bus_id IS NULL` (creadas por el
camino manual antes de que muriera). La query de control está en la Fase 3. Si las hay:
vincularlas a mano a su cotización, o borrarlas si son basura de pruebas. **Resolver esto
antes de correr la migración**, no durante.

### Impacto en el código

`travel-buses-section.vue` ya itera sobre `QuotationBus` y usa `travel_buses` solo para los
operadores, así que **el componente vivo casi no cambia**. Lo que hay que revisar es de
dónde lee marca/modelo/capacidad para mostrarlas: si hoy las toma del `TravelBus`, pasan a
salir del `QuotationBus` que ya tiene en la mano.

| Archivo | Cambio |
|---|---|
| `app/types/travel.ts` | `TravelBus` se reduce a `id`, `travelId`, `quotationBusId`, operadores |
| `app/utils/mappers.ts:198` | `mapTravelBusRowToDomain` se simplifica |
| `use-quotation-repository.ts:568` | El `insert` deja de copiar provider/model/seat_count |
| `use-travel-repository.ts:243-268` | `updateTravelBus` solo acepta campos de operador |
| `travel-buses-section.vue` | Verificar de dónde salen los datos del vehículo |

---

## Riesgos

1. **Es el cambio más invasivo de la feature** y el de menor beneficio inmediato. Por eso
   es opcional y va al final.
2. **`DROP COLUMN` irreversible** sobre datos de producción. `brand`, `year` y `bus_id`
   pueden tener valores cargados por el form manual que no están en ninguna cotización —
   **exportar antes**:
   ```sql
   SELECT id, travel_id, bus_id, brand, year, model, seat_count
   FROM public.travel_buses
   WHERE bus_id IS NOT NULL OR brand IS NOT NULL OR year IS NOT NULL;
   ```
3. **Si alguna vez vuelve el alta manual de autobuses** (un bus de último momento sin pasar
   por cotización), `quotation_bus_id NOT NULL` lo bloquea. Vale preguntarse si ese
   escenario es real antes de cerrar la puerta. Si lo es, hacer solo el `UNIQUE` y el
   `DROP` de duplicados, y dejar la columna nullable.

---

## Decisión pendiente

Tres caminos, en orden de ambición:

| | Qué se hace | Cuándo elegirlo |
|---|---|---|
| **A** | Nada — cerrar la feature en la Fase 3 | La prioridad es llegar a coordinadores |
| **B** | Solo `UNIQUE` + `DROP` de duplicados, `quotation_bus_id` sigue nullable | Se quiere limpiar pero preservar la puerta del alta manual |
| **C** | Todo lo de arriba, incluido `NOT NULL` | Se confirma que todo bus nace de una cotización |

**Recomendación: B.** Elimina la duplicación real —que es el problema— sin cerrar
irreversiblemente un flujo de negocio que nadie confirmó que esté muerto. `NOT NULL` se
puede agregar después con una migración de una línea; recuperar un flujo eliminado cuesta
mucho más.

---

## Verificación

Si se ejecuta (B o C):

- [ ] Export de `bus_id` / `brand` / `year` guardado
- [ ] Cero filas con `quotation_bus_id IS NULL` (solo si se va por C)
- [ ] La sección de autobuses del viaje muestra marca/modelo/capacidad correctamente,
      leyéndolas de la cotización
- [ ] Guardar operadores → persiste
- [ ] Crear un bus desde la cotización → crea su `travel_buses`
- [ ] Intentar crear dos `travel_buses` para el mismo `quotation_bus_id` → falla por
      `UNIQUE`
- [ ] Eliminar un bus de la cotización → cascade correcto
- [ ] `bun run db:types`, `bun run typecheck`, `bun run lint` limpios
