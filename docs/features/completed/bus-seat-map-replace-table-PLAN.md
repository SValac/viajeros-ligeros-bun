# Plan: Mejorar tabs de autobuses con mapa de asientos interactivo

## Estado: 🟡 PENDIENTE (actualizado)

**Feature branch sugerido**: `feature/bus-seat-map`
**Depende de**: `bus-seat-map-visual-PLAN.md` (base visual ya implementada)

---

## 1. OBJETIVO (ACTUALIZADO)

Mantener la estructura con `UTabs` ya existente:

- **Tab 1 (`travelers`)**: se conserva la tabla de viajeros + filtros (sin reemplazar).
- **Tabs de autobuses (`bus`)**: aplicar ahí la experiencia enriquecida del mapa de asientos (datos completos por asiento + acciones desde la celda).
- **Tabs de autobuses (`bus`)**: al hacer click en un asiento vacío, abrir el modal para crear viajero con ese autobús/asiento preseleccionados.

> Este plan **ya no** reemplaza la tabla principal. Solo evoluciona las tabs de autobuses.

---

## 2. ALCANCE

### Incluye

1. Mejorar los datos enviados al `BusSeatMap` en cada tab de autobús.
2. Mostrar información rica por asiento ocupado (nombre, abordaje, representante).
3. Integrar acciones (`Editar`, `Ver pagos`, `Eliminar`) desde cada asiento ocupado.
4. Mantener estado vacío por autobús cuando no haya viajeros asignados.
5. Soportar click en asiento vacío para iniciar alta de viajero en ese bus y asiento.
6. Crear componente `bus-seat-card` para mostrar cada asiento de forma ordenada y reutilizable.

### No incluye

1. Eliminar `TravelerFilterBar`.
2. Eliminar `UTable`.
3. Cambiar la estructura general de tabs ya implementada en `index.vue`.

---

## 3. CAMBIOS EN `app/pages/travels/[id]/travelers/index.vue`

### 3.1 Mantener sin cambios funcionales

- Tab `travelers` con:
  - `TravelerFilterBar`
  - `UTable`
  - lógica de filtros/expanded/columns
- Header de página, métricas y modal de viajero

### 3.2 Actualizar payload para tabs de autobuses

Reemplazar el shape básico de `getOccupiedSeatsByBus(busId)` por un shape enriquecido:

```ts
type OccupiedSeat = {
  travelerId: string;
  seatNumber: number;
  passengerName: string;
  boardingPoint?: string;
  isRepresentative: boolean;
  representativeName?: string;
  menuItems: { label: string; icon?: string; color?: string; onSelect: () => void }[][];
};
```

Reglas:

1. `menuItems` reutiliza `getRowActions(traveler)` (no duplicar lógica de acciones).
2. `representativeName` solo aplica para acompañantes con `representativeId`.
3. Excluir asientos inválidos (`NaN` o `<= 0` según el tipo actual de `seat`).

### 3.3 Ajustar props usadas por `BusSeatMap` en tabs `bus`

Agregar `busLabel` y remover dependencia de `@seat-selected` si el componente ya encapsula acciones:

```vue
<BusSeatMap
  :total-seats="item.bus.seatCount"
  :occupied-seats="getOccupiedSeatsByBus(item.bus.id)"
  :seats-per-row="4"
  :last-row-seats="getLastRowSeats(item.bus)"
  :bus-label="getBusLabel(item.bus.id)"
/>
```

### 3.4 Estado vacío por tab de autobús

Si `occupiedSeatsByBus.length === 0`, mostrar aviso específico del autobús:

- Texto sugerido: `Sin viajeros asignados a este camión.`
- Puede ser con `UAlert` o bloque visual simple encima del mapa.

### 3.5 Click en asiento vacío abre modal con datos precargados

En tabs `bus`, cuando `BusSeatMap` notifique selección de asiento vacío:

1. Abrir modal de `TravelerForm`.
2. Preconfigurar formulario con:
   - `travelId` actual (bloqueado como hoy).
   - `travelBusId` del tab activo.
   - `seat` igual al asiento seleccionado.

Implementación sugerida:

- Exponer en la página un handler tipo `handleEmptySeatSelected(busId, seatNumber)`.
- Ese handler prepara un borrador para creación y luego llama `openCreateModal()`.
- Evitar romper el flujo actual de edición (`openEditModal`) y creación manual desde botón.

---

## 4. CAMBIOS EN `app/components/bus-seat-map.vue`

### 4.1 Extender contrato de props

Actualizar `occupiedSeats` para recibir el nuevo `OccupiedSeat` (enriquecido) y agregar:

```ts
busLabel?: string
```

### 4.2 Emisión para asientos vacíos

El componente debe emitir evento cuando se haga click en asiento disponible:

```ts
emit('empty-seat-selected', { busId: string, seatNumber: number })
```

La página usa ese evento para abrir modal con datos precargados.

### 4.3 Mantener acciones internas para asientos ocupados

Si hoy existe `emit('seatSelected', travelerId)`, migrar a acciones internas de celda ocupada.

### 4.4 Celda ocupada como trigger de `UDropdownMenu`

Cada asiento ocupado debe abrir menú de acciones con `seat.menuItems`.

La UI de la celda ocupada/disponible ya no se construye inline completo en `bus-seat-map.vue`; debe delegarse a un componente dedicado:

- `app/components/bus-seat-card.vue`
- `bus-seat-map.vue` se mantiene como layout/grid + wiring de eventos y dropdown.

Información visible en `bus-seat-card`:

1. Número de asiento
2. Nombre del viajero
3. Punto de abordaje (si existe)
4. Badge/indicador de representante
5. Nombre del representante (si aplica)
6. Iconografía de rol: si el traveler es representante de grupo, usar icono **`i-lucide-user-star`**

### 4.5 Nuevo componente `bus-seat-card.vue`

Responsabilidad única:

1. Renderizar contenido visual de un asiento (vacío u ocupado).
2. Recibir props tipadas del asiento y variantes visuales (ocupado, representante, acompañante).
3. Exponer una estructura estable para usarse como trigger de `UDropdownMenu` en ocupados y click directo en vacíos.

Regla de diseño:

- Para representante de grupo, mostrar `UIcon name="i-lucide-user-star"` junto al nombre/encabezado del asiento.

### 4.6 Header de autobús dentro del mapa

Si llega `busLabel`, mostrar encabezado del autobús antes del grid de asientos.

### 4.7 Estado visual consistente

Mantener distinción clara:

- Disponible
- Ocupado representante
- Ocupado acompañante

Sin tooltips redundantes si la información ya es visible en la celda.

---

## 5. ARCHIVOS A MODIFICAR

| Archivo | Cambio | Unidad |
|---|---|---|
| `app/components/bus-seat-card.vue` | Nuevo componente visual para celda de asiento (ocupado/vacío) + icono `i-lucide-user-star` para representante | U1 |
| `app/components/bus-seat-map.vue` | Contrato de props + wiring de dropdown/eventos usando `bus-seat-card` | U2 |
| `app/pages/travels/[id]/travelers/index.vue` | Enriquecer `occupiedSeats` por autobús + uso nuevo de `BusSeatMap` en tabs `bus` | U3 |

---

## 6. ORDEN DE IMPLEMENTACIÓN

```text
U1 (bus-seat-card) → U2 (bus-seat-map) → U3 (index.vue)
```

Primero `bus-seat-card` para definir el rendering base de asiento, luego `bus-seat-map` para integrarlo y finalmente `index.vue` como consumidor final.

---

## 7. CRITERIOS DE ACEPTACIÓN

1. La tab `Todos los viajeros` sigue mostrando filtros + tabla como antes.
2. Cada tab de autobús muestra mapa con asientos enriquecidos.
3. Cada asiento ocupado permite ejecutar acciones del viajero desde `UDropdownMenu`.
4. Al hacer click en asiento vacío, se abre modal de alta con bus y asiento prellenados.
5. Si un autobús no tiene viajeros, se muestra estado vacío claro.
6. Los representantes de grupo muestran icono `i-lucide-user-star` en la tarjeta de asiento.
7. No se rompen `handleFormSubmit`, `handleDelete`, `getRowActions`, `openEditModal`.

---

## 8. RIESGOS / VERIFICACIONES

1. **Campo de abordaje**: validar mapeo `boardingPoint` vs `puntoAbordaje` en store.
2. **Tipo de asiento**: confirmar si `seat` es `number` o `string` en todos los flujos.
3. **Performance**: evitar recomputar búsquedas de representante innecesariamente en render masivo.
4. **Contrato de formulario**: confirmar cómo pasar valores iniciales a `TravelerForm` sin romper edición/creación actual.

---

## 9. SKILLS RECOMENDADOS

- `@.agents/skills/vue/`
- `@.agents/skills/nuxt/`
- `@.agents/skills/nuxt-ui/`
- `@.agents/skills/vue-best-practices/`
