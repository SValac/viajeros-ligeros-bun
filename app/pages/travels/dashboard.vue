<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';

import { h } from 'vue';

import type { Travel, TravelFormData, TravelStatus } from '~/types/travel';

definePageMeta({
  name: 'travels-dashboard',
});

// Store
const travelsStore = useTravelsStore();
const toast = useToast();

// Estado local
const isFormModalOpen = ref(false);
const editingTravel = ref<Travel | null>(null);

// Computed
const travels = computed(() => travelsStore.allTravels);
const stats = computed(() => travelsStore.stats);
const revenue = computed(() => travelsStore.totalRevenue);

// Funciones auxiliares
function getStatusColor(status: TravelStatus): string {
  const colors: Record<TravelStatus, string> = {
    'pendiente': 'amber',
    'confirmado': 'blue',
    'en-curso': 'purple',
    'completado': 'green',
    'cancelado': 'red',
  };
  return colors[status] || 'gray';
}

function getStatusLabel(status: TravelStatus): string {
  const labels: Record<TravelStatus, string> = {
    'pendiente': 'Pendiente',
    'confirmado': 'Confirmado',
    'en-curso': 'En Curso',
    'completado': 'Completado',
    'cancelado': 'Cancelado',
  };
  return labels[status] || status;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

function formatDateRange(start: string, end: string): string {
  return `${formatDate(start)} - ${formatDate(end)}`;
}

// Acciones del formulario
function openCreateModal() {
  editingTravel.value = null;
  isFormModalOpen.value = true;
}

function openEditModal(travel: Travel) {
  editingTravel.value = travel;
  isFormModalOpen.value = true;
}

function closeModal() {
  isFormModalOpen.value = false;
  editingTravel.value = null;
}

function handleFormSubmit(data: TravelFormData) {
  try {
    if (editingTravel.value) {
      // Actualizar viaje existente
      const success = travelsStore.updateTravel(editingTravel.value.id, data);
      if (success) {
        toast.add({
          title: 'Viaje actualizado',
          description: `${data.destino} se actualizó correctamente`,
          color: 'primary',
        });
        closeModal();
      }
    }
    else {
      // Crear nuevo viaje
      travelsStore.addTravel(data);
      toast.add({
        title: 'Viaje creado',
        description: `${data.destino} se creó correctamente`,
        color: 'primary',
      });
      closeModal();
    }
  }
  catch {
    toast.add({
      title: 'Error',
      description: 'Ocurrió un error al guardar el viaje',
      color: 'error',
    });
  }
}

function handleDelete(travel: Travel) {
  // eslint-disable-next-line no-alert
  if (confirm(`¿Estás seguro de eliminar el viaje a ${travel.destino}?`)) {
    const success = travelsStore.deleteTravel(travel.id);
    if (success) {
      toast.add({
        title: 'Viaje eliminado',
        description: `${travel.destino} se eliminó correctamente`,
        color: 'warning',
      });
    }
  }
}

// Acciones de la fila
function getRowActions(travel: Travel) {
  return [
    [
      {
        label: 'Ver detalles',
        icon: 'i-lucide-eye',
        click: () => {
          toast.add({
            title: 'Próximamente',
            description: 'Vista de detalles en desarrollo',
            color: 'secondary',
          });
        },
      },
      {
        label: 'Editar',
        icon: 'i-lucide-pencil',
        click: () => openEditModal(travel),
      },
    ],
    [
      {
        label: 'Eliminar',
        icon: 'i-lucide-trash-2',
        click: () => handleDelete(travel),
      },
    ],
  ];
}

// Columnas de la tabla
const columns: TableColumn<Travel>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }) => {
      const id = (row.getValue('id') as string).slice(0, 12);
      return h('span', { class: 'text-xs font-mono text-gray-500' }, `${id}...`);
    },
  },
  {
    accessorKey: 'destino',
    header: 'Destino',
    cell: ({ row }) => {
      return h('div', { class: 'flex items-center gap-2' }, [
        h('span', { class: 'i-lucide-map-pin w-4 h-4 text-gray-400' }),
        h('span', { class: 'font-medium' }, row.getValue('destino')),
      ]);
    },
  },
  {
    accessorKey: 'cliente',
    header: 'Cliente',
    cell: ({ row }) => {
      return h('div', { class: 'flex items-center gap-2' }, [
        h('span', { class: 'i-lucide-user w-4 h-4 text-gray-400' }),
        h('span', {}, row.getValue('cliente')),
      ]);
    },
  },
  {
    accessorKey: 'fechas',
    header: 'Fechas',
    cell: ({ row }) => {
      const travel = row.original;
      return h('span', { class: 'text-sm text-gray-600 dark:text-gray-300' }, formatDateRange(travel.fechaInicio, travel.fechaFin));
    },
  },
  {
    accessorKey: 'estado',
    header: 'Estado',
    cell: ({ row }) => {
      const estado = row.getValue('estado') as TravelStatus;
      return h(resolveComponent('UBadge'), {
        color: getStatusColor(estado),
        variant: 'subtle',
      }, () => getStatusLabel(estado));
    },
  },
  {
    accessorKey: 'precio',
    header: 'Precio',
    cell: ({ row }) => {
      return h('span', { class: 'font-semibold text-gray-900 dark:text-white' }, formatCurrency(row.getValue('precio')));
    },
  },
  {
    id: 'actions',
    header: 'Acciones',
    cell: ({ row }) => {
      return h(resolveComponent('UDropdown'), {
        items: getRowActions(row.original),
        popper: { placement: 'bottom-end' },
      }, () => h(resolveComponent('UButton'), {
        color: 'neutral',
        variant: 'ghost',
        icon: 'i-lucide-more-vertical',
      }));
    },
  },
];

// Lifecycle
onMounted(() => {
  travelsStore.loadMockData();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          Gestión de Viajes
        </h1>
        <p class="text-gray-500 dark:text-gray-400 mt-1">
          Administra todos los viajes de la agencia
        </p>
      </div>
      <!-- Modal de formulario -->
      <UModal
        v-model="isFormModalOpen"
        class="sm:max-w-2xl"
      >
        <UButton
          icon="i-lucide-plus"
          size="lg"
          @click="openCreateModal"
        >
          Nuevo Viaje
        </UButton>
        <template #body>
          <UCard>
            <template #header>
              <h3 class="text-lg font-semibold">
                {{ editingTravel ? 'Editar Viaje' : 'Nuevo Viaje' }}
              </h3>
            </template>

            <TravelForm
              :travel="editingTravel"
              @submit="handleFormSubmit"
              @cancel="closeModal"
            />
          </UCard>
        </template>
      </UModal>
    </div>

    <!-- Estadísticas -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Total -->
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Total Viajes
            </p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {{ stats.total }}
            </p>
          </div>
          <UIcon
            name="i-lucide-globe"
            class="w-10 h-10 text-gray-400"
          />
        </div>
      </UCard>

      <!-- Confirmados -->
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Confirmados
            </p>
            <p class="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
              {{ stats.confirmado }}
            </p>
          </div>
          <UIcon
            name="i-lucide-check-circle"
            class="w-10 h-10 text-blue-400"
          />
        </div>
      </UCard>

      <!-- En Curso -->
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              En Curso
            </p>
            <p class="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
              {{ stats.enCurso }}
            </p>
          </div>
          <UIcon
            name="i-lucide-plane"
            class="w-10 h-10 text-purple-400"
          />
        </div>
      </UCard>

      <!-- Ingresos -->
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Ingresos Totales
            </p>
            <p class="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
              {{ formatCurrency(revenue) }}
            </p>
          </div>
          <UIcon
            name="i-lucide-dollar-sign"
            class="w-10 h-10 text-green-400"
          />
        </div>
      </UCard>
    </div>

    <!-- Tabla de viajes -->
    <UCard>
      <div v-if="travels.length === 0" class="text-center py-12">
        <UIcon
          name="i-lucide-inbox"
          class="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4"
        />
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No hay viajes aún
        </h3>
        <p class="text-gray-500 dark:text-gray-400 mb-4">
          Comienza creando tu primer viaje
        </p>
        <UButton
          icon="i-lucide-plus"
          @click="openCreateModal"
        >
          Crear Primer Viaje
        </UButton>
      </div>
      <UTable
        v-else
        :columns="columns"
        :data="travels"
      />
    </UCard>
  </div>
</template>
