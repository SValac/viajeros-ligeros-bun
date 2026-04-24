<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';

import { h } from 'vue';

import type { Travel, TravelStatus } from '~/types/travel';

definePageMeta({
  name: 'travels-dashboard',
});

// Store
const travelsStore = useTravelsStore();
const cotizacionStore = useCotizacionStore();
const coordinatorStore = useCoordinatorStore();
const toast = useToast();
const router = useRouter();

// Computed
const travels = computed(() => travelsStore.allTravels);
const stats = computed(() => travelsStore.stats);
const revenue = computed(() => travelsStore.totalRevenue);

// Funciones auxiliares
function getStatusColor(status: TravelStatus): string {
  const colors: Record<TravelStatus, string> = {
    pending: 'amber',
    confirmed: 'blue',
    in_progress: 'purple',
    completed: 'green',
    cancelled: 'red',
  };
  return colors[status] || 'gray';
}

function getStatusLabel(status: TravelStatus): string {
  const labels: Record<TravelStatus, string> = {
    pending: 'Pendiente',
    confirmed: 'Confirmado',
    in_progress: 'En Curso',
    completed: 'Completado',
    cancelled: 'Cancelado',
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
    currency: 'MXN',
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

async function handleDelete(travel: Travel) {
  // eslint-disable-next-line no-alert
  if (confirm(`¿Estás seguro de eliminar el viaje a ${travel.destination}?`)) {
    const success = await travelsStore.deleteTravel(travel.id);
    if (success) {
      toast.add({
        title: 'Viaje eliminado',
        description: `${travel.destination} se eliminó correctamente`,
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
      {
        label: cotizacionStore.hasQuotation(travel.id) ? 'Ver cotización' : 'Crear cotización',
        icon: cotizacionStore.hasQuotation(travel.id) ? 'i-lucide-file-check' : 'i-lucide-file-plus',
        onSelect: () => router.push({ name: 'travel-cotizacion', params: { id: travel.id } }),
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
    accessorKey: 'destination',
    header: 'Destino',
    cell: ({ row }) =>
      h(resolveComponent('NuxtLink'), {
        to: `/travels/${row.original.id}`,
        class: 'flex items-center gap-2 hover:text-primary transition-colors group',
      }, () => [
        h('span', { class: 'i-lucide-map-pin w-4 h-4 text-muted group-hover:text-primary' }),
        h('span', { class: 'font-medium' }, row.getValue('destination')),
      ]),
  },
  {
    accessorKey: 'coordinatorIds',
    header: 'Coordinadores',
    cell: ({ row }) => {
      const ids = row.getValue('coordinatorIds') as string[];
      if (!ids || ids.length === 0)
        return h('span', { class: 'text-sm text-gray-400' }, 'Sin coordinador');
      const names = ids.map((id) => {
        const c = coordinatorStore.getCoordinatorById(id);
        return c ? c.name : '—';
      });
      return h('div', { class: 'flex items-center gap-2' }, [
        h('span', { class: 'i-lucide-user-star w-4 h-4 text-gray-400 shrink-0' }),
        h('span', { class: 'text-sm' }, names.join(', ')),
      ]);
    },
  },
  {
    accessorKey: 'startDate',
    header: 'Fechas',
    cell: ({ row }) => {
      const travel = row.original;
      return h('span', { class: 'text-sm text-gray-600 dark:text-gray-300' }, formatDateRange(travel.startDate, travel.endDate));
    },
  },
  {
    accessorKey: 'status',
    header: 'Estado',
    cell: ({ row }) => {
      const status = row.getValue('status') as TravelStatus;
      return h(resolveComponent('UBadge'), {
        color: getStatusColor(status),
        variant: 'subtle',
      }, () => getStatusLabel(status));
    },
  },
  {
    accessorKey: 'price',
    header: 'Precio',
    cell: ({ row }) => {
      return h('span', { class: 'font-semibold text-gray-900 dark:text-white' }, formatCurrency(row.getValue('price')));
    },
  },
  {
    id: 'cotizacion',
    header: 'Cotización',
    cell: ({ row }) => {
      const hasCot = cotizacionStore.hasQuotation(row.original.id);
      if (!hasCot)
        return h('span', { class: 'text-xs text-gray-400' }, '—');
      return h(resolveComponent('UBadge'), {
        color: 'success',
        variant: 'subtle',
        size: 'xs',
        icon: 'i-lucide-file-check',
      }, () => 'Con cotización');
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
              {{ stats.confirmed }}
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
              {{ stats.inProgress }}
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
