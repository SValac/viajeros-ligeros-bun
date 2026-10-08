# Feature: Cantidad de habitaciones desde el viaje

**Estado:** ✅ Implementada (2026-10-08) en PR #115 (`fix/quotation-issues`), pendiente de merge y de la migración en Stage/QA y Producción.

---

## Contexto

Al agregar hospedaje a una cotización había que poner **cuántas habitaciones** de cada tipo
se apartaban, con tope en las del catálogo del hotel. Ese número no se conoce al cotizar: se
apartan 4 dobles y, conforme se inscribe gente, terminan siendo 6 o 7. Además, en cuanto la
cotización se confirmaba ya no se podía cambiar.

## Decisiones

- **La cotización solo elige el hotel, las noches y los tipos de habitación.** Basta para
  los precios al público (salen de `precio/noche ÷ ocupación` de cada tipo y nunca usaron la
  cantidad).
- **Los cuartos se agregan y quitan en la pestaña Habitaciones del viaje**, aunque la
  cotización esté confirmada. Solo se puede quitar un cuarto vacío.
- **Lo que se le debe al hotel** (`quotation_accommodations.total_cost`, contra el que se
  comparan sus pagos) lo calcula la BD: `cuartos del viaje de cada tipo cotizado ×
  precio/noche × noches`. Si se agregan cuartos a un hotel liquidado, su saldo vuelve a
  "Anticipo".
- **El catálogo solo avisa.** Pasar de las habitaciones del catálogo del hotel muestra un
  badge, pero no bloquea.
- **Quitar un tipo (o un hotel) de la cotización** borra sus cuartos vacíos del viaje y **se
  bloquea si alguno tiene viajeros** (antes los dejaba huérfanos con un aviso).
- La pestaña Habitaciones agrupa **por tipo** (antes por ocupación), para distinguir tipos de
  la misma ocupación y poner un botón "Agregar habitación" a cada uno.

## Base de datos

Migración `20261008052850_lodging_cost_from_travel_rooms.sql`. Paso *expand*: compatible con
el CRM desplegado, que sigue escribiendo `quantity` y creando un cuarto por unidad (da el
mismo costo).

| Pieza | Qué hace |
| --- | --- |
| `quotation_accommodation_details.quantity` | `DEFAULT 0`: el CRM nuevo ya no la escribe |
| `private.quotation_accommodation_rooms_cost(...)` | Suma `price_per_night × noches × cuartos` por tipo cotizado; los cuartos se emparejan por (viaje, hotel, tipo) |
| Trigger `quotation_accommodations_set_total_cost` | `BEFORE INSERT OR UPDATE`: recalcula `total_cost` e ignora lo que mande el cliente |
| Trigger `quotation_accommodation_details_sync_cost` | Tipo agregado, quitado o con otro precio → recalcula su hotel |
| Trigger `travel_accommodations_sync_lodging_cost` | Cuarto agregado o quitado (no al editar número/piso) → recalcula los hoteles de ese viaje |
| Backfill | Recalcula todos los hoteles |

Todas las funciones son `SECURITY INVOKER` con `search_path = ''`, siguiendo el patrón de
`sync_quotation_total_seats`.

**Producción antes del push (solo lectura, 2026-10-08):** 0 hospedajes y 0 pagos de hotel, así
que el backfill no cambia ningún monto real.

**Pendiente (contract, otro PR):** borrar `quotation_accommodation_details.quantity` con guard
una vez desplegado este cambio.

## Código

| Archivo | Cambio |
| --- | --- |
| `app/types/quotation.ts`, `app/utils/mappers.ts` | `QuotationAccommodationDetail` ya no tiene `quantity` |
| `app/composables/quotation/use-quotation-domain.ts` | `roomTypeKey`, `countRoomsByType`, `findRoomsOutsideQuotation`; se van `buildDesiredRoomsMap` y `reconcileAccommodations` |
| `app/composables/quotation/use-quotation-repository.ts` | Insert/update sin `total_cost` ni `quantity`, y releen `total_cost` después de escribir los tipos; `fetchAccommodationCosts`; se va `insertTravelAccommodations` |
| `app/stores/use-cotizacion-store.ts` | `getRoomCountsByQuotation`, `refreshHospedajeCosts`; agregar hospedaje ya no crea cuartos; editar o borrar revisa cuartos de tipos que se quitan (`_findRoomsToDrop` / `_deleteRooms`) |
| `app/components/cotizacion-hospedaje-tipos.vue` | **Nuevo:** selector de tipos compartido por los modales de agregar y editar; en editar muestra "N hab. en el viaje" y avisa al desmarcar un tipo con cuartos |
| `app/components/cotizacion-hospedaje-form.vue`, `cotizacion-hospedaje-tabla.vue` | Sin cantidad ni tope; la tabla agrega la columna **Habitaciones** (cuartos del viaje) |
| `app/components/cotizacion-hospedaje-resumen.vue` | Cuartos, subtotales y promedio por persona salen de los cuartos del viaje |
| `app/composables/travels/use-travel-repository.ts` | `deleteEmptyAccommodation`: revisa asignaciones antes (borrar un cuarto hace cascade y desasignaría a la gente) y detecta un delete que RLS no aplicó |
| `app/stores/use-travel-store.ts` | `addTravelRooms`, `deleteTravelRoom` |
| `app/components/travel-room-type-group.vue` | **Nuevo:** encabezado de un tipo (cuartos, aviso de catálogo, "Agregar habitación") y slot para las tarjetas |
| `app/components/travel-accommodation-card.vue` | Botón eliminar en cuartos vacíos |
| `app/pages/travels/[id]/habitaciones/index.vue` | Pestañas desde los hoteles de la cotización (aunque no tengan cuartos), grupos por tipo, costo del hotel arriba, cuartos de tipos no cotizados aparte |

## Verificación (local)

- Triggers como usuario `authenticated` (RLS), en una transacción revertida: el `total_cost`
  enviado por el cliente se ignora; agregar o quitar un cuarto suma o resta su precio; 2
  noches lo duplica; cambiar un precio, quitar un tipo o volver a agregarlo sin `quantity`
  recalculan; borrar el viaje completo no truena.
- Habitaciones: agregar un doble pasa de $23,500 a $24,450 (UI y BD); eliminarlo regresa a
  $23,500; un cuarto ocupado no muestra el botón de eliminar; pasar de 10 suites (catálogo 10)
  muestra el aviso.
- Cotización: desmarcar un tipo con un cuarto ocupado se bloquea con el mensaje y la BD queda
  igual; desmarcar uno con 10 cuartos vacíos los borra y deja el costo en $8,500.
- Lint y typecheck limpios.
