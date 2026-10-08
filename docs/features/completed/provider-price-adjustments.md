# Feature: Precios por tipo de persona en servicios por persona

**Estado:** ✅ COMPLETADA en la rama `feature/per-person-price-adjustments`; migración pendiente de push a stage y prod.

---

## Contexto

Un proveedor que cobra por persona no siempre cobra lo mismo a todos: la entrada de un niño
puede tener 10% de descuento, la de un adulto mayor $50 menos, un asiento VIP cuesta más.
Hasta ahora, en un servicio por persona (#117) al proveedor se le pagaba el mismo costo por
cada viajero que lo tomaba.

## Decisiones

- **Ajustes por servicio**: en un servicio "Costo por persona" se agregan precios por tipo de
  persona. Cada uno tiene un motivo ("Niños"), un tipo (descuento o aumento), un modo
  (porcentaje o cantidad) y un valor. Un descuento en porcentaje llega como máximo a 100%, y el
  precio resultante nunca baja de $0.
- **Dónde se capturan**:
  - En el form del proveedor, con "Costo por persona".
  - En la acción **"Precios por tipo de persona"** de la tabla, que también funciona con la
    cotización confirmada, porque los ajustes no tocan el precio del asiento.
  - La tabla muestra "N precios por tipo" bajo el costo y al hacer clic abre esa misma acción.
- **Un ajuste por viajero y servicio**: en la pestaña "Servicios por persona" del viaje, cada
  viajero que toma el servicio elige "Precio base" o uno de los ajustes. Sin elección paga el
  precio base. Si se borra un ajuste, sus viajeros vuelven al precio base.
- **Precio del asiento**: sigue sumando el costo base. Los ajustes solo cambian lo que se le
  paga al proveedor. Si un niño debe pagar menos, va con un descuento en su cuenta, como antes.
- **A pagar**: suma el precio de cada viajero que toma el servicio. La tarjeta lo desglosa
  ("1 × $150.00 + 1 × $135.00").
- La pestaña de la cotización "Servicios" se renombró a **"Proveedores"**; la ruta sigue
  siendo `quotation-services`.
- Si actualizar un proveedor falla, ahora se muestra un aviso de error en lugar de cerrar el
  modal sin decir nada.

## Base de datos

Migración `20261008161730_provider_price_adjustments.sql`. Solo agrega, así que es segura
para prod.

| Pieza | Qué hace |
| --- | --- |
| `price_adjustment_kind` (`discount`, `surcharge`), `price_adjustment_mode` (`percent`, `amount`) | Enums nuevos |
| `quotation_provider_price_adjustments` | Ajustes de un proveedor. CHECKs: motivo no vacío y de máximo 60 caracteres; valor > 0; un descuento en porcentaje ≤ 100. `UNIQUE (id, quotation_provider_id)` para la FK compuesta. RLS `_owner` vía proveedor → cotización → viaje |
| `quotation_provider_traveler_adjustments` | `(quotation_provider_id, traveler_id)` + `travel_id` + `adjustment_id`. FK compuesta a `travelers(id, travel_id)` y a `quotation_provider_price_adjustments(id, quotation_provider_id)`, así un viajero solo puede elegir un ajuste de ese mismo proveedor. CASCADE. RLS `_owner` por `travel_id`. Reusa `private.check_opt_out_same_travel()` |
| `private.quotation_provider_payable_cost(...)` | Por persona: suma `ROUND(GREATEST(0, base ± ajuste), 2)` de cada viajero que lo toma |
| Triggers `*_sync_payable_cost` en las dos tablas | Recalculan "tocando" la fila del proveedor |

## Código

| Archivo | Cambio |
| --- | --- |
| `app/composables/quotation/use-quotation-domain.ts` | `calculateAdjustedUnitCost` (igual que la BD), `formatPriceAdjustment`, `getPriceAdjustmentError` |
| `app/types/quotation.ts` | `ProviderPriceAdjustment`, `ProviderPriceAdjustmentDraft`, `TravelerPriceAdjustment`; `providerAdjustments` en el fetch |
| `app/utils/mappers.ts`, `use-quotation-repository.ts` | Los ajustes llegan con los proveedores; `saveProviderAdjustments` (actualiza, inserta y borra según la lista), `fetchTravelerAdjustments`, `setTravelerAdjustment` |
| `app/stores/use-cotizacion-store.ts` | `getAjustesByProveedor`, `getAjusteDeViajero`, `saveAjustesProveedor`, `fetchTravelerAdjustments`, `setAjusteViajero` (estas acciones refrescan `payable_cost`) |
| `app/components/cotizacion-proveedor-ajustes-editor.vue` | Editor de la lista, con el precio resultante y el error de cada fila |
| `app/components/cotizacion-proveedor-form.vue` | Editor con "Costo por persona"; el envío se bloquea si hay ajustes inválidos |
| `app/components/cotizacion-proveedor-tabla.vue` | Guarda los ajustes después del proveedor, acción y modal "Precios por tipo de persona", aviso de error al actualizar |
| `app/components/travel-optional-service-card.vue` + `app/pages/travels/[id]/optional-services.vue` | Select de precio por viajero y desglose de "A pagar" |

## Verificación (local)

- **SQL** (bloque que se revierte al final), con base $100 y 4 ocupantes:
  - Sin ajustes: $400. Niño -10%: $390. VIP +$25: $415.
  - Subir el descuento de niño a 50%: $375.
  - Un descuento de $500 deja el precio en $0: $325.
  - Excluir al VIP: $200. Borrar el ajuste de $500: su viajero vuelve al precio base ($300).
  - Se rechazan un porcentaje > 100, un motivo vacío y el ajuste de otro proveedor.
  - Borrar el viaje funciona.
- **RLS**: un usuario ajeno no ve los ajustes y no puede crearlos; el owner sí.
- **UI** (playwright-cli):
  - En "Entrada al parque" ($150) agregué Niños -10% y Adulto mayor -$50 desde la acción
    de la tabla. La tabla muestra "2 precios por tipo".
  - En el viaje, elegir "Niños -10% · $135.00" para Elena deja $285 a pagar
    ("1 × $150.00 + 1 × $135.00").
  - Agregar un ajuste desde "Editar" lo guarda. Con valor 0 el botón queda deshabilitado.
- `bun run lint:fix` y `bun run typecheck` limpios.
