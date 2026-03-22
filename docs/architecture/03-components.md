# 3. Componentes

## 3.1 Tabla de Viajes (Dashboard Principal)

**Archivo**: `app/pages/travels/dashboard.vue`

**Propósito**: Vista principal con tabla UTable mostrando todos los viajes.

**Características**:
- Tabla con columnas: ID, Destino, Cliente, Fechas, Estado (badge), Precio, Acciones
- Filtro por estado y búsqueda por cliente/destino
- Botón "Nuevo Viaje" que abre modal
- Acciones por fila: Ver, Editar, Eliminar
- Indicadores de estado con colores (UBadge)
- Estadísticas en header (total viajes, ingresos)

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
  navigateTo(`/travels/${travel.id}`);
}

async function deleteTravel(travel: Travel) {
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
          <div class="text-sm text-muted">Total</div>
          <div class="text-2xl font-bold">{{ travelsStore.stats.total }}</div>
        </div>
        <div class="p-3 bg-elevated rounded-lg">
          <div class="text-sm text-muted">Confirmados</div>
          <div class="text-2xl font-bold">{{ travelsStore.stats.confirmados }}</div>
        </div>
        <div class="p-3 bg-elevated rounded-lg">
          <div class="text-sm text-muted">En Curso</div>
          <div class="text-2xl font-bold">{{ travelsStore.stats.enCurso }}</div>
        </div>
        <div class="p-3 bg-elevated rounded-lg">
          <div class="text-sm text-muted">Ingresos</div>
          <div class="text-2xl font-bold">{{ formatCurrency(travelsStore.totalRevenue) }}</div>
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

## 3.2 Formulario de Viaje

**Archivo**: `app/components/travel-form.vue`

**Propósito**: Formulario completo para crear/editar viajes con validación.

**Características**:
- Usa UForm con validación (Zod)
- Campos: destino, fechas, precio, descripción, imagen URL, estado, cliente
- Secciones expandibles para itinerario y servicios
- Validaciones: campos requeridos, fechas válidas, precio > 0
- Botones: Cancelar, Guardar

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
    <UFormField label="Destino" name="destino" required>
      <UInput v-model="state.destino" placeholder="París, Francia" />
    </UFormField>

    <UFormField label="Cliente" name="cliente" required>
      <UInput v-model="state.cliente" placeholder="Nombre del cliente" />
    </UFormField>

    <div class="grid grid-cols-2 gap-4">
      <UFormField label="Fecha Inicio" name="fechaInicio" required>
        <UInput v-model="state.fechaInicio" type="date" />
      </UFormField>

      <UFormField label="Fecha Fin" name="fechaFin" required>
        <UInput v-model="state.fechaFin" type="date" />
      </UFormField>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <UFormField label="Precio (EUR)" name="precio" required>
        <UInput v-model.number="state.precio" type="number" min="0" step="0.01" />
      </UFormField>

      <UFormField label="Estado" name="estado" required>
        <USelect v-model="state.estado" :items="estadoOptions" />
      </UFormField>
    </div>

    <UFormField label="Descripción" name="descripcion" required>
      <UTextarea v-model="state.descripcion" :rows="3" />
    </UFormField>

    <UFormField label="URL de Imagen" name="imagenUrl">
      <UInput v-model="state.imagenUrl" placeholder="https://..." />
    </UFormField>

    <UFormField label="Notas Internas" name="notasInternas">
      <UTextarea v-model="state.notasInternas" :rows="2" />
    </UFormField>

    <div class="flex gap-2 justify-end pt-4">
      <UButton label="Cancelar" color="neutral" variant="outline" @click="emit('cancel')" />
      <UButton type="submit" label="Guardar" />
    </div>
  </UForm>
</template>
```

---

## 3.3 Card de Estadísticas (Opcional)

**Archivo**: `app/components/travel-stat-card.vue`

**Propósito**: Componente reutilizable para mostrar estadísticas.

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
        <div class="text-sm text-muted">{{ label }}</div>
        <div class="text-2xl font-bold">{{ value }}</div>
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

[← Pinia Store](./02-store.md) | [Volver al índice](./README.md) | [Siguiente: Flujo de Datos →](./04-data-flow.md)
