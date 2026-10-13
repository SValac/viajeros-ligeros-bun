<script setup lang="ts">
import type { CheckboxGroupItem, TableColumn } from '@nuxt/ui';

import { h } from 'vue';

import type { TravelStatus, TravelSummary } from '~/types/travel';

import { useQueryLoadState } from '~/queries/load-state';
import { travelListQuery, travelStatsQuery } from '~/queries/travels';
import { parseDisplayDate } from '~/utils/format-date';
import { getTravelStatusLabel, TRAVEL_STATUSES } from '~/utils/travel-status';

const PAGE_SIZE = 20;
// Only active travels by default
const DASHBOARD_DEFAULT_STATUSES: TravelStatus[] = ['pending', 'published', 'in_progress'];

definePageMeta({
  name: 'travels-dashboard',
});

// Store
const travelsStore = useTravelsStore();
const coordinatorStore = useCoordinatorStore();
const toast = useToast();
const router = useRouter();

// Computed
const { data: stats } = useQuery(() => travelStatsQuery());

const page = shallowRef(1);
const statuses = ref<TravelStatus[]>([...DASHBOARD_DEFAULT_STATUSES]);

const statusItems: CheckboxGroupItem[] = TRAVEL_STATUSES.map(status => ({
  label: getTravelStatusLabel(status),
  value: status,
}));

// With another filter the current page may not exist
watch(statuses, () => {
  page.value = 1;
});

const travelsQuery = useQuery(() => ({
  ...travelListQuery({
    statuses: [...statuses.value].sort(),
    page: page.value,
    pageSize: PAGE_SIZE,
  }),
  placeholderData: previousList => previousList,
  enabled: statuses.value.length > 0,
}));
const { data, refetch } = travelsQuery;
const travelsLoad = useQueryLoadState(travelsQuery);

// Deleting the only travel on the last page removes that page: go to the last one that exists
watch(data, (list) => {
  if (list && list.items.length === 0 && page.value > 1) {
    page.value = Math.max(1, Math.ceil(list.total / PAGE_SIZE));
  }
});

const travels = computed(() => data.value?.items ?? []);

// Helper functions
function formatDate(dateString: string): string {
  // Date without time (`YYYY-MM-DD`): with `new Date()` it would show a day earlier in Mexico
  return parseDisplayDate(dateString).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateRange(start: string, end: string): string {
  return `${formatDate(start)} - ${formatDate(end)}`;
}

function resetStatuses() {
  statuses.value = [...DASHBOARD_DEFAULT_STATUSES];
}

// Navigation
function navigateToCreate() {
  router.push('/travels/new');
}

function navigateToEdit(travelId: string) {
  router.push(`/travels/${travelId}/edit`);
}

async function handleDelete(travel: TravelSummary) {
  // eslint-disable-next-line no-alert
  if (confirm(`¿Estás seguro de eliminar el viaje ${travel.label}?`)) {
    const success = await travelsStore.deleteTravel(travel.id);
    if (success) {
      toast.add({
        title: 'Viaje eliminado',
        description: `${travel.label} se eliminó correctamente`,
        color: 'warning',
      });
      return;
    }

    toast.add({
      title: 'No se pudo eliminar el viaje',
      description: travelsStore.error ?? 'Intentá de nuevo',
      color: 'error',
    });
  }
}

// Row actions
function getRowActions(travel: TravelSummary) {
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

// Table columns
const columns: TableColumn<TravelSummary>[] = [
  {
    accessorKey: 'label',
    header: 'Nombre',
    cell: ({ row }) =>
      h(resolveComponent('NuxtLink'), {
        to: `/travels/${row.original.id}`,
        class: 'flex items-center gap-2 hover:text-primary transition-colors group',
      }, () => [
        h(resolveComponent('UIcon'), { name: 'i-lucide-tag', class: 'w-4 h-4 text-muted group-hover:text-primary' }),
        h('span', { class: 'font-medium' }, row.getValue('label')),
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
        h(resolveComponent('UIcon'), { name: 'i-lucide-user-star', class: 'w-4 h-4 text-muted shrink-0' }),
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
        color: getTravelStatusColor(status),
        variant: 'subtle',
      }, () => getTravelStatusLabel(status));
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
    <div class="flex flex-wrap justify-between items-center gap-4">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          Gestión de Viajes
        </h1>
        <p class="text-gray-500 dark:text-gray-400 mt-1">
          Administra todos los viajes de la agencia
        </p>
      </div>
      <UCheckboxGroup
        v-model="statuses"
        :items="statusItems"
        legend="Estatus del viaje"
        orientation="horizontal"
      />
      <UButton
        icon="i-lucide-plus"
        size="lg"
        @click="navigateToCreate"
      >
        Nuevo Viaje
      </UButton>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <!-- Total -->
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-muted">
              Total Viajes
            </p>
            <p class="text-2xl font-bold text-highlighted mt-1">
              {{ stats?.total ?? '—' }}
            </p>
          </div>
          <UIcon
            name="i-lucide-globe"
            class="w-10 h-10 text-muted"
          />
        </div>
      </UCard>

      <!-- Published -->
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-muted">
              Publicados
            </p>
            <p class="text-2xl font-bold text-highlighted mt-1">
              {{ stats?.published ?? '—' }}
            </p>
          </div>
          <UIcon
            name="i-lucide-check-circle"
            class="w-10 h-10 text-muted"
          />
        </div>
      </UCard>

      <!-- In Progress -->
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-muted">
              En Curso
            </p>
            <p class="text-2xl font-bold text-highlighted mt-1">
              {{ stats?.inProgress ?? '—' }}
            </p>
          </div>
          <UIcon
            name="i-lucide-plane"
            class="w-10 h-10 text-muted"
          />
        </div>
      </UCard>
    </div>

    <!-- Travels table -->
    <UCard>
      <div v-if="statuses.length === 0" class="py-12 text-center text-muted">
        Elegí al menos un estatus para ver viajes
      </div>
      <LoadState
        v-else
        v-bind="travelsLoad"
        label="los viajes"
        @retry="refetch()"
      >
        <!-- The agency has no travels at all -->
        <EmptyState
          v-if="travels.length === 0 && stats?.total === 0"
          section="travels"
          :actions="[{ label: 'Crear viaje', icon: 'i-lucide-plus', onClick: navigateToCreate }]"
        />
        <!-- There are travels, but none with the checked statuses -->
        <EmptyState
          v-else-if="travels.length === 0"
          section="noResults"
          :actions="[{ label: 'Restablecer filtros', icon: 'i-lucide-filter-x', color: 'neutral', variant: 'outline', onClick: resetStatuses }]"
        />
        <template v-else>
          <UTable
            :columns="columns"
            :data="travels"
          />
          <div v-if="data && data.total > PAGE_SIZE" class="flex justify-end border-t border-default pt-4">
            <UPagination
              v-model:page="page"
              :total="data.total"
              :items-per-page="PAGE_SIZE"
            />
          </div>
        </template>
      </LoadState>
    </UCard>
  </div>
</template>
