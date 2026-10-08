# Feature: Servicios por persona (pagar al proveedor por quienes lo toman)

**Estado:** ✅ COMPLETADA en la rama `feature/optional-provider-services` (PR #117); migraciones pendientes de push a stage y prod.

---

## Contexto

Un servicio cobrado por persona (un tour, una comida) tenía un total cotizado
(`costo × número de personas`) que servía para dos cosas:

- **El precio del asiento**: el total se repartía según "Dividir entre". Con personas =
  divisor, cada asiento cargaba exactamente el costo por persona, así que el número de
  personas y el reparto no aportaban nada y solo provocaban un aviso de desfase cuando
  cambiaban los asientos.
- **Lo que se le debe al proveedor**: pagos, saldo pendiente y "Por pagar a proveedores". Esto
  no refleja la realidad, porque no todos los viajeros toman todos los servicios. Por ejemplo,
  de 45 asientos solo 30 van al tour del guía, o algunos comen por su cuenta.

Ahora un servicio **por persona** se suma directo al precio del asiento y al proveedor se le
paga **costo por persona × viajeros que lo toman**. Quién lo toma se marca en una pestaña nueva
del viaje, como las habitaciones (PR #115).

## Decisiones

- **Precio del asiento**: un servicio por persona suma su costo por persona directo al precio
  del asiento. No tiene "Número de personas" ni "Dividir entre"; esos solo quedan para los
  servicios de costo total.
- **Todo servicio por persona se paga por quienes lo toman**. No hay un switch "opcional": un
  proveedor que cobra por persona siempre cobra por las personas reales.
- **Incluidos por defecto**: se guardan las **exclusiones**. Un viajero nuevo toma todos los
  servicios por persona y se desmarca a quien no lo quiere.
- **Coordinadores**: cuentan como cualquier viajero, salvo que el proveedor les dé cortesía.
  Para eso hay un switch por proveedor, **"Cortesía para coordinadores"**.
- **Resumen de la cotización**:
  - El costo total y la ganancia proyectada cuentan los servicios por persona como costo ×
    asientos vendibles (el autobús lleno).
  - "Ganancia a partir del asiento" usa costos fijos ÷ (precio − costo por persona), porque los
    servicios por persona crecen con cada viajero.
  - La tarjeta del precio por asiento muestra "Servicios por persona: + $X por asiento".
- **Pestaña "Servicios por persona"** en `/travels/[id]` (ruta `optional-services`), en formato
  maestro-detalle:
  - Una lista compacta de servicios con cuántos lo toman y lo que se debe pagar. En escritorio
    es una columna y en tablet una fila con scroll horizontal.
  - La tarjeta del servicio elegido (`?servicio=` en la URL, para que sobreviva al recargar)
    con cuántos lo toman, lo que se debe pagar, el costo con el autobús lleno y el pendiente o
    lo pagado de más.
  - Lista compacta de viajeros con casilla. Cada acompañante muestra el nombre de su
    representante, igual que en "Agregar viajero a la habitación". Los de un mismo
    representante van juntos y los coordinadores van al final con su ícono. Además están
    "Marcar todos" y "Desmarcar todos".
- **Cotización confirmada**: se puede marcar y desmarcar viajeros, igual que las habitaciones.
  La acción **"Cortesía para coordinadores"** de la tabla cambia la cortesía aunque la
  cotización esté confirmada, porque no toca el precio del asiento.
- **Pagado de más**: si se desmarcan o se borran viajeros después de pagar, el pendiente
  queda en $0 y se muestra "Pagado de más" (tabla y tarjeta). Los pagos no se tocan.
- **Fuera de alcance**: que quien no toma el servicio pague menos. Su precio público no
  cambia; si hace falta, se le pone un descuento manual en su cuenta.

## Base de datos

Dos migraciones que salen en el mismo push:

1. `20261008143643_optional_provider_services.sql` (expand): `coordinators_courtesy`,
   `payable_cost`, la tabla de exclusiones y los triggers. También agregaba `is_optional`.
2. `20261008153118_per_person_providers_paid_by_takers.sql`: todo servicio por persona se paga
   por quienes lo toman. Quita `is_optional`, que solo existió en local. `person_count` deja de
   ser obligatorio. Corrige el CHECK de costo, que dejaba pasar un `unit_cost` NULL.
3. `20261008160111_drop_provider_person_count.sql` (contract, PR aparte): borra
   `person_count` y rehace el CHECK de costo sin ella. Tiene un guard que se niega a borrarla
   si alguna fila conserva un valor (en prod y stage había 0). **Orden**: primero el deploy
   del CRM de ese PR, que deja de enviar `person_count`, y después el push de la migración.

| Pieza | Qué hace |
| --- | --- |
| `quotation_providers.coordinators_courtesy` | `NOT NULL DEFAULT false`. CHECK: solo con `per_person` |
| `quotation_providers.payable_cost` | Lo que se le debe. Lo calcula el trigger, no el cliente |
| `quotation_providers_cost_type_fields_check` | Total: sin `unit_cost`. Por persona: `unit_cost` no NULL y > 0 |
| `quotation_provider_opt_outs` | `(quotation_provider_id, traveler_id)` + `travel_id`. FK compuesta a `travelers(id, travel_id)` y CASCADE desde el proveedor y el viajero. RLS `_owner` por `travel_id` |
| `private.check_opt_out_same_travel()` | Rechaza (`opt_out_travel_mismatch`) un viajero de otro viaje |
| `private.quotation_provider_payable_cost(...)` | Por persona: `unit_cost × COUNT(viajeros del viaje)`, sin los desmarcados y, con cortesía, sin los coordinadores. Costo total: `total_cost` |
| Trigger `quotation_providers_set_payable_cost` | BEFORE INSERT/UPDATE: escribe `payable_cost` |
| Triggers `quotation_provider_opt_outs_sync_payable_cost` y `travelers_sync_provider_payable_cost` | Recalculan "tocando" la fila del proveedor (`SET total_cost = total_cost`), igual que en las habitaciones |

Las funciones son `SECURITY INVOKER` con `search_path = ''`. Los coordinadores no tienen
INSERT ni DELETE en `travelers`, así que no hay escrituras que el owner no vea.

**Producción antes del push (solo lectura, 2026-10-08)**:
- Prod tiene 1 servicio por persona, sin pagos, y ninguno sin `unit_cost`. Stage no tiene
  ninguno.
- Ese servicio pasa de deber `total_cost` a deber `unit_cost × viajeros de su viaje`.
- El `seat_price` guardado de una cotización en borrador se recalcula la próxima vez que se
  edite un proveedor o autobús.

## Código

| Archivo | Cambio |
| --- | --- |
| `app/composables/quotation/use-quotation-domain.ts` | `isPerPersonProvider`, `calculateProviderQuotedCost`. `calculateSeatPrice` suma el costo por persona sin reparto |
| `app/types/quotation.ts` | `coordinatorsCourtesy` y `payableCost` en `QuotationProvider` (sin `personCount`); tipo `ProviderOptOut` |
| `app/utils/mappers.ts` | `mapProviderCostFields` escribe `person_count = NULL` y la cortesía; `mapProviderOptOutRowToDomain`. El insert no envía `payable_cost` (`TablesInsert`) |
| `app/composables/quotation/use-quotation-repository.ts` | `updateProviderCourtesy`, `fetchProviderPayableCosts`, `fetchProviderOptOuts`, `insertProviderOptOuts` (upsert idempotente), `deleteProviderOptOuts` |
| `app/stores/use-cotizacion-store.ts` | Pendiente y estado de pago contra `payableCost`; `getSobrepagoProveedor`, `getOptOutsByProveedor`, `getCostoPorPersonaAsiento`, `updateProveedorCortesia`, `refreshProviderPayableCosts`, `fetchProviderOptOuts`, `setTomanServicio`. Costo total, ganancia y asiento de ganancia con los servicios por persona |
| `app/components/cotizacion-proveedor-form.vue` | Por persona: solo el costo por persona, un aviso de cómo se cobra y la cortesía. "Dividir entre" solo con costo total |
| `app/components/cotizacion-proveedor-cortesia-form.vue` | Modal "Cortesía para coordinadores" |
| `app/components/cotizacion-proveedor-tabla.vue` | "Por persona" en División, costo con el autobús lleno, columna "A pagar" con enlace "N lo toman", badge de cortesía, "Pagado de más" |
| `app/components/cotizacion-resumen-financiero.vue` | Línea "Servicios por persona" en el precio por asiento |
| `app/components/travel-optional-service-list.vue` | Lista para elegir el servicio |
| `app/components/travel-optional-service-card.vue` | Tarjeta de un servicio: cifras y casillas por ocupante, ordenadas por representante |
| `app/pages/travels/[id]/optional-services.vue` + `app/pages/travels/[id].vue` | Pestaña "Servicios por persona". Al abrirla refresca `payable_cost`, que cambia al agregar o borrar viajeros |
| `app/pages/quotations/[id].vue` | Refresca `payable_cost` al abrir la cotización |

El selector de proveedor del form (`app/components/provider-selector.vue`) pasó de `USelect`
a `USelectMenu`. Cada opción muestra "Proveedor - Contacto" con la ciudad debajo, y ambos
selects ocupan todo el ancho. La búsqueda es la misma que la del buscador de las páginas de
proveedores (`/providers` y cada categoría): `matchesProviderSearch` en
`use-provider-domain.ts` busca por nombre, descripción, ubicación (ciudad, estado, país) o
contacto (nombre, teléfono, email). Ignora mayúsculas y acentos, y compara el teléfono solo
por dígitos para que "(812) 123 4567" lo encuentre.

De paso se arregló el filtro "Liquidado" de la tabla de servicios: filtraba por `'liquidado'`
en vez de `'paid'` y nunca encontraba nada.

## Verificación (local)

- **SQL** (bloques que se revierten al final):
  - Costo total: $1,000 = total.
  - Por persona a $100, sin `person_count`, con 4 ocupantes: $400. Con cortesía: $300. Con un
    viajero desmarcado: $200.
  - Agregar un viajero: $300. Borrarlo: $200.
  - El cliente no puede escribir `payable_cost`.
  - Los CHECK impiden la cortesía en un costo total y un servicio por persona sin
    `unit_cost`.
  - Insertar una exclusión con un viajero de otro viaje falla.
  - Borrar el viaje con exclusiones funciona.
- **RLS**:
  - Un usuario ajeno no ve ni borra exclusiones, y su insert se rechaza.
  - El owner sí, y su `payable_cost` se recalcula.
- **UI** (playwright-cli):
  - Con 3 servicios por persona ($150 + $250 + $100) y un autobús de $44,000 en reparto
    total entre 43 asientos, el precio por asiento es ⌈44,000 ÷ 43 + 500⌉ = $1,524.
  - La ganancia proyectada es 43 × 1,524 − (44,000 + 500 × 43) = $32 y la ganancia empieza
    en el asiento 43.
  - Un servicio nuevo a $80 por persona guarda `person_count` NULL y muestra $320 a pagar
    ("4 lo toman").
  - Quitar la cortesía desde la tabla sube "A pagar" de $300 a $450 (3 lo toman).
  - En la pestaña, desmarcar a un viajero baja lo que se debe; con un pago mayor se muestra
    "Pagado de más".
  - A 820px no hay scroll horizontal en la página.
- `bun run lint:fix` y `bun run typecheck` limpios.
