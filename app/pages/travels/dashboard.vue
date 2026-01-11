<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';

import { h } from 'vue';

import type { Travel, TravelStatus } from '~/types/travel';

definePageMeta({
  name: 'travels-dashboard',
});

// Store
const travelsStore = useTravelsStore();
const toast = useToast();
const router = useRouter();

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
  return date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MEX',
  }).format(amount);
}

function formatDateRange(start: string, end: string): string {
  return `${formatDate(start)} - ${formatDate(end)}`;
}

// Navegación
function navigateToCreate() {
  router.push('/travels/new');
}

function navigateToEdit(travelId: string) {
  router.push(`/travels/${travelId}/edit`);
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
        onSelect: () => router.push(`/travels/${travel.id}`),
      },
      {
        label: 'Editar',
        icon: 'i-lucide-pencil',
        onSelect: () => navigateToEdit(travel.id),
      },
    ],
    [
      {
        label: 'Eliminar',
        icon: 'i-lucide-trash-2',
        onSelect: () => handleDelete(travel),
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
      return h(resolveComponent('UDropdownMenu'), {
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
      <UButton
        icon="i-lucide-plus"
        size="lg"
        @click="navigateToCreate"
      >
        Nuevo Viaje
      </UButton>
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
          @click="navigateToCreate"
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
