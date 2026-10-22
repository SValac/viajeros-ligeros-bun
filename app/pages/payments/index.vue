<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';

import { h } from 'vue';

import type { TravelStatus } from '~/types/travel';

import { useQueryLoadState } from '~/queries/load-state';
import { travelPaymentTotalsQuery } from '~/queries/payments';
import { travelListQuery } from '~/queries/travels';
import { formatCurrency } from '~/utils/currency';
import { travelLinkCell } from '~/utils/table-cells';

definePageMeta({
  name: 'payments-index',
});

const router = useRouter();

// Travelers pay before, during and after the trip, so a travel stays here once published
// (not while pending, nor once cancelled).
const PAYABLE_STATUSES: TravelStatus[] = ['completed', 'in_progress', 'published'];
// The cards add up active ones only: completed ones grow forever (their balances show in the table)
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
  // The active list hasn't arrived yet
  if (!activeList.value)
    return undefined;
  // There are active ones, but their totals haven't arrived yet (with none active the query doesn't run: all 0)
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
    cell: ({ row }) => travelLinkCell({ name: 'payments-travel', params: { id: row.original.travel.id } }, row.original.travel.label),
  },
  {
    id: 'status',
    header: 'Estado',
    cell: ({ row }) => h(resolveComponent('TravelStatusBadge'), { status: row.original.travel.status, size: 'sm' }),
  },
  {
    id: 'travelers',
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
      // Only a settled travel gets a color; partial progress is normal, not an error.
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

const balanceClass = computed(() => (globalStats.value?.totalBalance ?? 0) > 0 ? 'text-warning' : 'text-success');
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Gestión de Pagos"
      description="Seguimiento de abonos y saldos por viaje"
    />

    <!-- Stats cards: active travels only -->
    <p class="text-sm text-muted -mb-2">
      Viajes publicados y en curso
    </p>
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <StatCard
        label="Viajes con pagos"
        icon="i-lucide-map"
        :value="String(globalStats?.travelsWithPayments ?? '—')"
      />

      <StatCard
        label="Total recaudado"
        icon="i-lucide-trending-up"
        :value="globalStats ? formatCurrency(globalStats.totalCollected) : '—'"
      />

      <StatCard
        label="Saldo pendiente"
        icon="i-lucide-clock"
        :value="globalStats ? formatCurrency(globalStats.totalBalance) : '—'"
        :value-class="globalStats ? balanceClass : 'text-highlighted'"
      />

      <StatCard
        label="Viajes liquidados"
        icon="i-lucide-check-circle"
        :value="String(globalStats?.settledTravels ?? '—')"
      />
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
        <!-- With no travels on the page, the totals are disabled (no ids) and won't arrive -->
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
