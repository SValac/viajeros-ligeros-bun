# Feature: Coordinadores con asiento y habitación

**Estado:** ✅ COMPLETADA. PR #101 mergeado a `main`; migraciones en todos los entornos.

---

## Contexto

Los coordinadores de un viaje (`travel_coordinators`) no ocupaban lugar. Si los autobuses
sumaban 50 asientos y viajaban 2 coordinadores, la cotización repartía costos y calculaba
la ganancia sobre 50, y la web mostraba 50 libres. Tampoco se les podía asignar asiento ni
habitación.

## Decisiones

- **Modelo:** los coordinadores son filas de `travelers` con `kind = 'coordinator'` y
  `coordinator_id`. Así usan sin cambios el mapa de asientos, `move_or_swap_traveler_seat`,
  el índice único de asiento por camión, `traveler_room_assignments` y el trigger
  `room_full`. Se descartó guardar el asiento en `travel_coordinators` porque la base de
  datos ya no podría impedir que dos personas compartan asiento o que se llene de más una
  habitación.
- **Opción por cotización** `quotations.coordinators_take_seats` (por defecto `false`):
  - **Encendida:** los coordinadores se restan de los asientos vendibles y se les puede
    asignar asiento.
  - **Apagada:** viajan sin asiento de pasajero (asiento de guía o por su cuenta), pero sí
    pueden tener habitación. Al apagarla se liberan los asientos que tuvieran, después de
    confirmar.
- **Costo de la habitación del coordinador:** no entra a la cotización, lo absorbe la
  agencia. Queda como pendiente.

## Base de datos

Migraciones `20261007010305_coordinator_seats.sql` y
`20261007010531_coordinator_traveler_rows.sql`. Solo agregan cosas.

| Pieza | Qué hace |
| --- | --- |
| `travelers.kind` (`traveler_kind`), `coordinator_id` | `CHECK`: `kind = 'coordinator'` si y solo si hay `coordinator_id` |
| FK `(travel_id, coordinator_id)` → `travel_coordinators` | Solo coordinadores del viaje. Quitar a uno del viaje borra su fila, su asiento y su habitación (`ON DELETE CASCADE`) |
| `UNIQUE (travel_id, coordinator_id)` | Una fila por coordinador y viaje |
| `seat` acepta `NULL` | Solo para coordinadores, y con camión y asiento juntos |
| `travelers_prepare_coordinator` (BEFORE) | Copia nombre y teléfono del coordinador, nunca es representante de grupo, y no deja cambiar `kind` ni `coordinator_id` |
| `coordinators_sync_travelers` (AFTER UPDATE) | Mantiene al día el nombre y el teléfono copiados |
| `travel_coordinators_create_traveler` (AFTER INSERT) | Crea la fila del coordinador (sin asiento) al vincularlo al viaje, más el backfill de los vínculos existentes |
| `get_travel_seats` | Misma firma. `seats_left` cuenta solo `kind = 'traveler'` y resta los coordinadores si la cotización lo dice |

## App

- **Store de viajeros:** los getters «Travelers» (`getTravelersByTravel`,
  `filteredTravelers`, `getGroupMembers`) devuelven solo viajeros que pagan, así pagos y
  grupos no cambian. Los getters «Occupants» (`getOccupantsByTravel`, `getOccupantsByBus`,
  `getOccupantsByAccommodation`) incluyen a los coordinadores.
- **Cotización:** `getAsientosVendibles` (total − coordinadores) divide los costos
  repartidos entre el total, el costo por persona y la ganancia proyectada. El switch
  está en «Parámetros de la Cotización».
- **Viajeros:** tarjeta «Coordinadores» para asignar, cambiar o quitar asiento (el camión
  se prellena desde los coordinadores del autobús en la cotización). En el mapa de
  asientos se ven con su propio estilo.
- **Habitaciones:** el modal para agregar ocupantes y los conteos incluyen a los
  coordinadores.
- **Editar viaje:** `replaceCoordinators` ahora es un diff. Antes borraba y reinsertaba
  todos los vínculos, lo que con el `CASCADE` habría borrado asientos y habitaciones en
  cada edición. Si cambian los coordinadores, se recargan sus filas y se recalcula el
  precio por asiento.

## Orden de despliegue

La app lee `kind` y `coordinators_take_seats` con un valor por defecto y no los envía al
crear filas normales, así que funciona con la base de datos vieja. Primero se despliega el
código y después se hace el push de las migraciones. Con el orden inverso, el código
anterior mostraría a los coordinadores como viajeros.

## Pendientes

- Sumar el hospedaje de los coordinadores a los costos de la cotización.
- `redeem_travel_access` acepta el teléfono de un coordinador con fila en `travelers`. Es
  inofensivo, porque va en el viaje.
