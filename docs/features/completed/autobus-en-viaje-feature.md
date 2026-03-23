# Feature: Autobuses en Viajes y Catálogo de Unidades

## Estado: ✅ COMPLETADA

**Fecha de inicio**: 2026-03-22
**Fecha de completación**: 2026-03-22
**Branch**: `feature/add-atuobus-to-travel`

---

## 1. OBJETIVO

Permitir al usuario:
1. **Agregar autobuses a un viaje** — saber cuántos autobuses y de qué proveedor lleva, con toda la información del vehículo y operadores.
2. **Gestionar un catálogo de unidades** — registrar autobuses dentro de las "Agencias de Autobús" para reutilizarlos en futuros viajes sin tener que reingresar datos.

---

## 2. USER STORY

> **Como usuario**, quiero poder agregar autobuses al viaje para saber cuántos autobuses y de qué proveedor voy a llevar.
> Los autobuses deben registrarse también como "unidades" dentro de los proveedores de tipo "agencias de autobuses", para no tener que volver a agregarlos en cada viaje si elijo el mismo proveedor y camión. Debo poder editarlos en caso de que cambie algo.

---

## 3. CAMPOS DEL AUTOBÚS

### 3.1 Campos en el catálogo de unidades (por proveedor)

| Campo              | Tipo     | Requerido |
| ------------------ | -------- | --------- |
| Proveedor          | Relación | ✅ Sí     |
| Modelo             | string   | No        |
| Marca              | string   | No        |
| Año                | number   | No        |
| Cantidad de asientos | number | ✅ Sí     |
| Precio de renta    | number   | ✅ Sí     |
| Activo             | boolean  | (siempre) |

### 3.2 Campos adicionales al asignar a un viaje

| Campo               | Tipo   | Requerido |
| ------------------- | ------ | --------- |
| Operador 1 nombre   | string | ✅ Sí     |
| Operador 1 teléfono | string | ✅ Sí     |
| Operador 2 nombre   | string | No        |
| Operador 2 teléfono | string | No        |

> **Nota**: precio de renta y asientos pueden ser sobreescritos al asignar al viaje (puede variar por contrato).

---

## 4. ARQUITECTURA DE DATOS

### 4.1 Nuevo tipo `Bus` (catálogo de unidades)

**Archivo**: `app/types/bus.ts` (NUEVO)

```typescript
// Modelo de autobús en el catálogo de unidades de un proveedor
export type Bus = {
  id: string;
  providerId: string;          // Relación con Provider (agencias-autobus)
  modelo?: string;
  marca?: string;
  año?: number;
  cantidadAsientos: number;    // Requerido
  precioRenta: number;         // Requerido (precio base de referencia)
  activo: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BusFormData = Omit<Bus, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
};

export type BusUpdateData = Omit<Bus, 'id' | 'createdAt' | 'updatedAt'>;
```

### 4.2 Nuevo tipo `TravelBus` (autobús en un viaje)

**Archivo**: `app/types/travel.ts` (MODIFICAR — agregar)

```typescript
// Autobús asignado a un viaje
export type TravelBus = {
  id: string;
  busId?: string;              // Referencia opcional al catálogo (Bus.id)
  providerId: string;          // Proveedor agencias-autobus (requerido)
  modelo?: string;
  marca?: string;
  año?: number;
  operador1Nombre: string;     // Requerido
  operador1Telefono: string;   // Requerido
  operador2Nombre?: string;
  operador2Telefono?: string;
  cantidadAsientos: number;    // Requerido
  precioRenta: number;         // Requerido (puede diferir del catálogo)
};

// Modificar Travel para incluir autobuses:
export type Travel = {
  // ... campos existentes ...
  autobuses: TravelBus[];      // NUEVO
};
```

---

## 5. STORE ARCHITECTURE (PINIA)

### 5.1 Nuevo store de autobuses (catálogo)

**Archivo**: `app/stores/use-bus-store.ts` (NUEVO)

**Estado**:
```typescript
const buses = ref<Bus[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
```

**Getters**:
- `allBuses` — Todos los autobuses
- `activeBuses` — Solo activos
- `getBusById(id)` — Por ID
- `getBusesByProvider(providerId)` — Por proveedor (activos)
- `totalBuses` — Conteo total

**Actions**:
- `addBus(data: BusFormData): Bus`
- `updateBus(id, data): boolean`
- `deleteBus(id): boolean`
- `toggleBusStatus(id): boolean`

**Persistencia**:
```typescript
persist: {
  key: 'viajeros-ligeros-buses',
  storage: localStorage,
  pick: ['buses'],
}
```

### 5.2 Modificaciones al store de viajes

**Archivo**: `app/stores/use-travel-store.ts` (MODIFICAR)

Nuevas actions:
- `addBusToTravel(travelId, busData: Omit<TravelBus, 'id'>): TravelBus`
- `updateTravelBus(travelId, busId, data: Partial<TravelBus>): boolean`
- `removeBusFromTravel(travelId, busId): boolean`
- `getBusesForTravel(travelId): TravelBus[]`

Asegurar que `autobuses: []` se incluya en datos mock y valores por defecto.

---

## 6. COMPONENTES

### 6.1 Componentes nuevos

#### `bus-form.vue`
**Archivo**: `app/components/bus-form.vue`

**Propósito**: Formulario CRUD para el catálogo de unidades (sin campos de operadores).

**Props**: `bus?: Bus | null`, `providerId: string`
**Emits**: `submit(data: BusFormData)`, `cancel`

**Campos**:
- Marca (UInput) — Opcional
- Modelo (UInput) — Opcional
- Año (UInput type="number") — Opcional
- Cantidad de asientos (UInput type="number") — Requerido
- Precio de renta (UInput type="number") — Requerido

**Validación Zod**:
```typescript
{
  marca: z.string().max(50).optional(),
  modelo: z.string().max(50).optional(),
  año: z.number().int().min(1950).max(currentYear + 1).optional(),
  cantidadAsientos: z.number().int().min(1).max(100),
  precioRenta: z.number().min(0),
}
```

---

#### `bus-list.vue`
**Archivo**: `app/components/bus-list.vue`

**Propósito**: Lista de unidades (autobuses) de un proveedor en la sección "Unidades".

**Props**: `providerId: string`

**Características**:
- Tabla con columnas: Marca, Modelo, Año, Asientos, Precio renta, Acciones
- Botón "Nueva Unidad"
- Modal con `bus-form.vue` para crear/editar
- Acciones por fila: Editar, Eliminar
- Estado vacío con CTA

---

#### `travel-bus-form.vue`
**Archivo**: `app/components/travel-bus-form.vue`

**Propósito**: Formulario para agregar/editar un autobús en un viaje.

**Props**: `travelBus?: TravelBus | null`
**Emits**: `submit(data: Omit<TravelBus, 'id'>)`, `cancel`

**Flujo UX**:
1. Seleccionar proveedor (solo `agencias-autobus` activos)
2. Opcional: seleccionar unidad del catálogo del proveedor → pre-llena campos del vehículo
3. Editar campos del vehículo (editables aunque vengan del catálogo)
4. Ingresar operadores

**Campos**:
- Proveedor (USelect de agencias-autobus) — Requerido
- Unidad del catálogo (USelect, filtra por proveedor) — Opcional, pre-llena campos
- Marca (UInput)
- Modelo (UInput)
- Año (UInput)
- Cantidad de asientos (UInput type="number") — Requerido
- Precio de renta (UInput type="number") — Requerido
- [UDivider] Operadores
- Operador 1 nombre (UInput) — Requerido
- Operador 1 teléfono (UInput type="tel") — Requerido
- Operador 2 nombre (UInput) — Opcional
- Operador 2 teléfono (UInput type="tel") — Opcional

---

#### `travel-bus-list.vue`
**Archivo**: `app/components/travel-bus-list.vue`

**Propósito**: Lista de autobuses de un viaje (sección "Autobuses" en la vista/edición del viaje).

**Props**: `travelId: string`, `editable?: boolean`

**Características**:
- Cards o tabla con info del vehículo + operadores
- Si `editable`: botón "Agregar Autobús" + acciones Editar/Eliminar
- Muestra nombre del proveedor (lookup en providerStore)
- Estado vacío con mensaje apropiado

---

### 6.2 Componentes a modificar

#### `providers/[categoria].vue` — sección "Unidades"

Cuando `categoria === 'agencias-autobus'`:
- Agregar tab o sección "Unidades" después de la tabla de proveedores
- Al seleccionar/expandir un proveedor, mostrar `bus-list.vue` con su `providerId`
- **Alternativa UX**: dentro de la fila de cada proveedor, un link/botón "Ver Unidades" que despliega panel con `bus-list.vue`

> **Decisión de implementación**: Expandir la tabla con una fila de detalle, o una sección debajo del listado de proveedores al hacer click en uno. Se recomienda el segundo patrón (click → panel lateral o sección debajo).

#### `travels/[id]/index.vue` — sección "Autobuses"

- Agregar sección "Autobuses" en la vista de detalle del viaje
- Renderizar `<TravelBusList :travel-id="travelId" :editable="false" />`

#### `travels/[id]/edit.vue` — gestión de autobuses

- Agregar sección "Autobuses" en el formulario de edición
- Renderizar `<TravelBusList :travel-id="travelId" :editable="true" />`

---

## 7. UX / UI

### Vista de detalle del viaje

La sección de autobuses se muestra como una nueva tarjeta `UCard` con título "Autobuses" e ícono `i-lucide-bus`, mostrando cards por cada autobús con:
- Nombre del proveedor (badge)
- Marca / Modelo / Año
- Asientos y precio
- Operador 1: nombre + teléfono
- Operador 2 (si existe): nombre + teléfono

### Vista de proveedor (agencias-autobus)

En la página `/providers/agencias-autobus`, la lista de proveedores incluye una acción "Ver Unidades" en el menú de cada fila. Al hacer click:
- Se abre un panel/sección debajo de la tabla (o modal)
- Muestra el componente `bus-list.vue` para ese proveedor

---

## 8. FASES DE IMPLEMENTACIÓN

### Fase 1 — Tipos y store del catálogo de unidades

**Objetivo**: Base de datos de autobuses lista.

**Tareas**:
- ✅ Crear `app/types/bus.ts` con tipos `Bus`, `BusFormData`, `BusUpdateData`
- ✅ Modificar `app/types/travel.ts` — agregar `TravelBus` y `autobuses: TravelBus[]` en `Travel`
- ✅ Crear `app/stores/use-bus-store.ts` con CRUD y persistencia
- ✅ Actualizar `app/stores/use-travel-store.ts` — agregar actions de autobuses y campo en mock data

### Fase 2 — Catálogo de unidades en proveedores

**Objetivo**: CRUD de autobuses dentro de agencias-autobus.

**Tareas**:
- ✅ Crear `app/components/bus-form.vue`
- ✅ Crear `app/components/bus-list.vue`
- ✅ Modificar `app/pages/providers/[categoria].vue` — mostrar sección "Unidades" para agencias-autobus

### Fase 3 — Autobuses en viajes

**Objetivo**: Agregar y gestionar autobuses en viajes.

**Tareas**:
- ✅ Crear `app/components/travel-bus-form.vue` (con selector de proveedor y unidad del catálogo)
- ✅ Crear `app/components/travel-bus-list.vue`
- ✅ Modificar `app/pages/travels/[id]/index.vue` — sección "Autobuses" de solo lectura
- ✅ Modificar `app/pages/travels/[id]/edit.vue` — sección "Autobuses" editable

---

## 9. VALIDACIONES Y REGLAS DE NEGOCIO

1. **Proveedor**: Solo proveedores de categoría `agencias-autobus` y activos pueden asignarse.
2. **Operador 1**: Nombre y teléfono son requeridos para cualquier autobús en un viaje.
3. **Precio de renta en viaje**: Puede diferir del precio de referencia en el catálogo.
4. **Selección de catálogo**: Al seleccionar una unidad del catálogo, los campos del vehículo se pre-llenan pero son editables.
5. **Eliminación de unidad del catálogo**: No afecta los `TravelBus` ya asignados (los datos están copiados, no son referencias vivas).
6. **Unidad inactiva en catálogo**: No aparece en el selector, pero los viajes que ya la usan no se afectan.

---

## 10. RESUMEN DE ARCHIVOS

### Crear
1. `app/types/bus.ts`
2. `app/stores/use-bus-store.ts`
3. `app/components/bus-form.vue`
4. `app/components/bus-list.vue`
5. `app/components/travel-bus-form.vue`
6. `app/components/travel-bus-list.vue`

### Modificar
1. `app/types/travel.ts` — agregar `TravelBus`, `autobuses` en `Travel`
2. `app/stores/use-travel-store.ts` — actions de autobuses, mock data
3. `app/pages/providers/[categoria].vue` — sección "Unidades"
4. `app/pages/travels/[id]/index.vue` — sección autobuses (lectura)
5. `app/pages/travels/[id]/edit.vue` — sección autobuses (edición)

---

## 11. RESUMEN DE IMPLEMENTACIÓN

### Archivos creados
- `app/types/bus.ts`
- `app/stores/use-bus-store.ts`
- `app/components/bus-form.vue`
- `app/components/bus-list.vue`
- `app/components/travel-bus-form.vue`
- `app/components/travel-bus-list.vue`

### Archivos modificados
- `app/types/travel.ts`
- `app/stores/use-travel-store.ts`
- `app/components/travel-form.vue`
- `app/pages/providers/[categoria].vue`
- `app/pages/travels/[id]/index.vue`
- `app/pages/travels/[id]/edit.vue`

### Funcionalidades implementadas
- ✅ Catálogo de unidades por proveedor
- ✅ CRUD de buses
- ✅ Selector cascading proveedor→unidad en formulario de viaje
- ✅ Sync automático al catálogo al agregar bus a viaje
- ✅ Sección Autobuses en detalle/edición de viaje
- ✅ Sección Unidades en página de agencias-autobus

### Bugs corregidos
- `autobuses is not iterable` (datos legacy localStorage)
- Buses no aparecían en catálogo proveedor (stores desconectados → fix: `addBusToTravel` ahora sincroniza con `useBusStore`)

**Última actualización**: 2026-03-22
