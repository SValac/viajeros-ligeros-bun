# Plan: Mapa Visual de Asientos de Autobús

## Estado: 🟡 PENDIENTE

**Feature branch**: `feature/bus-seat-map`
**Archivos clave modificados**: `app/components/bus-seat-map.vue`, `app/pages/travels/[id]/travelers/index.vue`, `app/types/travel.ts`

---

## 1. OBJETIVO

Mostrar visualmente la distribución de asientos del autobús dentro de la página de viajeros de un viaje. La vista debe:

- Representar la estructura real del camión: filas de 4 asientos (2 izq — pasillo — 2 der)
- Mostrar todos los asientos (vacíos y ocupados), no solo los asignados
- Soportar múltiples autobuses por viaje mediante tabs/selector
- Permitir la última fila con 2 o 3 asientos (zona del baño)
- Mostrar el nombre del viajero al pasar el cursor sobre un asiento ocupado

---

## 2. CONTEXTO Y DIAGNÓSTICO

### 2.1 Componente existente: `app/components/bus-seat-map.vue`

El componente ya existe con el esqueleto correcto (grid 5-col, layout 2-pasillo-2), pero tiene **3 problemas críticos** que impiden que funcione:

| # | Problema | Raíz |
|---|---|---|
| 1 | Solo renderiza viajeros registrados, no todos los asientos | No recibe `totalSeats`, no genera asientos vacíos |
| 2 | Posicionamiento secuencial, no por número de asiento | Toma `seats[0]`, `seats[1]`... sin considerar el valor numérico del campo `seat` |
| 3 | Sin soporte multi-bus | La página pasa todos los viajeros mezclados |

**Bugs adicionales:**
- Tooltip con `hover:opacity-100` no funciona (selector incorrecto)
- `div { position: relative }` en `<style scoped>` aplica a todos los `div`, incluyendo el pasillo

### 2.2 Uso actual en `index.vue` (incorrecto)

```vue
<!-- ACTUAL — INCORRECTO -->
<BusSeatMap
  :seats="travelers.map(r => ({ ... }))"  <!-- travelers es árbol agrupado, no lista plana -->
  :seats-per-row="4"
  :last-row-seats="4"                     <!-- hardcodeado, sin considerar el bus -->
/>
```

### 2.3 Modelo de datos relevante

**`TravelBus`** (`app/types/travel.ts`):
```typescript
type TravelBus = {
  id: string;
  providerId: string;
  model?: string;
  brand?: string;
  seatCount: number;       // ✅ ya existe — total de asientos
  // lastRowSeats          // ❌ no existe — se agrega en U1
  rentalPrice: number;
  // ... operadores
};
```

**`Traveler`** (`app/types/traveler.ts`):
```typescript
type Traveler = {
  id: string;
  travelBusId: string;   // ← filtra por bus
  seat: string;          // ← número de asiento (string numérico: "1", "15", "40")
  firstName: string;
  lastName: string;
  // ...
};
```

**Store** (`use-traveler-store.ts`):
- `getTravelersByBus(travelBusId): Traveler[]` — getter ya existe, retorna lista plana filtrada por bus

---

## 3. WORK UNITS

### U1 — Extender tipo `TravelBus` con `lastRowSeats`

**Archivos**: `app/types/travel.ts`

Agregar campo opcional al tipo:

```typescript
export type TravelBus = {
  // ... campos existentes
  seatCount: number;
  lastRowSeats?: number;   // NUEVO: asientos en última fila (baño). Default: seatCount % 4 || 4
};
```

**Nota importante**: Los buses en Supabase se almacenan como JSONB dentro del registro de travel (verificar schema). Si `buses` es una columna JSONB, no requiere migración de SQL — solo cambio de tipo TS. Si es tabla separada, agregar columna `last_row_seats integer`.

**Verificar**: `grep -r "buses" supabase/migrations/ --include="*.sql"` para confirmar.

---

### U2 — Refactorizar `bus-seat-map.vue`

**Archivo**: `app/components/bus-seat-map.vue`

#### 2.1 Nueva interfaz de props

```typescript
type Seat = {
  number: number;     // número real del asiento (1-based)
  status: 'available' | 'occupied';
  passenger?: string; // nombre completo si está ocupado
  travelerId?: string; // para emitir al clickear
};

type Props = {
  totalSeats: number;           // capacidad total del bus
  occupiedSeats: OccupiedSeat[]; // viajeros con asiento asignado
  seatsPerRow?: number;         // default: 4
  lastRowSeats?: number;        // default: totalSeats % 4 || 4
};

type OccupiedSeat = {
  travelerId: string;
  seatNumber: number;   // parseado de traveler.seat
  passengerName: string;
};
```

#### 2.2 Lógica de generación del grid

```typescript
// Generar lista completa de asientos numerados
const allSeats = computed((): Seat[] => {
  const occupied = new Map(
    props.occupiedSeats.map(s => [s.seatNumber, s])
  );

  return Array.from({ length: props.totalSeats }, (_, i) => {
    const number = i + 1;
    const occ = occupied.get(number);
    return occ
      ? { number, status: 'occupied', passenger: occ.passengerName, travelerId: occ.travelerId }
      : { number, status: 'available' };
  });
});
```

Luego `computedRows` toma `allSeats.value` en lugar del prop `seats` —
el layout 2-pasillo-2 se mantiene igual (grid 5 col con `null` en posición 3).

#### 2.3 Fix del tooltip

Usar clases `group` de Tailwind en el elemento padre:

```vue
<div class="relative h-12 ... group" @click="selectSeat(seat)">
  <span>{{ seat.number }}</span>
  <div class="absolute ... opacity-0 group-hover:opacity-100 transition pointer-events-none">
    {{ seat.passenger }}
  </div>
</div>
```

#### 2.4 Fix del CSS scoped

Eliminar:
```css
/* ELIMINAR — aplica a todos los div */
div {
  position: relative;
}
```

Reemplazar con clases Tailwind `relative` en los elementos que lo necesiten.

#### 2.5 Emit actualizado

```typescript
const emit = defineEmits<{
  seatSelected: [travelerId: string, seatNumber: number];
}>();
```

#### 2.6 Estado visual de asientos

| Estado | Color | Condición |
|---|---|---|
| Disponible | `bg-green-100 border-green-300 text-green-700` | `status === 'available'` |
| Ocupado | `bg-red-500 text-white cursor-pointer` | `status === 'occupied'` |
| Sin asignar | `bg-gray-100 border-gray-200 text-gray-400` | asiento generado sin traveler y sin asiento en el traveler |

> **Nota UX**: Clickear asiento ocupado → emite `seatSelected` con el `travelerId` para abrir modal de edición. Clickear asiento vacío → no emite nada (no se puede crear desde el mapa, solo desde el botón "Nuevo Viajero").

---

### U3 — Actualizar `index.vue` para multi-bus con selector

**Archivo**: `app/pages/travels/[id]/travelers/index.vue`

#### 3.1 Estado local nuevo

```typescript
const selectedBusId = shallowRef<string | null>(null);

// Inicializar al primer bus al montar
onMounted(async () => {
  // ... fetch existente
  if (allBuses.value.length > 0) {
    selectedBusId.value = allBuses.value[0]!.id;
  }
});
```

#### 3.2 Datos derivados por bus seleccionado

```typescript
const selectedBus = computed(() =>
  allBuses.value.find(b => b.id === selectedBusId.value) ?? null
);

// Lista plana de viajeros del bus seleccionado (usar getter existente del store)
const travelersBySelectedBus = computed(() =>
  selectedBusId.value
    ? travelerStore.getTravelersByBus(selectedBusId.value)
    : []
);

// Datos para el mapa
const occupiedSeats = computed(() =>
  travelersBySelectedBus.value
    .filter(t => t.seat)
    .map(t => ({
      travelerId: t.id,
      seatNumber: Number.parseInt(t.seat, 10),
      passengerName: `${t.firstName} ${t.lastName}`,
    }))
    .filter(s => !Number.isNaN(s.seatNumber))
);

const lastRowSeats = computed(() => {
  const bus = selectedBus.value;
  if (!bus) return 4;
  return bus.lastRowSeats ?? (bus.seatCount % 4 || 4);
});
```

#### 3.3 Selector de bus en UI

Si `allBuses.length > 1`, mostrar tabs con el label de cada bus:

```vue
<!-- Selector de bus — solo si hay más de uno -->
<div v-if="allBuses.length > 1" class="flex gap-2 flex-wrap">
  <UButton
    v-for="bus in allBuses"
    :key="bus.id"
    :variant="selectedBusId === bus.id ? 'solid' : 'outline'"
    size="sm"
    @click="selectedBusId = bus.id"
  >
    {{ getBusLabel(bus.id) }}
  </UButton>
</div>
```

#### 3.4 Uso correcto del componente

```vue
<BusSeatMap
  v-if="selectedBus"
  :total-seats="selectedBus.seatCount"
  :occupied-seats="occupiedSeats"
  :seats-per-row="4"
  :last-row-seats="lastRowSeats"
  @seat-selected="(travelerId) => openEditModal(travelerStore.getTravelerById(travelerId))"
/>

<div v-else-if="allBuses.length === 0" class="text-center text-gray-400 py-8">
  Sin autobuses asignados a este viaje
</div>
```

#### 3.5 Título de la sección del mapa

```vue
<div class="flex items-center justify-between mb-3">
  <h2 class="text-lg font-semibold">
    Distribución de asientos
    <span v-if="selectedBus" class="text-gray-500 font-normal text-sm ml-2">
      {{ occupiedSeats.length }} / {{ selectedBus.seatCount }} asientos ocupados
    </span>
  </h2>
</div>
```

---

## 4. ORDEN DE IMPLEMENTACIÓN

```
U1 (tipo) → U2 (componente) → U3 (página)
```

U1 y U2 son independientes entre sí — se pueden trabajar en paralelo. U3 depende de ambos.

---

## 5. ARCHIVOS A MODIFICAR / CREAR

| Archivo | Acción | Unidad |
|---|---|---|
| `app/types/travel.ts` | Agregar `lastRowSeats?: number` a `TravelBus` | U1 |
| `app/components/bus-seat-map.vue` | Refactorizar completo | U2 |
| `app/pages/travels/[id]/travelers/index.vue` | Agregar selector de bus + uso correcto del mapa | U3 |

---

## 6. VERIFICAR ANTES DE EMPEZAR

```bash
# Confirmar si buses es JSONB en Supabase o tabla separada
grep -r "buses" supabase/migrations/ --include="*.sql" | head -20

# Confirmar getter getTravelersByBus existe en el store
grep -n "getTravelersByBus" app/stores/use-traveler-store.ts

# Confirmar que getTravelerById existe (necesario para U3)
grep -n "getTravelerById" app/stores/use-traveler-store.ts
```

---

## 7. SKILLS RECOMENDADOS PARA EL DEV-AGENT

Usar los siguientes skills disponibles en `.claude/skills/`:

- `@.claude/skills/vue` — composables, `<script setup>`, reactivity
- `@.claude/skills/nuxt-ui` — `UButton`, `UTabs`, componentes de layout
- `@.claude/skills/vue-best-practices` — Composition API, `shallowRef`, `computed`
- `@.claude/skills/pinia` — acceso a stores y getters

---

## 8. NOTAS IMPORTANTES

1. **No crear asientos desde el mapa**: El mapa es solo visualización y edición. Para registrar un nuevo viajero se usa el botón "Nuevo Viajero" existente.
2. **`seat` es string numérico**: `Traveler.seat` puede ser `""` (sin asignar) o `"1"`-`"N"`. Siempre parsear con `parseInt` y filtrar `NaN`.
3. **Viajeros sin asiento asignado** no aparecen en el mapa — solo en la tabla. El mapa muestra asientos, no viajeros.
4. **`getTravelersByBus`** ya existe en el store y retorna lista plana — usar ese getter directamente, no `filteredGroupedTravelers` (que es árbol).
5. **Buses en Supabase**: Si `TravelBus` es JSONB dentro del travel, el campo `lastRowSeats` no requiere migración SQL. Solo es un cambio en el tipo TypeScript.
