# Plan: Sistema de Gestión de Viajes

## Objetivo
Implementar un sistema completo para agregar y gestionar viajes en la agencia "Viajeros Ligeros" con datos extendidos, persistencia en localStorage y visualización en tabla.

## Arquitectura

**Stack:**
- Pinia Store para estado centralizado
- localStorage para persistencia
- UTable de Nuxt UI para visualización
- Zod para validación de formularios
- Vue 3 Composition API + TypeScript

## Archivos a Crear/Modificar

### 1. Tipos TypeScript
**Archivo:** `/home/valac/Documents/Projects/Valac/viajeros-ligeros-bun/app/types/travel.ts`

Definir tipos:
- `TravelStatus`: Union type para estados (pendiente | confirmado | en-curso | completado | cancelado)
- `TravelActivity`: Tipo para actividades del itinerario (id, dia, titulo, descripcion, hora, ubicacion)
- `TravelService`: Tipo para servicios incluidos (id, nombre, descripcion, incluido)
- `Travel`: Modelo principal completo con todos los campos
- `TravelFormData`: Tipo para formulario (omite id, createdAt, updatedAt)

**Campos del modelo Travel:**
- id, destino, fechaInicio, fechaFin, precio, descripcion
- imagenUrl, estado, cliente
- itinerario (array de TravelActivity)
- servicios (array de TravelService)
- notasInternas
- createdAt, updatedAt

### 2. Pinia Store
**Archivo:** `/home/valac/Documents/Projects/Valac/viajeros-ligeros-bun/app/stores/travels.ts`

**Estado:**
- `travels: Travel[]`
- `loading: boolean`
- `error: string | null`

**Getters:**
- `allTravels`: Ordenados por fecha de creación (más recientes primero)
- `getTravelById(id)`: Buscar viaje específico
- `getTravelsByStatus(status)`: Filtrar por estado
- `stats`: Objeto con contadores por estado y total
- `totalRevenue`: Suma de precios de viajes confirmados/completados

**Actions:**
- `addTravel(data)`: Crear viaje con ID auto-generado y timestamps
- `updateTravel(id, data)`: Actualizar viaje y timestamp
- `deleteTravel(id)`: Eliminar viaje
- `updateTravelStatus(id, status)`: Cambiar solo el estado

**Persistencia:**
- Plugin persist con key: 'viajeros-ligeros-travels'
- Storage: localStorage

### 3. Dashboard de Viajes
**Archivo:** `/home/valac/Documents/Projects/Valac/viajeros-ligeros-bun/app/pages/travels/dashboard.vue`

**Componentes principales:**
1. **Header:**
   - Título "Gestión de Viajes"
   - Botón "Nuevo Viaje" con icono i-lucide-plus
   - 4 cards de estadísticas: Total, Confirmados, En Curso, Ingresos

2. **Tabla UTable:**
   - Columnas: ID (recortado), Destino, Cliente, Fechas (rango), Estado (UBadge), Precio (formateado), Acciones
   - Estado con colores: pendiente (warning), confirmado (info), en-curso (primary), completado (success), cancelado (error)
   - Dropdown de acciones por fila: Ver detalles, Editar, Eliminar
   - Sticky header

3. **Modal de Formulario:**
   - UModal con componente TravelForm
   - Título dinámico: "Nuevo Viaje" o "Editar Viaje"
   - Pasa travel actual si es edición o null si es creación

**Funciones auxiliares:**
- `getStatusColor(status)`: Mapea estado a color de badge
- `formatDate(dateString)`: Formato español dd/MMM/yyyy
- `formatCurrency(amount)`: Formato EUR
- `getRowActions(travel)`: Array de acciones del dropdown
- `deleteTravel(travel)`: Confirmar y eliminar con toast

**Estado local:**
- `isFormModalOpen: boolean`
- `editingTravel: Travel | null`

**Lifecycle:**

### 4. Formulario de Viaje
**Archivo:** `/home/valac/Documents/Projects/Valac/viajeros-ligeros-bun/app/components/travel-form.vue`

**Props:**
- `travel?: Travel | null` (para modo edición)

**Emits:**
- `submit: [data: TravelFormData]`
- `cancel: []`

**Schema Zod:**
```typescript
z.object({
  destino: z.string().min(3, 'Mínimo 3 caracteres').max(100),
  cliente: z.string().min(3, 'Mínimo 3 caracteres').max(100),
  fechaInicio: z.string().min(1, 'Fecha requerida'),
  fechaFin: z.string().min(1, 'Fecha requerida'),
  precio: z.number().min(0, 'Precio debe ser positivo').max(999999),
  descripcion: z.string().min(10, 'Mínimo 10 caracteres').max(1000),
  imagenUrl: z.string().url('URL inválida').optional().or(z.literal('')),
  estado: z.enum(['pendiente', 'confirmado', 'en-curso', 'completado', 'cancelado']),
  notasInternas: z.string().max(500).optional(),
}).refine(
  (data) => new Date(data.fechaFin) >= new Date(data.fechaInicio),
  { message: 'Fecha fin debe ser >= fecha inicio', path: ['fechaFin'] }
)
```

**Campos del formulario:**
1. Destino (UInput, placeholder: "París, Francia")
2. Cliente (UInput)
3. Fecha Inicio (UInput type="date")
4. Fecha Fin (UInput type="date")
5. Precio (UInput type="number", min="0", step="0.01")
6. Estado (USelect con opciones)
7. Descripción (UTextarea, rows="3")
8. URL Imagen (UInput, placeholder: "https://...")
9. Notas Internas (UTextarea, rows="2")

**Layout:**
- Grid 2 columnas para fechas y precio/estado
- Resto campos full-width
- Botones al final: Cancelar (neutral, outline) y Guardar (primary, submit)

**Estado inicial:**
- Pre-llenar con props.travel si existe
- Valores por defecto para creación: estado='pendiente', itinerario=[], servicios=[]

### 5. Dependencias
**Instalar:**
```bash
bun add zod
```

## Flujo de Implementación

### Fase 1: Estructura Base
1. Crear archivo de tipos `/app/types/travel.ts`
2. Crear directorio `/app/stores/`
3. Crear store `/app/stores/travels.ts` con configuración de persistencia
4. Instalar dependencia: `bun add zod`

### Fase 2: Formulario
1. Crear componente `/app/components/travel-form.vue`
2. Implementar schema de validación Zod
3. Configurar campos básicos del formulario
4. Probar validaciones

### Fase 3: Dashboard
1. Actualizar `/app/pages/travels/dashboard.vue`
2. Implementar header con estadísticas
3. Configurar UTable con columnas
4. Implementar dropdown de acciones
5. Conectar modal de formulario
6. Implementar handlers CRUD

### Fase 4: Testing y Refinamiento
1. Verificar persistencia en localStorage
2. Probar CRUD completo
3. Validar formatos de fecha y moneda
4. Verificar toasts de feedback
5. Confirmar responsive design

## Notas de Implementación

**Convenciones del proyecto:**
- Archivos en kebab-case
- Usar `type` en vez de `interface`
- 2-space indent, semicolons, single quotes
- Imports auto-ordenados por perfectionist

**UX:**
- Toasts para feedback de todas las acciones
- Confirmación antes de eliminar
- Loading states en botones durante submit
- Badges con colores semánticos por estado

**TypeScript:**
- Todo fuertemente tipado
- No usar `any`
- Aprovechar inference donde sea posible

**Performance:**
- UTable maneja virtualización internamente
- Getters computados para estadísticas
- Persistencia automática sin lag (plugin de Pinia)

## Archivos Críticos

1. `/home/valac/Documents/Projects/Valac/viajeros-ligeros-bun/app/types/travel.ts` - Fundamento de tipos
2. `/home/valac/Documents/Projects/Valac/viajeros-ligeros-bun/app/stores/travels.ts` - Lógica de estado
3. `/home/valac/Documents/Projects/Valac/viajeros-ligeros-bun/app/pages/travels/dashboard.vue` - Vista principal
4. `/home/valac/Documents/Projects/Valac/viajeros-ligeros-bun/app/components/travel-form.vue` - Formulario CRUD

## Resultado Esperado

Sistema funcional que permite:
- ✅ Crear viajes con todos los datos extendidos
- ✅ Visualizar viajes en tabla ordenada
- ✅ Editar viajes existentes
- ✅ Eliminar viajes con confirmación
- ✅ Ver estadísticas en tiempo real
- ✅ Persistencia automática en localStorage
- ✅ Validación completa de formularios
- ✅ Feedback visual con toasts y badges
- ✅ Responsive y accesible

**Tiempo estimado:** La implementación completa de las 4 fases debería tomar entre 1-2 horas de desarrollo.

---

## ESTADO: ✅ IMPLEMENTACIÓN COMPLETADA

### Resumen de Implementación

El sistema de gestión de viajes ha sido implementado completamente y está funcional. Todos los archivos fueron creados y probados exitosamente.

### Archivos Creados

1. **app/types/travel.ts** ✅
   - Tipos: `TravelStatus`, `TravelActivity`, `TravelService`, `Travel`, `TravelFormData`, `TravelUpdateData`
   - Agregado `TravelUpdateData` para evitar non-null assertions en updates

2. **app/stores/use-travel-store.ts** ✅
   - Implementado con Composition API (NO Options API)
   - Persistencia con `@pinia-plugin-persistedstate/nuxt`
   - CRUD completo: addTravel, updateTravel, deleteTravel, updateTravelStatus
   - Getters computados: allTravels, getTravelById, getTravelsByStatus, stats, totalRevenue
   - Mock data con 2 viajes de ejemplo (París y Tokio)

3. **app/components/travel-form.vue** ✅
   - Validación con Zod schema
   - Soporte para creación y edición
   - 9 campos: destino, cliente, fechaInicio, fechaFin, precio, estado, descripcion, imagenUrl, notasInternas
   - Grid responsive 2 columnas para fechas y precio/estado

4. **app/pages/travels/dashboard.vue** ✅
   - Dashboard completo con 4 cards de estadísticas
   - UTable moderna usando TanStack Table API con función `h()`
   - Columnas: ID, Destino, Cliente, Fechas, Estado (UBadge), Precio, Acciones
   - Dropdown de acciones por fila: Ver detalles, Editar, Eliminar
   - Modal para formulario de creación/edición

### Archivos Modificados

1. **nuxt.config.ts** ✅
   - Agregado `@pinia-plugin-persistedstate/nuxt` a modules

2. **eslint.config.mjs** ✅
   - Agregado `CLAUDE.md` a lista de ignore para regla kebab-case

3. **app/layouts/default.vue** ✅
   - Refactorizado con estructura moderna

4. **app/pages/index.vue** ✅
   - Actualizado para integración con dashboard

### Dependencias Instaladas

```bash
bun add zod @pinia-plugin-persistedstate/nuxt
```

### Correcciones Importantes Realizadas

#### 1. Pinia Store: Options API → Composition API
**Problema inicial:** El agente generó el store con Options API
```typescript
// ❌ INCORRECTO (Options API)
defineStore('travels', {
  state: () => ({ ... }),
  getters: { ... },
  actions: { ... }
})
```

**Solución aplicada:** Convertido a Composition API
```typescript
// ✅ CORRECTO (Composition API)
defineStore('travels', () => {
  const travels = ref<Travel[]>([]);
  const allTravels = computed(() => ...);
  function addTravel() { ... }
  return { travels, allTravels, addTravel, ... };
})
```

#### 2. UTable: Template Slots → h() Functions
**Problema inicial:** Uso de template slots para renderizar celdas
```vue
<!-- ❌ INCORRECTO (Patrón antiguo) -->
<template #destino-data="{ row }">
  <span>{{ row.destino }}</span>
</template>
```

**Solución aplicada:** Renderizado con función `h()` en columnas
```typescript
// ✅ CORRECTO (Patrón moderno TanStack Table)
import { h } from 'vue';

const columns: TableColumn<Travel>[] = [
  {
    accessorKey: 'destino',
    header: 'Destino',
    cell: ({ row }) => {
      return h('div', { class: 'flex items-center gap-2' }, [
        h('span', { class: 'i-lucide-map-pin w-4 h-4' }),
        h('span', { class: 'font-medium' }, row.getValue('destino')),
      ]);
    },
  },
];
```

#### 3. TypeScript: Non-null Assertions → Explicit Checks
**Problema inicial:** Uso de non-null assertion en updateTravel
```typescript
// ❌ INCORRECTO
const existingTravel = travels.value[index]!; // Non-null assertion
```

**Solución aplicada:** Check explícito y tipo específico
```typescript
// ✅ CORRECTO
const existingTravel = travels.value[index];
if (!existingTravel) {
  error.value = 'Viaje no encontrado';
  return false;
}

// Además, creado tipo específico TravelUpdateData sin id opcional
export type TravelUpdateData = Omit<Travel, 'id' | 'createdAt' | 'updatedAt'>;
```

#### 4. Nuxt UI Components: Correcciones de API
- `color="gray"` → `color="neutral"` en UButton
- `row` → `row.original` en columna de acciones
- `key` → `accessorKey` en definición de columnas
- `label` → `header` en definición de columnas

### Commits Creados

Se crearon 10 commits convencionales organizados en capas lógicas:

1. `feat(types): add travel domain types with activity and service support`
2. `feat(stores): add travel store with composition API and localStorage persistence`
3. `feat(components): add travel form with Zod validation`
4. `feat(pages): add travel dashboard with statistics and table`
5. `feat(pages): add advanced UTable features with row actions and badges`
6. `feat(config): add Pinia persistedstate plugin to nuxt config`
7. `refactor(layouts): restructure default layout for dashboard integration`
8. `refactor(pages): update index page for travel dashboard access`
9. `build(eslint): add CLAUDE.md to kebab-case ignore list`
10. `docs: create comprehensive CLAUDE.md project documentation`

### Lecciones Aprendidas

1. **Siempre usar Composition API en Pinia stores** - NUNCA Options API
2. **UTable moderna usa h() en columns** - NO template slots
3. **Evitar non-null assertions** - Usar checks explícitos y tipos específicos
4. **Consultar documentación de Nuxt UI** - API ha cambiado significativamente
5. **TypeScript strict mode** - Resolver errores de tipo correctamente, no con workarounds

### Características Funcionales Verificadas

- ✅ Crear viajes con formulario validado
- ✅ Editar viajes existentes
- ✅ Eliminar viajes con confirmación
- ✅ Visualizar tabla ordenada por fecha de creación
- ✅ Ver estadísticas en tiempo real (total, confirmados, en curso, ingresos)
- ✅ Badges de estado con colores semánticos
- ✅ Persistencia automática en localStorage
- ✅ Formato de moneda EUR
- ✅ Formato de fechas en español
- ✅ Toasts de feedback para todas las acciones
- ✅ Modal responsive para formulario
- ✅ Dropdown de acciones por fila
- ✅ Datos mock de ejemplo (París y Tokio)

### Testing Realizado

- ✅ TypeScript typecheck exitoso
- ✅ ESLint sin errores
- ✅ Todas las validaciones de formulario funcionan
- ✅ CRUD completo probado
- ✅ Persistencia en localStorage verificada

### Estado Final

**El sistema está 100% funcional y listo para producción.** Todos los archivos pasan validación de tipos, linting, y las pruebas manuales de CRUD completadas exitosamente.
