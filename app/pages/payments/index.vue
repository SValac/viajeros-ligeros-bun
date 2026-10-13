<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';

import { h } from 'vue';

import type { TravelStatus } from '~/types/travel';

import { useQueryLoadState } from '~/queries/load-state';
import { travelPaymentTotalsQuery } from '~/queries/payments';
import { travelListQuery } from '~/queries/travels';
import { formatCurrency } from '~/utils/currency';

definePageMeta({
  name: 'payments-index',
});

const router = useRouter();

// Travelers pay before, during and after the trip, so a travel stays here once published
// (not while pending, nor once cancelled).
const PAYABLE_STATUSES: TravelStatus[] = ['completed', 'in_progress', 'published'];
// Las tarjetas suman solo los activos: los completados crecen para siempre (sus saldos se ven en la tabla)
const ACTIVE_STATUSES: TravelStatus[] = ['in_progress', 'published'];
const PAGE_SIZE = 20;
const EMPTY_TOTALS: TravelPaymentTotals = { totalExpected: 0, totalCollected: 0, balance: 0, percent: 0 };

const page = shallowRef(1);

const listQuery = useQuery(() => ({
  ...travelListQuery({ statuses: PAYABLE_STATUSES, page: page.value, pageSize: PAGE_SIZE }),
  placeholderData: previousList => previousList,
}));
const { data: list, refetch: refetchList } = listQuery;
const listLoad = useQueryLoadState(listQuery);
const pageTravelIds = computed(() => (list.value?.items ?? []).map(travel => travel.id).sort());
const totalsQuery = useQuery(() => ({
  ...travelPaymentTotalsQuery(pageTravelIds.value),
  placeholderData: previousPayments => previousPayments,
}));
const { data: totals, refetch: refetchTotals } = totalsQuery;
const totalsLoad = useQueryLoadState(totalsQuery);

const { data: activeList } = useQuery(() => travelListQuery({ statuses: ACTIVE_STATUSES }));
const activeTravelIds = computed(() => (activeList.value?.items ?? []).map(travel => travel.id).sort());
const { data: activeTotals } = useQuery(() => travelPaymentTotalsQuery(activeTravelIds.value));

const pageRows = computed(() => (list.value?.items ?? []).map(travel => ({
  travel,
  travelerCount: travel.travelerCount,
  ...(totals.value?.[travel.id] ?? EMPTY_TOTALS),
})));

const globalStats = computed(() => {
  // Todavía no llegó la lista de activos
  if (!activeList.value)
    return undefined;
  // Hay activos, pero todavía no llegaron sus totales (sin activos la query no corre: todo en 0)
  if (activeTravelIds.value.length > 0 && !activeTotals.value)
    return undefined;

  const travelTotals = Object.values(activeTotals.value ?? {});
  return {
    travelsWithPayments: travelTotals.filter(t => t.totalCollected > 0).length,
    totalCollected: travelTotals.reduce((sum, t) => sum + t.totalCollected, 0),
    totalBalance: travelTotals.reduce((sum, t) => sum + t.balance, 0),
    settledTravels: travelTotals.filter(t => t.percent >= 100).length,
  };
});

function goToTravelsDashboard() {
  router.push({ name: 'travels-dashboard' });
}

type TravelSummaryRow = (typeof pageRows.value)[number];

const columns: TableColumn<TravelSummaryRow>[] = [
  {
    id: 'label',
    header: 'Nombre',
    cell: ({ row }) => h(resolveComponent('NuxtLink'), {
      to: { name: 'payments-travel', params: { id: row.original.travel.id } },
      class: 'flex items-center gap-2 hover:text-primary transition-colors group',
    }, () => [
      h(resolveComponent('UIcon'), { name: 'i-lucide-tag', class: 'w-4 h-4 text-muted group-hover:text-primary' }),
      h('span', { class: 'font-medium' }, row.original.travel.label),
    ]),
  },
  {
    id: 'status',
    header: 'Estado',
    cell: ({ row }) => h(resolveComponent('UBadge'), {
      label: getTravelStatusLabel(row.original.travel.status),
      color: getTravelStatusColor(row.original.travel.status),
      variant: 'subtle',
      size: 'sm',
    }),
  },
  {
    id: 'viajeros',
    header: 'Viajeros',
    cell: ({ row }) => h('span', { class: 'text-sm text-muted' }, `${row.original.travelerCount}`),
  },
  {
    id: 'totalExpected',
    header: 'Total esperado',
    cell: ({ row }) => h('span', { class: 'text-sm' }, formatCurrency(row.original.totalExpected)),
  },
  {
    id: 'totalCollected',
    header: 'Recaudado',
    cell: ({ row }) => h('span', { class: 'text-sm' }, formatCurrency(row.original.totalCollected)),
  },
  {
    id: 'balance',
    header: 'Saldo pendiente',
    cell: ({ row }) => {
      const balance = row.original.balance;
      return h('span', { class: balance > 0 ? 'text-sm text-warning' : 'text-sm text-success' }, formatCurrency(balance));
    },
  },
  {
    id: 'percent',
    header: '% Completado',
    cell: ({ row }) => {
      const pct = row.original.percent;
      // Solo el viaje liquidado lleva color; un avance parcial es normal, no un error.
      const color = pct >= 100 ? 'text-success' : 'text-highlighted';
      return h('span', { class: `text-sm font-medium ${color}` }, `${pct}%`);
    },
  },
  {
    id: 'actions',
    header: 'Acciones',
    cell: ({ row }) => {
      return h(
        resolveComponent('UButton'),
        {
          size: 'sm',
          variant: 'outline',
          icon: 'i-lucide-credit-card',
          onClick: () => router.push({ name: 'payments-travel', params: { id: row.original.travel.id } }),
        },
        () => 'Ver pagos',
      );
    },
  },
];
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
        Gestión de Pagos
      </h1>
      <p class="text-gray-500 dark:text-gray-400 mt-1">
        Seguimiento de abonos y saldos por viaje
      </p>
    </div>

    <!-- Stats cards: solo viajes activos -->
    <p class="text-sm text-muted -mb-2">
      Viajes publicados y en curso
    </p>
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-muted">
              Viajes con pagos
            </p>
            <p class="text-2xl font-bold mt-1">
              {{ globalStats?.travelsWithPayments ?? '—' }}
            </p>
          </div>
          <UIcon name="i-lucide-map" class="w-10 h-10 text-muted" />
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-muted">
              Total recaudado
            </p>
            <p class="text-2xl font-bold mt-1">
              {{ globalStats ? formatCurrency(globalStats.totalCollected) : '—' }}
            </p>
          </div>
          <UIcon name="i-lucide-trending-up" class="w-10 h-10 text-muted" />
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-muted">
              Saldo pendiente
            </p>
            <p
              class="text-2xl font-bold mt-1"
              :class="(globalStats?.totalBalance ?? 0) > 0 ? 'text-warning' : 'text-success'"
            >
              {{ globalStats ? formatCurrency(globalStats.totalBalance) : '—' }}
            </p>
          </div>
          <UIcon
            name="i-lucide-clock"
            class="w-10 h-10 opacity-60"
            :class="(globalStats?.totalBalance ?? 0) > 0 ? 'text-warning' : 'text-success'"
          />
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-muted">
              Viajes liquidados
            </p>
            <p class="text-2xl font-bold mt-1">
              {{ globalStats?.settledTravels ?? '—' }}
            </p>
          </div>
          <UIcon name="i-lucide-check-circle" class="w-10 h-10 text-muted" />
        </div>
      </UCard>
    </div>

    <!-- Travels table -->
    <UCard>
      <template #header>
        <h2 class="font-semibold text-lg">
          Viajes
        </h2>
      </template>

      <LoadState
        v-bind="listLoad"
        label="los viajes"
        @retry="refetchList()"
      >
        <!-- Sin viajes en la página, los totales están desactivados (sin ids) y no van a llegar -->
        <LoadState
          v-bind="totalsLoad"
          :is-loaded="totalsLoad.isLoaded || pageTravelIds.length === 0"
          label="los pagos"
          @retry="refetchTotals()"
        >
          <EmptyState
            v-if="pageRows.length === 0"
            section="payments"
            :actions="[{ label: 'Ir a Viajes', icon: 'i-lucide-map', onClick: goToTravelsDashboard }]"
          />

          <template v-else>
            <UTable :columns="columns" :data="pageRows" />
            <div v-if="list && list.total > PAGE_SIZE" class="flex justify-end border-t border-default pt-4">
              <UPagination
                v-model:page="page"
                :total="list.total"
                :items-per-page="PAGE_SIZE"
              />
            </div>
          </template>
        </LoadState>
      </LoadState>
    </UCard>
  </div>
</template>
