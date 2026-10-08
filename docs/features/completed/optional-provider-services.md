# Feature: Servicios opcionales (pagar al proveedor por quienes lo toman)

**Estado:** ✅ COMPLETADA en la rama `feature/optional-provider-services`; migración pendiente de push a stage y prod.

---

## Contexto

`quotation_providers.total_cost` servía para dos cosas:

- **El precio del asiento**: se reparte entre los asientos mínimos o los vendibles. Esto está bien.
- **Lo que se le debe al proveedor**: pagos, saldo pendiente y "Por pagar a proveedores". Esto
  no refleja la realidad, porque no todos los viajeros toman todos los servicios. Por ejemplo,
  de 45 asientos solo 30 van al tour del guía, o algunos comen por su cuenta.

Ahora un servicio **opcional** se le paga al proveedor como **costo por persona × viajeros que
lo toman**. Quién lo toma se marca en una pestaña nueva del viaje, como las habitaciones
(PR #115). El precio del asiento sigue usando el total cotizado.

## Decisiones

- **Switch "Servicio opcional"** en el form del proveedor, solo con "Costo por persona". Los
  servicios no opcionales se siguen pagando por el total.
- **Incluidos por defecto**: se guardan las **exclusiones**. Un viajero nuevo toma todos los
  servicios opcionales y se desmarca a quien no lo quiere.
- **Coordinadores**: cuentan como cualquier viajero, salvo que el proveedor les dé cortesía.
  Para eso hay un switch por proveedor, **"Cortesía para coordinadores"**.
- **Pestaña "Servicios opcionales"** en `/travels/[id]`, en formato maestro-detalle:
  - Una lista compacta de servicios con cuántos lo toman y lo que se debe pagar. En escritorio
    es una columna y en tablet una fila con scroll horizontal.
  - La tarjeta del servicio elegido (`?servicio=` en la URL, para que sobreviva al recargar)
    con cuántos lo toman, lo que se debe pagar, lo cotizado y el pendiente o lo pagado de más.
  - Lista compacta de viajeros con casilla. Cada acompañante muestra el nombre de su
    representante, igual que en "Agregar viajero a la habitación". Los de un mismo
    representante van juntos (el representante y luego sus acompañantes, por nombre del
    representante) y los coordinadores al final. Además están "Marcar todos" y
    "Desmarcar todos".
- **Cotización confirmada**: se puede marcar y desmarcar viajeros, igual que las habitaciones.
  La acción **"Cobro por viajero"** de la tabla cambia los dos switches aunque la cotización
  esté confirmada, porque no tocan el precio del asiento.
- **Pagado de más**: si se desmarcan o se borran viajeros después de pagar, el pendiente
  queda en $0 y se muestra "Pagado de más" (tabla y tarjeta). Los pagos no se tocan.
- **Fuera de alcance**: que quien no toma el servicio pague menos. Su precio público no
  cambia; si hace falta, se le pone un descuento manual en su cuenta.

## Base de datos

Migración `20261008143643_optional_provider_services.sql`. Solo agrega (expand), así que es
segura para prod. Todas las filas existentes quedan con `payable_cost = total_cost`.

| Pieza | Qué hace |
| --- | --- |
| `quotation_providers.is_optional`, `coordinators_courtesy` | `NOT NULL DEFAULT false`. CHECKs: opcional solo con `per_person`; cortesía solo si es opcional |
| `quotation_providers.payable_cost` | Lo que se le debe. Lo calcula el trigger, no el cliente |
| `quotation_provider_opt_outs` | `(quotation_provider_id, traveler_id)` + `travel_id`. FK compuesta a `travelers(id, travel_id)` y CASCADE desde el proveedor y el viajero. RLS `_owner` por `travel_id` |
| `private.check_opt_out_same_travel()` | Rechaza (`opt_out_travel_mismatch`) un viajero de otro viaje |
| `private.quotation_provider_payable_cost(...)` | Opcional: `unit_cost × COUNT(viajeros del viaje)`. Excluye a los desmarcados y, con cortesía, a los coordinadores. No opcional: `total_cost` |
| Trigger `quotation_providers_set_payable_cost` | BEFORE INSERT/UPDATE: escribe `payable_cost` |
| Triggers `quotation_provider_opt_outs_sync_payable_cost` y `travelers_sync_provider_payable_cost` | Recalculan "tocando" la fila del proveedor (`SET total_cost = total_cost`), igual que en las habitaciones |

Las funciones son `SECURITY INVOKER` con `search_path = ''`. Los coordinadores no tienen
INSERT ni DELETE en `travelers`, así que no hay escrituras que el owner no vea.

**Producción antes del push (solo lectura)**: confirmar que no hay filas que violen los CHECK
nuevos. No puede haberlas, porque las columnas nacen en `false`.

## Código

| Archivo | Cambio |
| --- | --- |
| `app/types/quotation.ts` | `isOptional`, `coordinatorsCourtesy`, `payableCost` en `QuotationProvider`; tipo `ProviderOptOut` |
| `app/utils/mappers.ts` | `mapProviderOptionalFields`, `mapProviderOptOutRowToDomain`. El insert ya no envía `payable_cost` (`TablesInsert`) |
| `app/composables/quotation/use-quotation-repository.ts` | `updateProviderOptional`, `fetchProviderPayableCosts`, `fetchProviderOptOuts`, `insertProviderOptOuts` (upsert idempotente), `deleteProviderOptOuts` |
| `app/stores/use-cotizacion-store.ts` | Pendiente y estado de pago contra `payableCost`; `getSobrepagoProveedor`, `getOptOutsByProveedor`, `updateProveedorOpcional`, `refreshProviderPayableCosts`, `fetchProviderOptOuts`, `setTomanServicio`. Los getters del precio del asiento no cambian |
| `app/components/cotizacion-proveedor-form.vue` | Switches "Servicio opcional" y "Cortesía para coordinadores" con "Costo por persona" |
| `app/components/cotizacion-proveedor-opcional-form.vue` | Modal "Cobro por viajero" (solo los dos switches) |
| `app/components/cotizacion-proveedor-tabla.vue` | Badge "Opcional", columna "A pagar" con enlace "N lo toman", "Pagado de más", acción "Cobro por viajero" |
| `app/components/travel-optional-service-list.vue` | Lista para elegir el servicio |
| `app/components/travel-optional-service-card.vue` | Tarjeta de un servicio: cifras y casillas por ocupante, ordenadas por representante |
| `app/pages/travels/[id]/optional-services.vue` + `app/pages/travels/[id].vue` | Pestaña nueva. Al abrirla refresca `payable_cost`, que cambia al agregar o borrar viajeros |
| `app/pages/quotations/[id].vue` | Refresca `payable_cost` al abrir la cotización |

De paso se arregló el filtro "Liquidado" de la tabla de servicios: filtraba por `'liquidado'`
en vez de `'paid'` y nunca encontraba nada.

## Verificación (local)

- **SQL** (bloques que se revierten al final):
  - No opcional: $1,000 = total.
  - Opcional con 4 ocupantes: $400. Con cortesía: $300. Con un viajero desmarcado: $300.
  - Agregar un viajero: $400. Borrar al desmarcado: sin cambio. Borrar uno marcado: $300.
  - El cliente no puede escribir `payable_cost`.
  - El CHECK impide que un opcional tenga costo total.
  - Insertar una exclusión con un viajero de otro viaje falla.
  - Borrar el viaje con exclusiones funciona.
- **RLS**:
  - Un usuario ajeno no ve ni borra exclusiones, y su insert se rechaza.
  - El owner sí, y su `payable_cost` se recalcula.
- **UI** (playwright-cli):
  - Editar un servicio a $150 por persona y opcional muestra "Opcional", $600 a pagar y "4 lo toman".
  - En la pestaña, desmarcar a uno deja $450 ("3 de 4").
  - Con un pago de $450, activar la cortesía desde "Cobro por viajero" deja $300 a pagar,
    pendiente $0 y "Pagado de más: $150".
  - A 820px no hay scroll horizontal en la página.
- `bun run lint:fix` y `bun run typecheck` limpios.
