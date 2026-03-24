# Feature: Módulo de Viajeros

## Estado: ✅ COMPLETADA

**Fecha de inicio**: 2026-03-24
**Fecha de completación**: 2026-03-24
**Branch**: `feature/traveler-module`

---

## 🎯 Contexto

La aplicación es una plataforma de gestión de viajes locales que permite rentar camiones a diferentes proveedores. Actualmente el sistema cuenta con:

* Un dashboard de viajes
* Un catálogo de proveedores
* Un catálogo de unidades (camiones)

Se requiere expandir el sistema para gestionar a los clientes que reservan lugares en los viajes.

---

## 🚀 Objetivo

Crear el módulo de gestión de clientes, denominado **"Viajeros"**, que permita registrar y administrar a las personas que reservan lugares en los viajes.

---

## 📌 Requerimientos Funcionales

### 1. Módulo de Navegación

* Agregar una nueva opción en el menú principal llamada **"Viajeros"**

---

### 2. Gestión de Viajeros (CRUD)

El sistema debe permitir:

* Crear viajeros
* Consultar viajeros
* Actualizar viajeros
* Eliminar viajeros

---

### 3. Datos del Viajero

Cada viajero debe contener la siguiente información:

* Nombre
* Apellido
* Teléfono
* Viaje(s) asociado(s)
* Camión asignado
* Asiento asignado
* Punto de abordaje
* Indicador: ¿Es representante de grupo?
* Teléfono (validar duplicado si aplica)

#### Regla especial:

* Si el viajero **NO es representante de grupo**, debe existir un campo que permita identificar quién es su representante o líder de grupo.

---

### 4. Visualización

* Mostrar un listado de todos los viajeros
* Incluir información clave:

  * Nombre completo
  * Viaje
  * Camión
  * Asiento
  * Representante de grupo (sí/no)

---

### 5. Filtros

* Filtrar viajeros por:

  * Viaje
  * Camión

---

## 🧠 Consideraciones de Negocio

* Un viajero puede pertenecer a un grupo
* Un grupo tiene un representante
* La relación entre viajeros debe permitir identificar jerarquía (líder → acompañantes)

---

## ✅ Resultado Esperado

Un módulo funcional de "Viajeros" completamente integrado al sistema, que permita gestionar clientes de viajes individuales o grupales de forma clara y organizada.

---

## 2. ARQUITECTURA DE DATOS

### Tipo `Traveler`

**Archivo**: `app/types/traveler.ts` (NUEVO)

```typescript
export type Traveler = {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  travelId: string;          // FK → Travel.id
  travelBusId: string;       // FK → TravelBus.id dentro del viaje
  asiento: string;
  puntoAbordaje: string;
  esRepresentante: boolean;
  representanteId?: string;  // FK → Traveler.id (solo si esRepresentante=false)
  createdAt: string;
  updatedAt: string;
};

export type TravelerFormData = Omit<Traveler, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };
export type TravelerUpdateData = Partial<TravelerFormData>;
export type TravelerFilters = { travelId?: string; travelBusId?: string };
```

### Relaciones

```
Travel (1) ──── (N) Traveler
TravelBus (1) ── (N) Traveler
Traveler (0..1) ─── (N) Traveler  [representante → acompañantes]
```

---

## 3. STORE (PINIA)

**Archivo**: `app/stores/use-traveler-store.ts` (NUEVO)

**Estado**:
```typescript
const travelers = ref<Traveler[]>([]);
const loading = shallowRef(false);
const error = shallowRef<string | null>(null);
const filters = ref<TravelerFilters>({});
```

**Getters**:
- `allTravelers` — Todos los viajeros ordenados por `createdAt` desc
- `getTravelerById(id)` — Por ID
- `getTravelersByTravel(travelId)` — Viajeros de un viaje
- `getTravelersByBus(travelBusId)` — Viajeros de un autobús
- `getGroupMembers(representanteId)` — Acompañantes de un representante
- `filteredTravelers` — Viajeros filtrados según `filters` activos

**Actions**:
- `addTraveler(data: TravelerFormData): Traveler`
- `updateTraveler(id, data: TravelerUpdateData): Traveler | undefined`
- `deleteTraveler(id): void`
- `setFilters(newFilters: TravelerFilters): void`
- `clearFilters(): void`
- `loadMockData(): void` — Carga datos de prueba (solo si el store está vacío)

**Persistencia**:
```typescript
persist: {
  key: 'viajeros-ligeros-travelers',
  storage: import.meta.client ? localStorage : undefined,
}
```

---

## 4. COMPONENTES

### `traveler-form.vue`

**Archivo**: `app/components/traveler-form.vue` (NUEVO)

**Props**: `traveler?: Traveler | null`, `availableTravels: Travel[]`, `availableTravelers: Traveler[]`
**Emits**: `submit(data: TravelerFormData)`, `cancel`

**Campos y validación Zod**:

| Campo             | Componente  | Validación                          |
| ----------------- | ----------- | ----------------------------------- |
| Nombre            | UInput      | min 2, max 100 chars                |
| Apellido          | UInput      | min 2, max 100 chars                |
| Teléfono          | UInput tel  | min 7, max 20 chars                 |
| Viaje             | USelect     | requerido                           |
| Camión            | USelect     | requerido, filtrado por viaje       |
| Asiento           | UInput      | requerido, max 10 chars             |
| Punto de abordaje | UInput      | min 2, max 150 chars                |
| Es representante  | UCheckbox   | boolean                             |
| Representante     | USelect     | opcional, filtrado por viaje+camión |

**Comportamiento reactivo en cascada**:
1. Al cambiar viaje → resetea camión y representante
2. Al cambiar camión → resetea representante
3. Al marcar `esRepresentante: true` → oculta y limpia `representanteId`

El selector de representante muestra solo viajeros del **mismo viaje y camión** con `esRepresentante: true`.

---

### `traveler-filter-bar.vue`

**Archivo**: `app/components/traveler-filter-bar.vue` (NUEVO)

**Props**: `availableTravels: Travel[]`, `availableBuses: TravelBus[]`
**Model**: `TravelerFilters` (via `defineModel` — Vue 3.4+)

**Comportamiento**:
- Filtro por viaje → reduce el listado de camiones disponibles automáticamente
- Al cambiar viaje → resetea el filtro de camión
- Botón "Limpiar filtros" visible solo cuando hay al menos un filtro activo

---

## 5. PÁGINA

### `app/pages/travelers/index.vue`

**Ruta**: `/travelers`

**Funcionalidades**:
- Header con título y botón "Nuevo Viajero"
- 3 tarjetas de estadísticas: Total viajeros, Representantes, Acompañantes
- `TravelerFilterBar` integrado con el store
- Tabla con columnas: Nombre, Viaje, Camión, Asiento, Punto de abordaje, Representante (badge), Acciones (editar / eliminar)
- Estado vacío diferenciado: sin datos (CTA agregar) vs filtros sin resultados (CTA limpiar)
- Modal con `TravelerForm` para crear/editar

---

## 6. FASES DE IMPLEMENTACIÓN

### Fase 1 — Tipos y Store

- ✅ Crear `app/types/traveler.ts`
- ✅ Crear `app/stores/use-traveler-store.ts`

### Fase 2 — Componentes

- ✅ Crear `app/components/traveler-form.vue`
- ✅ Crear `app/components/traveler-filter-bar.vue`

### Fase 3 — Página y navegación

- ✅ Crear `app/pages/travelers/index.vue`
- ✅ Agregar ítem "Viajeros" al sidebar de navegación

---

## 7. VALIDACIONES Y REGLAS DE NEGOCIO

1. **Cascading selects**: Viaje → Camión → Representante. Cada nivel se resetea al cambiar el anterior.
2. **Representante**: Solo pueden seleccionarse viajeros del mismo viaje y camión con `esRepresentante: true`.
3. **Limpieza de `representanteId`**: Al marcar como representante se elimina el `representanteId` para evitar inconsistencias.
4. **Filtro de camiones**: `traveler-filter-bar` reduce los camiones al viaje seleccionado.
5. **Mock data**: `loadMockData()` no sobreescribe si ya hay datos en el store.

---

## 8. RESUMEN DE ARCHIVOS

### Creados
1. `app/types/traveler.ts`
2. `app/stores/use-traveler-store.ts`
3. `app/components/traveler-form.vue`
4. `app/components/traveler-filter-bar.vue`
5. `app/pages/travelers/index.vue`

### Modificados
1. Sidebar / layout — ítem "Viajeros" en navegación

---

## 9. RESUMEN DE IMPLEMENTACIÓN

### Funcionalidades implementadas
- ✅ Listado de viajeros con filtros por viaje y camión
- ✅ CRUD completo (crear, leer, actualizar, eliminar)
- ✅ Jerarquía de grupo: representante → acompañantes
- ✅ Selección en cascada: viaje → camión → representante
- ✅ Estadísticas: total, representantes, acompañantes
- ✅ Estado vacío diferenciado
- ✅ Persistencia en localStorage
- ✅ Datos mock para desarrollo

**Última actualización**: 2026-03-24
