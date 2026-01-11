# Plan de Arquitectura: Sistema de Gestión de Viajes

## Contexto Analizado

- **Framework**: Nuxt 4 + Vue 3 + Pinia + Nuxt UI
- **Convenciones**: Kebab-case para archivos, `type` en vez de `interface`, 2 espacios, semicolons, single quotes
- **Estado actual**: Solo existe `/app/pages/travels/dashboard.vue` vacío
- **Layout**: Dashboard con `UDashboardGroup`, `TheSidebar`, `UDashboardPanel`
- **No existe**: Stores Pinia, tipos TypeScript, formularios, composables personalizados

---

## 1. ESTRUCTURA DE TIPOS TYPESCRIPT

### Archivo: `/home/valac/Documents/Projects/Valac/viajeros-ligeros-bun/app/types/travel.ts`

**Razón**: Centralizar todas las definiciones de tipos relacionadas con viajes siguiendo convenciones del proyecto.

```typescript
// Estado de un viaje (enum como union type)
export type TravelStatus = 'pendiente' | 'confirmado' | 'en-curso' | 'completado' | 'cancelado';

// Actividad del itinerario
export type TravelActivity = {
  id: string;
  dia: number;
  titulo: string;
  descripcion: string;
  hora?: string;
  ubicacion?: string;
};

// Servicio incluido
export type TravelService = {
  id: string;
  nombre: string;
  descripcion?: string;
  incluido: boolean;
};

// Modelo principal de viaje
export type Travel = {
  id: string;
  destino: string;
  fechaInicio: string; // ISO date string para facilitar serialización
  fechaFin: string;
  precio: number;
  descripcion: string;
  imagenUrl?: string;
  estado: TravelStatus;
  cliente: string;
  itinerario: TravelActivity[];
  servicios: TravelService[];
  notasInternas?: string;
  createdAt: string;
  updatedAt: string;
};

// Tipo para formulario (campos opcionales durante creación)
export type TravelFormData = Omit<Travel, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
};

// Tipo para filtros de tabla
export type TravelFilters = {
  estado?: TravelStatus;
  cliente?: string;
  fechaDesde?: string;
  fechaHasta?: string;
};
```

---

## 2. PINIA STORE

### Archivo: `/home/valac/Documents/Projects/Valac/viajeros-ligeros-bun/app/stores/travels.ts`

**Razón**: Store central para gestión de estado de viajes con persistencia en localStorage.

```typescript
import { defineStore } from 'pinia';

import type { Travel, TravelFormData, TravelStatus } from '~/types/travel';

export const useTravelsStore = defineStore('travels', {
  state: () => ({
    travels: [] as Travel[],
    loading: false,
    error: null as string | null,
  }),

  getters: {
    // Obtener todos los viajes ordenados por fecha de creación (más recientes primero)
    allTravels: (state) => {
      return [...state.travels].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    },

    // Obtener viaje por ID
    getTravelById: (state) => {
      return (id: string) => state.travels.find(t => t.id === id);
    },

    // Filtrar por estado
    getTravelsByStatus: (state) => {
      return (status: TravelStatus) => state.travels.filter(t => t.estado === status);
    },

    // Estadísticas básicas
    stats: state => ({
      total: state.travels.length,
      pendientes: state.travels.filter(t => t.estado === 'pendiente').length,
      confirmados: state.travels.filter(t => t.estado === 'confirmado').length,
      enCurso: state.travels.filter(t => t.estado === 'en-curso').length,
      completados: state.travels.filter(t => t.estado === 'completado').length,
      cancelados: state.travels.filter(t => t.estado === 'cancelado').length,
    }),

    // Ingresos totales (solo viajes pagados/completados)
    totalRevenue: (state) => {
      return state.travels
        .filter(t => t.estado === 'completado' || t.estado === 'confirmado')
        .reduce((sum, t) => sum + t.precio, 0);
    },
  },

  actions: {
    // Crear nuevo viaje
    addTravel(data: TravelFormData) {
      const now = new Date().toISOString();
      const newTravel: Travel = {
        ...data,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      };
      this.travels.push(newTravel);
      return newTravel;
    },

    // Actualizar viaje existente
    updateTravel(id: string, data: Partial<TravelFormData>) {
      const index = this.travels.findIndex(t => t.id === id);
      if (index !== -1) {
        this.travels[index] = {
          ...this.travels[index],
          ...data,
          updatedAt: new Date().toISOString(),
        };
        return this.travels[index];
      }
      return null;
    },

    // Eliminar viaje
    deleteTravel(id: string) {
      const index = this.travels.findIndex(t => t.id === id);
      if (index !== -1) {
        this.travels.splice(index, 1);
        return true;
      }
      return false;
    },

    // Cambiar estado de viaje
    updateTravelStatus(id: string, status: TravelStatus) {
      return this.updateTravel(id, { estado: status });
    },

    // Cargar datos de ejemplo (útil para desarrollo/demo)
    loadMockData() {
      // Solo cargar si no hay datos
      if (this.travels.length === 0) {
        const mockTravels: Travel[] = [
          {
            id: crypto.randomUUID(),
            destino: 'París, Francia',
            fechaInicio: '2025-04-15',
            fechaFin: '2025-04-22',
            precio: 1500,
            descripcion: 'Tour completo por París incluyendo Torre Eiffel, Louvre y Versalles',
            imagenUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34',
            estado: 'confirmado',
            cliente: 'María García',
            itinerario: [
              { id: '1', dia: 1, titulo: 'Llegada', descripcion: 'Check-in hotel', hora: '14:00' },
              { id: '2', dia: 2, titulo: 'Torre Eiffel', descripcion: 'Visita guiada', hora: '10:00' },
            ],
            servicios: [
              { id: '1', nombre: 'Vuelos ida y vuelta', incluido: true },
              { id: '2', nombre: 'Hotel 4 estrellas', incluido: true },
              { id: '3', nombre: 'Guía turístico', incluido: true },
            ],
            notasInternas: 'Cliente VIP, requiere habitación con vista',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: crypto.randomUUID(),
            destino: 'Barcelona, España',
            fechaInicio: '2025-05-10',
            fechaFin: '2025-05-17',
            precio: 1200,
            descripcion: 'Experiencia gastronómica y cultural en Barcelona',
            imagenUrl: 'https://images.unsplash.com/photo-1583422409516-2895a77efded',
            estado: 'pendiente',
            cliente: 'Juan Pérez',
            itinerario: [],
            servicios: [
              { id: '1', nombre: 'Vuelos', incluido: true },
              { id: '2', nombre: 'Hotel boutique', incluido: true },
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];
        this.travels = mockTravels;
      }
    },
  },

  // Persistencia en localStorage
  persist: {
    key: 'viajeros-ligeros-travels',
    storage: typeof window !== 'undefined' ? localStorage : undefined,
  },
});
```

---

## 3. COMPONENTES NECESARIOS

### 3.1 Componente: Tabla de Viajes (Dashboard Principal)

**Archivo**: `/home/valac/Documents/Projects/Valac/viajeros-ligeros-bun/app/pages/travels/dashboard.vue`

**Propósito**: Vista principal con tabla UTable mostrando todos los viajes.

**Características**:

- Tabla con columnas: ID, Destino, Cliente, Fechas, Estado (badge), Precio, Acciones
- Filtro por estado y búsqueda por cliente/destino
- Botón "Nuevo Viaje" que abre modal
- Acciones por fila: Ver, Editar, Eliminar
- Indicadores de estado con colores (UBadge)
- Estadísticas en header (total viajes, ingresos)

**Estructura aproximada**:

```vue
<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';

import { h } from 'vue';

import type { Travel, TravelStatus } from '~/types/travel';

const travelsStore = useTravelsStore();
const toast = useToast();

// Cargar datos mock en desarrollo (solo primera vez)
onMounted(() => {
  travelsStore.loadMockData();
});

// Estado para modal de formulario
const isFormModalOpen = ref(false);
const editingTravel = ref<Travel | null>(null);

// Columnas de la tabla
const columns: TableColumn<Travel>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }) => `#${row.getValue('id').substring(0, 8)}`,
  },
  {
    accessorKey: 'destino',
    header: 'Destino',
  },
  {
    accessorKey: 'cliente',
    header: 'Cliente',
  },
  {
    accessorKey: 'fechaInicio',
    header: 'Fechas',
    cell: ({ row }) => `${formatDate(row.getValue('fechaInicio'))} - ${formatDate(row.original.fechaFin)}`,
  },
  {
    accessorKey: 'estado',
    header: 'Estado',
    cell: ({ row }) => h(UBadge, {
      color: getStatusColor(row.getValue('estado')),
      variant: 'subtle',
    }, () => row.getValue('estado')),
  },
  {
    accessorKey: 'precio',
    header: 'Precio',
    cell: ({ row }) => formatCurrency(row.getValue('precio')),
  },
  {
    id: 'actions',
    cell: ({ row }) => h(UDropdownMenu, {
      items: getRowActions(row.original),
    }, () => h(UButton, {
      icon: 'i-lucide-more-vertical',
      variant: 'ghost',
      color: 'neutral',
    })),
  },
];

// Funciones auxiliares
function getStatusColor(status: TravelStatus) {
  const colors = {
    'pendiente': 'warning',
    'confirmado': 'info',
    'en-curso': 'primary',
    'completado': 'success',
    'cancelado': 'error',
  };
  return colors[status] || 'neutral';
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

function getRowActions(travel: Travel) {
  return [
    {
      label: 'Ver detalles',
      icon: 'i-lucide-eye',
      onSelect: () => viewTravel(travel),
    },
    {
      label: 'Editar',
      icon: 'i-lucide-pencil',
      onSelect: () => editTravel(travel),
    },
    { type: 'separator' },
    {
      label: 'Eliminar',
      icon: 'i-lucide-trash-2',
      color: 'error',
      onSelect: () => deleteTravel(travel),
    },
  ];
}

function openCreateModal() {
  editingTravel.value = null;
  isFormModalOpen.value = true;
}

function editTravel(travel: Travel) {
  editingTravel.value = travel;
  isFormModalOpen.value = true;
}

function viewTravel(travel: Travel) {
  // TODO: Navegar a página de detalles o abrir modal
  navigateTo(`/travels/${travel.id}`);
}

async function deleteTravel(travel: Travel) {
  // Aquí se podría usar un modal de confirmación
  const confirmed = confirm(`¿Eliminar viaje a ${travel.destino}?`);
  if (confirmed) {
    travelsStore.deleteTravel(travel.id);
    toast.add({
      title: 'Viaje eliminado',
      color: 'success',
    });
  }
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header con estadísticas y botón nuevo -->
    <div class="p-4 border-b border-default">
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-bold">
          Gestión de Viajes
        </h1>
        <UButton
          icon="i-lucide-plus"
          label="Nuevo Viaje"
          @click="openCreateModal"
        />
      </div>

      <!-- Stats cards -->
      <div class="grid grid-cols-4 gap-4">
        <div class="p-3 bg-elevated rounded-lg">
          <div class="text-sm text-muted">
            Total
          </div>
          <div class="text-2xl font-bold">
            {{ travelsStore.stats.total }}
          </div>
        </div>
        <div class="p-3 bg-elevated rounded-lg">
          <div class="text-sm text-muted">
            Confirmados
          </div>
          <div class="text-2xl font-bold">
            {{ travelsStore.stats.confirmados }}
          </div>
        </div>
        <div class="p-3 bg-elevated rounded-lg">
          <div class="text-sm text-muted">
            En Curso
          </div>
          <div class="text-2xl font-bold">
            {{ travelsStore.stats.enCurso }}
          </div>
        </div>
        <div class="p-3 bg-elevated rounded-lg">
          <div class="text-sm text-muted">
            Ingresos
          </div>
          <div class="text-2xl font-bold">
            {{ formatCurrency(travelsStore.totalRevenue) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Tabla -->
    <div class="flex-1 overflow-hidden">
      <UTable
        :data="travelsStore.allTravels"
        :columns="columns"
        sticky
        class="h-full"
      />
    </div>

    <!-- Modal de formulario -->
    <UModal v-model:open="isFormModalOpen" :title="editingTravel ? 'Editar Viaje' : 'Nuevo Viaje'">
      <TravelForm
        :travel="editingTravel"
        @submit="handleFormSubmit"
        @cancel="isFormModalOpen = false"
      />
    </UModal>
  </div>
</template>
```

---

### 3.2 Componente: Formulario de Viaje

**Archivo**: `/home/valac/Documents/Projects/Valac/viajeros-ligeros-bun/app/components/travel-form.vue`

**Propósito**: Formulario completo para crear/editar viajes con validación.

**Características**:

- Usa UForm con validación (Zod o Valibot)
- Campos: destino, fechas, precio, descripción, imagen URL, estado, cliente
- Secciones expandibles para itinerario y servicios
- Validaciones: campos requeridos, fechas válidas, precio > 0
- Botones: Cancelar, Guardar

**Estructura aproximada**:

```vue
<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui';

import { z } from 'zod';

import type { Travel, TravelFormData } from '~/types/travel';

const props = defineProps<{
  travel?: Travel | null;
}>();

const emit = defineEmits<{
  submit: [data: TravelFormData];
  cancel: [];
}>();

// Schema de validación
const schema = z.object({
  destino: z.string().min(3, 'Mínimo 3 caracteres'),
  fechaInicio: z.string().min(1, 'Fecha requerida'),
  fechaFin: z.string().min(1, 'Fecha requerida'),
  precio: z.number().min(0, 'Precio debe ser positivo'),
  descripcion: z.string().min(10, 'Mínimo 10 caracteres'),
  imagenUrl: z.string().url('URL inválida').optional().or(z.literal('')),
  estado: z.enum(['pendiente', 'confirmado', 'en-curso', 'completado', 'cancelado']),
  cliente: z.string().min(3, 'Mínimo 3 caracteres'),
  notasInternas: z.string().optional(),
});

type Schema = z.output<typeof schema>;

// Estado inicial del formulario
const state = reactive<Partial<Schema>>({
  destino: props.travel?.destino || '',
  fechaInicio: props.travel?.fechaInicio || '',
  fechaFin: props.travel?.fechaFin || '',
  precio: props.travel?.precio || 0,
  descripcion: props.travel?.descripcion || '',
  imagenUrl: props.travel?.imagenUrl || '',
  estado: props.travel?.estado || 'pendiente',
  cliente: props.travel?.cliente || '',
  notasInternas: props.travel?.notasInternas || '',
});

const estadoOptions = [
  { label: 'Pendiente', value: 'pendiente' },
  { label: 'Confirmado', value: 'confirmado' },
  { label: 'En Curso', value: 'en-curso' },
  { label: 'Completado', value: 'completado' },
  { label: 'Cancelado', value: 'cancelado' },
];

function onSubmit(event: FormSubmitEvent<Schema>) {
  const formData: TravelFormData = {
    ...event.data,
    id: props.travel?.id,
    itinerario: props.travel?.itinerario || [],
    servicios: props.travel?.servicios || [],
  };
  emit('submit', formData);
}
</script>

<template>
  <UForm
    :schema="schema"
    :state="state"
    class="space-y-4 p-4"
    @submit="onSubmit"
  >
    <UFormField
      label="Destino"
      name="destino"
      required
    >
      <UInput v-model="state.destino" placeholder="París, Francia" />
    </UFormField>

    <UFormField
      label="Cliente"
      name="cliente"
      required
    >
      <UInput v-model="state.cliente" placeholder="Nombre del cliente" />
    </UFormField>

    <div class="grid grid-cols-2 gap-4">
      <UFormField
        label="Fecha Inicio"
        name="fechaInicio"
        required
      >
        <UInput v-model="state.fechaInicio" type="date" />
      </UFormField>

      <UFormField
        label="Fecha Fin"
        name="fechaFin"
        required
      >
        <UInput v-model="state.fechaFin" type="date" />
      </UFormField>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <UFormField
        label="Precio (EUR)"
        name="precio"
        required
      >
        <UInput
          v-model.number="state.precio"
          type="number"
          min="0"
          step="0.01"
        />
      </UFormField>

      <UFormField
        label="Estado"
        name="estado"
        required
      >
        <USelect v-model="state.estado" :items="estadoOptions" />
      </UFormField>
    </div>

    <UFormField
      label="Descripción"
      name="descripcion"
      required
    >
      <UTextarea v-model="state.descripcion" :rows="3" />
    </UFormField>

    <UFormField label="URL de Imagen" name="imagenUrl">
      <UInput v-model="state.imagenUrl" placeholder="https://..." />
    </UFormField>

    <UFormField label="Notas Internas" name="notasInternas">
      <UTextarea v-model="state.notasInternas" :rows="2" />
    </UFormField>

    <div class="flex gap-2 justify-end pt-4">
      <UButton
        label="Cancelar"
        color="neutral"
        variant="outline"
        @click="emit('cancel')"
      />
      <UButton
        type="submit"
        label="Guardar"
      />
    </div>
  </UForm>
</template>
```

---

### 3.3 Componente Opcional: Card de Estadísticas

**Archivo**: `/home/valac/Documents/Projects/Valac/viajeros-ligeros-bun/app/components/travel-stat-card.vue`

**Propósito**: Componente reutilizable para mostrar estadísticas.

**Estructura simple**:

```vue
<script setup lang="ts">
defineProps<{
  label: string;
  value: string | number;
  icon?: string;
  color?: string;
}>();
</script>

<template>
  <div class="p-4 bg-elevated rounded-lg">
    <div class="flex items-center justify-between">
      <div>
        <div class="text-sm text-muted">
          {{ label }}
        </div>
        <div class="text-2xl font-bold">
          {{ value }}
        </div>
      </div>
      <UIcon
        v-if="icon"
        :name="icon"
        class="size-8"
        :class="`text-${color}`"
      />
    </div>
  </div>
</template>
```

---

## 4. FLUJO DE DATOS

### Arquitectura del flujo:

```
┌─────────────────────────────────────────────────────────────┐
│  COMPONENTE: travels/dashboard.vue                          │
│  - Muestra tabla de viajes                                  │
│  - Gestiona modales (crear/editar)                          │
│  - Lee datos del store                                      │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ usa travelsStore
                 │ llama actions
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  STORE: stores/travels.ts (Pinia)                           │
│  - Estado centralizado (travels[])                          │
│  - Getters (filtros, estadísticas)                          │
│  - Actions (CRUD operations)                                │
│  - Persistencia automática en localStorage                  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ persiste/recupera
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  LOCALSTORAGE: "viajeros-ligeros-travels"                   │
│  - Almacenamiento persistente del estado                    │
│  - Se sincroniza automáticamente con el store               │
└─────────────────────────────────────────────────────────────┘
```

### Flujo de operaciones CRUD:

**CREAR**:

1. Usuario hace clic en "Nuevo Viaje"
2. Se abre modal con `TravelForm` (props.travel = null)
3. Usuario completa formulario y submit
4. `TravelForm` emite evento `@submit` con datos
5. Dashboard llama `travelsStore.addTravel(data)`
6. Store genera ID, timestamps y agrega a array
7. Pinia persiste automáticamente en localStorage
8. Vista se actualiza reactivamente

**EDITAR**:

1. Usuario hace clic en "Editar" en dropdown de fila
2. Se abre modal con `TravelForm` (props.travel = travelObject)
3. Formulario se pre-rellena con datos existentes
4. Usuario modifica y submit
5. Dashboard llama `travelsStore.updateTravel(id, data)`
6. Store actualiza objeto y timestamp
7. Pinia persiste cambios
8. Vista se actualiza

**ELIMINAR**:

1. Usuario hace clic en "Eliminar"
2. Confirmación con dialog nativo
3. Dashboard llama `travelsStore.deleteTravel(id)`
4. Store elimina del array
5. Pinia persiste
6. Vista se actualiza

**LEER**:

1. Dashboard accede a `travelsStore.allTravels` (getter)
2. Getter devuelve array ordenado reactivamente
3. UTable recibe `:data="travelsStore.allTravels"`
4. Tabla se actualiza automáticamente en cambios

---

## 5. VALIDACIONES

### Validaciones de Formulario (Zod Schema):

```typescript
const schema = z.object({
  // Campos requeridos
  destino: z.string()
    .min(3, 'El destino debe tener al menos 3 caracteres')
    .max(100, 'Máximo 100 caracteres'),

  cliente: z.string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(100, 'Máximo 100 caracteres'),

  fechaInicio: z.string()
    .min(1, 'Fecha de inicio requerida'),

  fechaFin: z.string()
    .min(1, 'Fecha de fin requerida'),

  precio: z.number()
    .min(0, 'El precio debe ser mayor o igual a 0')
    .max(999999, 'Precio máximo: 999,999'),

  descripcion: z.string()
    .min(10, 'La descripción debe tener al menos 10 caracteres')
    .max(1000, 'Máximo 1000 caracteres'),

  estado: z.enum(['pendiente', 'confirmado', 'en-curso', 'completado', 'cancelado']),

  // Campos opcionales
  imagenUrl: z.string()
    .url('URL inválida')
    .optional()
    .or(z.literal('')),

  notasInternas: z.string()
    .max(500, 'Máximo 500 caracteres')
    .optional(),
})
  // Validación de fechas (fin debe ser después de inicio)
  .refine((data) => {
    if (data.fechaInicio && data.fechaFin) {
      return new Date(data.fechaFin) >= new Date(data.fechaInicio);
    }
    return true;
  }, {
    message: 'La fecha de fin debe ser posterior a la de inicio',
    path: ['fechaFin'],
  });
```

### Validaciones en Store:

```typescript
// En actions del store
addTravel(data: TravelFormData) {
  // Validación adicional de negocio
  if (data.itinerario.length > 0) {
    // Validar que días del itinerario estén en rango de fechas
    const dias = data.itinerario.map(a => a.dia);
    const duracion = calcularDias(data.fechaInicio, data.fechaFin);
    if (Math.max(...dias) > duracion) {
      throw new Error('Itinerario tiene días fuera del rango del viaje');
    }
  }

  // Crear viaje...
}
```

---

## 6. UX/UI - EXPERIENCIA DE USUARIO

### Componentes Nuxt UI a utilizar:

1. **UTable**: Tabla principal con:
   - Sticky header para tablas largas
   - Sorting en columnas (fecha, precio, estado)
   - Responsive design

2. **UModal**: Para formularios de crear/editar:
   - `title`: "Nuevo Viaje" / "Editar Viaje"
   - `description`: Opcional
   - Ancho: `max-w-2xl`
   - Scrollable si contenido es largo

3. **UForm**: Formulario con validación:
   - `validate-on="blur"`: Validar al perder foco
   - Error messages automáticos bajo cada campo
   - Submit deshabilitado si hay errores

4. **UInput**: Campos de texto
5. **UTextarea**: Descripción, notas
6. **USelect**: Estado del viaje
7. **UButton**: Acciones primarias y secundarias
8. **UBadge**: Estado del viaje con colores:
   - `pendiente`: warning (amarillo)
   - `confirmado`: info (azul)
   - `en-curso`: primary (principal)
   - `completado`: success (verde)
   - `cancelado`: error (rojo)

9. **UDropdownMenu**: Menú de acciones por fila
10. **UToast**: Notificaciones de éxito/error:
    - "Viaje creado exitosamente"
    - "Viaje actualizado"
    - "Viaje eliminado"
    - "Error al guardar"

### Feedback Visual:

```typescript
// Ejemplo de toast al crear
const toast = useToast();

function handleCreateSuccess() {
  toast.add({
    title: 'Viaje creado',
    description: 'El viaje se ha creado exitosamente',
    color: 'success',
    icon: 'i-lucide-check-circle',
  });
}

function handleError(error: Error) {
  toast.add({
    title: 'Error',
    description: error.message,
    color: 'error',
    icon: 'i-lucide-alert-circle',
  });
}
```

### Estados de Loading:

```vue
<UButton
  :loading="isSubmitting"
  :disabled="isSubmitting"
  label="Guardar"
  type="submit"
/>
```

### Confirmaciones:

```typescript
// Modal de confirmación para eliminar
const confirmModal = useModal();

async function deleteTravel(travel: Travel) {
  const confirmed = await confirmModal.open({
    title: '¿Eliminar viaje?',
    description: `Se eliminará el viaje a ${travel.destino}. Esta acción no se puede deshacer.`,
    confirmButton: { label: 'Eliminar', color: 'error' },
    cancelButton: { label: 'Cancelar' },
  });

  if (confirmed) {
    travelsStore.deleteTravel(travel.id);
  }
}
```

---

## 7. IMPLEMENTACIÓN PROGRESIVA

### Fase 1 - MVP (Funcionalidad Básica):

1. Crear tipos TypeScript (`/app/types/travel.ts`)
2. Crear store Pinia básico con CRUD (`/app/stores/travels.ts`)
3. Implementar tabla simple en dashboard (`/app/pages/travels/dashboard.vue`)
4. Formulario básico con campos principales (`/app/components/travel-form.vue`)
5. Persistencia en localStorage funcionando

**Resultado**: Sistema funcional para crear, listar, editar y eliminar viajes.

### Fase 2 - Mejoras UX:

1. Agregar validaciones completas con Zod
2. Implementar búsqueda y filtros en tabla
3. Agregar estadísticas en header
4. Mejorar feedback con toasts
5. Agregar confirmación de eliminación

### Fase 3 - Funcionalidades Avanzadas:

1. Implementar gestión de itinerario (agregar/editar/eliminar actividades)
2. Implementar gestión de servicios incluidos
3. Página de detalles de viaje (`/app/pages/travels/[id].vue`)
4. Exportar datos (PDF, CSV)
5. Filtros avanzados y ordenamiento

### Fase 4 - Optimizaciones:

1. Paginación en tabla si hay muchos viajes
2. Virtual scrolling para listas largas
3. Lazy loading de imágenes
4. Optimistic updates
5. Undo/Redo para operaciones

---

## 8. ESTRUCTURA COMPLETA DE ARCHIVOS

```
/home/valac/Documents/Projects/Valac/viajeros-ligeros-bun/
├── app/
│   ├── types/
│   │   └── travel.ts                    # Tipos TypeScript
│   ├── stores/
│   │   └── travels.ts                   # Pinia store con persistencia
│   ├── composables/
│   │   ├── use-travel-filters.ts        # (Opcional) Lógica de filtros
│   │   └── use-travel-validation.ts     # (Opcional) Validaciones custom
│   ├── components/
│   │   ├── travel-form.vue              # Formulario crear/editar
│   │   ├── travel-stat-card.vue         # (Opcional) Card de estadísticas
│   │   ├── travel-activity-list.vue     # (Fase 3) Lista de actividades
│   │   └── travel-service-list.vue      # (Fase 3) Lista de servicios
│   ├── pages/
│   │   └── travels/
│   │       ├── dashboard.vue            # Vista principal con tabla
│   │       └── [id].vue                 # (Fase 3) Vista de detalles
│   └── utils/
│       └── travel-helpers.ts            # (Opcional) Funciones auxiliares
```

---

## 9. DEPENDENCIAS ADICIONALES

### Instalar validación (Zod recomendado):

```bash
bun add zod
```

### O alternativa con Valibot (más ligero):

```bash
bun add valibot
```

### Opcional para manejo de fechas:

```bash
bun add date-fns
# o
bun add dayjs
```

---

## 10. CONSIDERACIONES TÉCNICAS

### TypeScript:

- Usar `type` en lugar de `interface` (convención del proyecto)
- Aprovechar inference de tipos donde sea posible
- Usar `satisfies` para validar tipos sin perder inference

### Vue 3 Composition API:

- Usar `<script setup lang="ts">` en todos los componentes
- Aprovechar `defineProps`, `defineEmits` con tipos
- Usar `ref`, `reactive`, `computed` según corresponda

### Pinia:

- Store modular, separar por dominio si crece
- Getters para lógica de filtrado y cálculos
- Actions async si se integra con API backend en futuro

### Performance:

- UTable maneja virtualización internamente
- Usar `v-memo` en listas grandes si es necesario
- Computed properties para datos derivados

### Accesibilidad:

- Labels en todos los inputs
- `aria-label` en botones de iconos
- Keyboard navigation funcional
- Anuncios de toast para screen readers

---

## NOTAS FINALES

- **No hay backend**: Todo el estado vive en Pinia + localStorage
- **Escalable**: Fácil migrar a API REST/GraphQL en futuro (solo cambiar actions del store)
- **Type-safe**: TypeScript en todo el stack
- **Convenciones**: Sigue estrictamente CLAUDE.md del proyecto
- **Mobile-friendly**: Nuxt UI es responsive por defecto
- **Desarrollo**: Usar `bun run dev` para testing continuo
