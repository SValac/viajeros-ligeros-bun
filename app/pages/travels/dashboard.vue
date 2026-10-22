<script setup lang="ts">
import type { CheckboxGroupItem, DropdownMenuItem, TableColumn } from '@nuxt/ui';

import { h } from 'vue';

import type { TravelStatus, TravelSummary } from '~/types/travel';

import { useActionToast } from '~/composables/use-action-toast';
import { useQueryWithLoadState } from '~/queries/load-state';
import { travelListQuery, travelStatsQuery } from '~/queries/travels';
import { actionsColumn, deleteAction } from '~/utils/actions-column';
import { formatDateRange } from '~/utils/format-date';
import { travelLinkCell } from '~/utils/table-cells';
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
const { runWithToast } = useActionToast();
const router = useRouter();
const confirmDelete = useConfirmDelete();

// Computed
const { data: stats, error: statsError } = useQuery(() => travelStatsQuery());

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

const { data, refetch, loadState: travelsLoad } = useQueryWithLoadState(() => ({
  ...travelListQuery({
    statuses: [...statuses.value].sort(),
    page: page.value,
    pageSize: PAGE_SIZE,
  }),
  placeholderData: previousList => previousList,
  enabled: statuses.value.length > 0,
}));

// Deleting the only travel on the last page removes that page: go to the last one that exists
watch(data, (list) => {
  if (list && list.items.length === 0 && page.value > 1) {
    page.value = Math.max(1, Math.ceil(list.total / PAGE_SIZE));
  }
});

const travels = computed(() => data.value?.items ?? []);

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
  if (await confirmDelete({
    title: 'Eliminar viaje',
    description: `¿Estás seguro de eliminar el viaje ${travel.label}?`,
  })) {
    await runWithToast(() => travelsStore.deleteTravel(travel.id), {
      success: {
        title: 'Viaje eliminado',
        description: `${travel.label} se eliminó correctamente`,
        color: 'warning',
      },
      error: 'No se pudo eliminar el viaje',
    });
  }
}

// Row actions
function getRowActions(travel: TravelSummary): DropdownMenuItem[][] {
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
      deleteAction(() => handleDelete(travel)),
    ],
  ];
}

// Table columns
const columns: TableColumn<TravelSummary>[] = [
  {
    accessorKey: 'label',
    header: 'Nombre',
    cell: ({ row }) => travelLinkCell({ name: 'travel-detail', params: { id: row.original.id } }, row.original.label),
  },
  {
    accessorKey: 'coordinatorIds',
    header: 'Coordinadores',
    cell: ({ row }) => {
      const ids = row.getValue('coordinatorIds') as string[];
      if (!ids || ids.length === 0)
        return h('span', { class: 'text-sm text-gray-400' }, 'Sin coordinador');
      const names = coordinatorStore.getCoordinatorsByIds(ids).map(c => c.name);
      return h('div', { class: 'flex items-center gap-2' }, [
        h(resolveComponent('UIcon'), { name: 'i-lucide-user-cog', class: 'w-4 h-4 text-muted shrink-0' }),
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
      return h(resolveComponent('TravelStatusBadge'), { status });
    },
  },
  actionsColumn(getRowActions),
];
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Gestión de Viajes"
      description="Administra todos los viajes de la agencia"
    >
      <template #actions>
        <UCheckboxGroup
          v-model="statuses"
          :items="statusItems"
          legend="Estatus del viaje"
          orientation="horizontal"
          class="mr-2"
        />
        <UButton
          icon="i-lucide-plus"
          size="lg"
          @click="navigateToCreate"
        >
          Nuevo Viaje
        </UButton>
      </template>
    </PageHeader>

    <!-- Stats -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <StatCard
        label="Total de viajes"
        icon="i-lucide-globe"
        :value="String(stats?.total ?? '—')"
        :loading="!stats && !statsError"
      />
      <StatCard
        label="Publicados"
        icon="i-lucide-check-circle"
        :value="String(stats?.published ?? '—')"
        :loading="!stats && !statsError"
      />
      <StatCard
        label="En curso"
        icon="i-lucide-bus"
        :value="String(stats?.inProgress ?? '—')"
        :loading="!stats && !statsError"
      />
    </div>

    <!-- Travels table -->
    <UCard>
      <div v-if="statuses.length === 0" class="py-12 text-center text-muted">
        Elegí al menos un estatus para ver viajes
      </div>
      <!-- Until the stats arrive (or fail), an empty list can't tell "no travels at all" from
           "none with these statuses" -->
      <LoadState
        v-else
        v-bind="travelsLoad"
        :is-loaded="travelsLoad.isLoaded && (travels.length > 0 || !!stats || !!statsError)"
        label="los viajes"
        skeleton="table"
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
