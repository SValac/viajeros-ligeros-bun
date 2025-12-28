# Feature: Gestión de Itinerarios y Servicios

## Estado: 🚧 EN PLANIFICACIÓN

## Objetivo

Implementar interfaces de usuario para gestionar los campos `itinerario: TravelActivity[]` y `servicios: TravelService[]` que actualmente existen en el modelo Travel pero no tienen UI para su edición.

## Contexto

Actualmente el sistema tiene:

- ✅ Modelo `Travel` con campos `itinerario` y `servicios` (app/types/travel.ts:33-34)
- ✅ Store Pinia con estos campos
- ❌ NO hay UI para agregar/editar/eliminar actividades del itinerario
- ❌ NO hay UI para agregar/editar/eliminar servicios

En el formulario actual (app/components/travel-form.vue:88-89), estos campos simplemente se mantienen como arrays vacíos o conservan valores existentes.

## Alcance

Esta feature implementa la **Fase 3 (parcial)** del ARCHITECTURE_PLAN.md:

- ✅ Gestión de Itinerarios
- ✅ Gestión de Servicios Incluidos
- ⏭️ Página de detalles (siguiente feature)
- ⏭️ Exportación de datos (siguiente feature)

---

## 1. GESTIÓN DE ITINERARIOS

### 1.1 Componente: Lista de Actividades

**Archivo:** `/home/valac/Documents/Projects/Valac/viajeros-ligeros-bun/app/components/travel-activity-list.vue`

**Propósito:** Componente para gestionar actividades del itinerario dentro del formulario de viaje.

**Props:**

- `modelValue: TravelActivity[]` - Array de actividades (v-model)
- `fechaInicio: string` - Fecha de inicio del viaje para validar días
- `fechaFin: string` - Fecha de fin del viaje para validar días

**Emits:**

- `update:modelValue: [activities: TravelActivity[]]`

**Características:**

- Lista de actividades ordenadas por día
- Botón "Agregar Actividad" que abre un mini-formulario
- Cada actividad muestra: Día, Título, Hora, Ubicación
- Acciones por actividad: Editar, Eliminar
- Validación: el día debe estar dentro del rango del viaje
- Drag & drop para reordenar (opcional, fase futura)

**Campos por Actividad:**

```typescript
type TravelActivity = {
  id: string; // UUID generado automáticamente
  dia: number; // Día del itinerario (1, 2, 3...)
  titulo: string; // "Visita a la Torre Eiffel"
  descripcion: string; // Descripción detallada
  hora?: string; // "10:00" (opcional)
  ubicacion?: string; // "Champ de Mars, París" (opcional)
};
```

**UI Layout:**

```
┌─────────────────────────────────────────────────────┐
│  Itinerario del Viaje                     [+ Agregar]│
├─────────────────────────────────────────────────────┤
│                                                       │
│  📅 Día 1 - 10:00                           [✏️] [🗑️] │
│  Torre Eiffel                                        │
│  Visita guiada a la Torre Eiffel                     │
│  📍 Champ de Mars, París                             │
│                                                       │
│  ─────────────────────────────────────────────────   │
│                                                       │
│  📅 Día 2 - 14:00                           [✏️] [🗑️] │
│  Museo del Louvre                                    │
│  Recorrido por las obras principales                 │
│  📍 Rue de Rivoli, París                             │
│                                                       │
└─────────────────────────────────────────────────────┘
```

**Estructura del Código:**

```vue
<script setup lang="ts">
import type { TravelActivity } from '~/types/travel';

type Props = {
  modelValue: TravelActivity[];
  fechaInicio: string;
  fechaFin: string;
};

const props = defineProps<Props>();
const emit = defineEmits<{
  'update:modelValue': [activities: TravelActivity[]];
}>();

// Estado local
const activities = ref<TravelActivity[]>([...props.modelValue]);
const isAddingActivity = ref(false);
const editingActivity = ref<TravelActivity | null>(null);

// Calcular duración del viaje en días
const duracionViaje = computed(() => {
  if (!props.fechaInicio || !props.fechaFin)
    return 0;
  const inicio = new Date(props.fechaInicio);
  const fin = new Date(props.fechaFin);
  const diff = fin.getTime() - inicio.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir ambos días
});

// Actividades ordenadas por día
const sortedActivities = computed(() => {
  return [...activities.value].sort((a, b) => a.dia - b.dia);
});

// Handlers
function addActivity(activity: Omit<TravelActivity, 'id'>) {
  const newActivity: TravelActivity = {
    ...activity,
    id: crypto.randomUUID(),
  };
  activities.value.push(newActivity);
  emit('update:modelValue', activities.value);
  isAddingActivity.value = false;
}

function updateActivity(id: string, activity: Omit<TravelActivity, 'id'>) {
  const index = activities.value.findIndex(a => a.id === id);
  if (index !== -1) {
    activities.value[index] = { ...activity, id };
    emit('update:modelValue', activities.value);
  }
  editingActivity.value = null;
}

function deleteActivity(id: string) {
  activities.value = activities.value.filter(a => a.id !== id);
  emit('update:modelValue', activities.value);
}

// Sincronizar con prop cuando cambia externamente
watch(() => props.modelValue, (newVal) => {
  activities.value = [...newVal];
}, { deep: true });
</script>
```

### 1.2 Componente: Formulario de Actividad

**Archivo:** `/home/valac/Documents/Projects/Valac/viajeros-ligeros-bun/app/components/travel-activity-form.vue`

**Propósito:** Mini-formulario para agregar/editar una actividad individual.

**Props:**

- `activity?: TravelActivity | null` - Actividad a editar (null si es nueva)
- `maxDia: number` - Día máximo permitido (duración del viaje)

**Emits:**

- `submit: [activity: Omit<TravelActivity, 'id'>]`
- `cancel: []`

**Schema Zod:**

```typescript
z.object({
  dia: z.number()
    .min(1, 'El día debe ser al menos 1')
    .max(maxDia, `El día no puede ser mayor a ${maxDia}`),
  titulo: z.string()
    .min(3, 'Mínimo 3 caracteres')
    .max(100, 'Máximo 100 caracteres'),
  descripcion: z.string()
    .min(10, 'Mínimo 10 caracteres')
    .max(500, 'Máximo 500 caracteres'),
  hora: z.string()
    .regex(/^([01]?\d|2[0-3]):[0-5]\d$/, 'Formato: HH:MM')
    .optional()
    .or(z.literal('')),
  ubicacion: z.string()
    .max(200, 'Máximo 200 caracteres')
    .optional()
    .or(z.literal('')),
});
```

**Campos:**

1. Día (UInput type="number", min="1", :max="maxDia")
2. Título (UInput)
3. Hora (UInput type="time") - Opcional
4. Ubicación (UInput) - Opcional
5. Descripción (UTextarea, rows="3")

---

## 2. GESTIÓN DE SERVICIOS

### 2.1 Componente: Lista de Servicios

**Archivo:** `/home/valac/Documents/Projects/Valac/viajeros-ligeros-bun/app/components/travel-service-list.vue`

**Propósito:** Componente para gestionar servicios incluidos/no incluidos en el viaje.

**Props:**

- `modelValue: TravelService[]` - Array de servicios (v-model)

**Emits:**

- `update:modelValue: [services: TravelService[]]`

**Características:**

- Lista de servicios con checkbox para marcar como incluido
- Botón "Agregar Servicio"
- Template de servicios comunes predefinidos (vuelos, hotel, guía, etc.)
- Cada servicio muestra: Nombre, Descripción (opcional), Estado (incluido/no incluido)
- Acciones por servicio: Editar, Eliminar

**Campos por Servicio:**

```typescript
type TravelService = {
  id: string; // UUID generado automáticamente
  nombre: string; // "Vuelos ida y vuelta"
  descripcion?: string; // "Incluye equipaje de 23kg" (opcional)
  incluido: boolean; // true/false
};
```

**UI Layout:**

```
┌─────────────────────────────────────────────────────┐
│  Servicios del Viaje                      [+ Agregar]│
│                                                       │
│  Servicios Comunes:                                  │
│  [+ Vuelos] [+ Hotel] [+ Guía] [+ Transporte]        │
│                                                       │
├─────────────────────────────────────────────────────┤
│                                                       │
│  ✅ Vuelos ida y vuelta                     [✏️] [🗑️] │
│     Incluye equipaje de 23kg                         │
│                                                       │
│  ✅ Hotel 4 estrellas                       [✏️] [🗑️] │
│     Desayuno incluido                                │
│                                                       │
│  ❌ Seguro de viaje                         [✏️] [🗑️] │
│     No incluido en el paquete                        │
│                                                       │
└─────────────────────────────────────────────────────┘
```

**Servicios Predefinidos (Templates):**

```typescript
const COMMON_SERVICES = [
  { nombre: 'Vuelos ida y vuelta', descripcion: '' },
  { nombre: 'Hotel', descripcion: '' },
  { nombre: 'Guía turístico', descripcion: '' },
  { nombre: 'Transporte local', descripcion: '' },
  { nombre: 'Desayuno', descripcion: '' },
  { nombre: 'Seguro de viaje', descripcion: '' },
  { nombre: 'Visas y permisos', descripcion: '' },
  { nombre: 'Actividades recreativas', descripcion: '' },
];
```

**Funcionalidades:**

- Click en servicio común: agrega servicio con `incluido: true`
- Toggle checkbox: cambia estado incluido/no incluido
- Editar: abre mini-formulario
- Eliminar: remueve del array

### 2.2 Componente: Formulario de Servicio

**Archivo:** `/home/valac/Documents/Projects/Valac/viajeros-ligeros-bun/app/components/travel-service-form.vue`

**Propósito:** Mini-formulario para agregar/editar un servicio.

**Props:**

- `service?: TravelService | null` - Servicio a editar (null si es nuevo)

**Emits:**

- `submit: [service: Omit<TravelService, 'id'>]`
- `cancel: []`

**Schema Zod:**

```typescript
z.object({
  nombre: z.string()
    .min(3, 'Mínimo 3 caracteres')
    .max(100, 'Máximo 100 caracteres'),
  descripcion: z.string()
    .max(300, 'Máximo 300 caracteres')
    .optional()
    .or(z.literal('')),
  incluido: z.boolean(),
});
```

**Campos:**

1. Nombre (UInput)
2. Descripción (UTextarea, rows="2") - Opcional
3. Incluido (UCheckbox) - "Este servicio está incluido en el paquete"

---

## 3. INTEGRACIÓN CON FORMULARIO DE VIAJE

### 3.1 Modificar: travel-form.vue

**Archivo:** `/home/valac/Documents/Projects/Valac/viajeros-ligeros-bun/app/components/travel-form.vue`

**Cambios necesarios:**

1. Agregar secciones expandibles para itinerario y servicios
2. Usar componentes `TravelActivityList` y `TravelServiceList`
3. Validar que los datos se emitan correctamente en el submit

**Estructura de Secciones:**

```vue
<script setup lang="ts">
// Agregar campos al estado
const state = ref<Schema>({
  // ... campos existentes
  itinerario: travel?.itinerario || [],
  servicios: travel?.servicios || [],
});

// El schema NO valida itinerario/servicios (validación interna de componentes)
</script>

<template>
  <UForm
    :schema="schema"
    :state="state"
    @submit="onSubmit"
  >
    <!-- Campos básicos existentes: destino, cliente, fechas, precio, etc. -->

    <!-- NUEVA SECCIÓN: Itinerario -->
    <UDivider label="Itinerario" />
    <TravelActivityList
      v-model="state.itinerario"
      :fecha-inicio="state.fechaInicio"
      :fecha-fin="state.fechaFin"
    />

    <!-- NUEVA SECCIÓN: Servicios -->
    <UDivider label="Servicios Incluidos" />
    <TravelServiceList
      v-model="state.servicios"
    />

    <!-- Botones de acción -->
    <div class="flex justify-end gap-3 pt-4">
      <UButton
        type="button"
        color="neutral"
        variant="outline"
        @click="onCancel"
      >
        Cancelar
      </UButton>
      <UButton
        type="submit"
        color="primary"
        :loading="isSubmitting"
      >
        {{ travel ? 'Actualizar' : 'Crear' }} Viaje
      </UButton>
    </div>
  </UForm>
</template>
```

---

## 4. VISUALIZACIÓN EN DASHBOARD

### 4.1 Modificar: travels/dashboard.vue

**Cambios opcionales en la tabla:**

Agregar columna de "Itinerario" que muestre cantidad de actividades:

```typescript
{
  accessorKey: 'itinerario',
  header: 'Actividades',
  cell: ({ row }) => {
    const count = row.getValue('itinerario')?.length || 0;
    return h('span', { class: 'text-muted' },
      count > 0 ? `${count} actividades` : 'Sin itinerario'
    );
  },
}
```

Agregar columna de "Servicios":

```typescript
{
  accessorKey: 'servicios',
  header: 'Servicios',
  cell: ({ row }) => {
    const services = row.getValue('servicios') || [];
    const included = services.filter(s => s.incluido).length;
    return h('span', { class: 'text-muted' },
      `${included}/${services.length} incluidos`
    );
  },
}
```

---

## 5. FLUJO DE IMPLEMENTACIÓN

### Fase 1: Componentes de Actividades

1. ✅ Crear `TravelActivityForm.vue` - Formulario individual de actividad
2. ✅ Crear `TravelActivityList.vue` - Lista y gestión de actividades
3. ✅ Integrar en `TravelForm.vue` - Agregar sección de itinerario
4. ✅ Probar creación/edición de viajes con itinerario

### Fase 2: Componentes de Servicios

1. ✅ Crear `TravelServiceForm.vue` - Formulario individual de servicio
2. ✅ Crear `TravelServiceList.vue` - Lista y gestión de servicios
3. ✅ Integrar en `TravelForm.vue` - Agregar sección de servicios
4. ✅ Implementar servicios predefinidos
5. ✅ Probar creación/edición de viajes con servicios

### Fase 3: Mejoras UI

1. ✅ Agregar columnas opcionales en dashboard para itinerario/servicios
2. ✅ Mejorar UX con animaciones de transición
3. ✅ Validar persistencia en localStorage
4. ✅ Agregar toasts de feedback
5. ✅ Verificar typecheck y lint

### Fase 4: Testing

1. ✅ Probar CRUD completo de actividades
2. ✅ Probar CRUD completo de servicios
3. ✅ Validar límites de días en itinerario
4. ✅ Verificar que los datos persisten correctamente
5. ✅ Probar edición de viajes existentes con mock data

---

## 6. ARCHIVOS A CREAR

```
app/
├── components/
│   ├── travel-activity-list.vue       # ✅ Lista de actividades
│   ├── travel-activity-form.vue       # ✅ Formulario de actividad
│   ├── travel-service-list.vue        # ✅ Lista de servicios
│   └── travel-service-form.vue        # ✅ Formulario de servicio
```

## 7. ARCHIVOS A MODIFICAR

```
app/
├── components/
│   └── travel-form.vue                # Agregar secciones de itinerario y servicios
└── pages/
    └── travels/
        └── dashboard.vue              # (Opcional) Agregar columnas de itinerario/servicios
```

---

## 8. VALIDACIONES

### Actividades del Itinerario:

- ✅ Día debe estar entre 1 y duración del viaje
- ✅ Título: mínimo 3 caracteres, máximo 100
- ✅ Descripción: mínimo 10 caracteres, máximo 500
- ✅ Hora: formato HH:MM (opcional)
- ✅ Ubicación: máximo 200 caracteres (opcional)
- ✅ No permitir días duplicados (warning, no bloqueante)

### Servicios:

- ✅ Nombre: mínimo 3 caracteres, máximo 100
- ✅ Descripción: máximo 300 caracteres (opcional)
- ✅ Estado incluido/no incluido (boolean)

---

## 9. UX CONSIDERATIONS

### Itinerario:

- Mostrar días ordenados automáticamente
- Sugerir hora basada en actividad anterior (+2 horas)
- Íconos por tipo de actividad (comida, transporte, visita, etc.) - Fase futura
- Drag & drop para reordenar - Fase futura

### Servicios:

- Botones quick-add para servicios comunes
- Toggle rápido de incluido/no incluido con checkbox
- Agrupación por categorías (transporte, alojamiento, extras) - Fase futura
- Indicador visual de servicios incluidos vs no incluidos

### General:

- Usar `UAccordion` o `UCollapsible` para secciones expandibles
- Toasts al agregar/editar/eliminar
- Confirmación antes de eliminar
- Loading states en botones
- Animaciones suaves de entrada/salida

---

## 10. RESULTADO ESPERADO

Sistema funcional que permite:

- ✅ Agregar actividades al itinerario con día, título, hora, ubicación, descripción
- ✅ Editar actividades existentes
- ✅ Eliminar actividades con confirmación
- ✅ Validar que días estén dentro del rango del viaje
- ✅ Ver itinerario ordenado por día
- ✅ Agregar servicios incluidos/no incluidos
- ✅ Editar servicios existentes
- ✅ Eliminar servicios con confirmación
- ✅ Quick-add de servicios comunes
- ✅ Toggle de estado incluido/no incluido
- ✅ Persistencia completa en localStorage
- ✅ Integración perfecta con formulario de viaje existente
- ✅ Responsive y accesible

---

## 11. ESTADO DE IMPLEMENTACIÓN

### ✅ IMPLEMENTACIÓN COMPLETADA

**Completado:**

- ✅ Crear componentes de actividades (TravelActivityForm, TravelActivityList)
- ✅ Crear componentes de servicios (TravelServiceForm, TravelServiceList)
- ✅ Integrar con formulario de viaje
- ✅ TypeScript typecheck sin errores
- ✅ ESLint sin errores
- ✅ **MEJORA ADICIONAL**: Formulario de viaje separado en páginas independientes

### Páginas Creadas

1. **`/app/pages/travels/new.vue`** - Página para crear nuevos viajes
2. **`/app/pages/travels/[id]/edit.vue`** - Página para editar viajes existentes

### Razón del Cambio

El modal se volvió muy largo con las secciones de itinerario y servicios. Se decidió separar el formulario en páginas dedicadas para mejorar la UX:

- ✅ Más espacio para trabajar con itinerarios y servicios
- ✅ URL específica para compartir/guardar (ej: `/travels/abc123/edit`)
- ✅ Mejor navegación con botón "Volver"
- ✅ Scroll independiente de la página del dashboard
- ✅ Layout más limpio y profesional

---

## Notas Finales

- Esta feature completa los campos del modelo `Travel` que estaban sin UI
- Después de esta feature, el sistema podrá gestionar viajes con itinerarios y servicios completos
- La siguiente feature será "Vista de Detalles del Viaje" para visualizar toda la información
- No se modifica el store de Pinia (ya soporta estos campos)
- No se modifican los tipos TypeScript (ya están definidos)
