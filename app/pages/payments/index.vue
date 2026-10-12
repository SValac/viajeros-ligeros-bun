<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';

import { h } from 'vue';

import type { TravelStatus } from '~/types/travel';

import { travelPaymentTotalsQuery } from '~/queries/payments';
import { travelListQuery } from '~/queries/travels';
import { formatCurrency } from '~/utils/currency';

definePageMeta({
  name: 'payments-index',
});

const router = useRouter();
const paymentStore = usePaymentStore();
const travelStore = useTravelsStore();
const travelerStore = useTravelerStore();

// Travelers pay before, during and after the trip, so a travel stays here once published
// (not while pending, nor once cancelled).
const PAYABLE_STATUSES: TravelStatus[] = ['completed', 'in_progress', 'published'];
const PAGE_SIZE = 20;
const EMPTY_TOTALS: TravelPaymentTotals = { totalExpected: 0, totalCollected: 0, balance: 0, percent: 0 };

const page = shallowRef(1);

const { data: list, status: listStatus, refetch: refetchList } = useQuery(() => ({
  ...travelListQuery({ statuses: PAYABLE_STATUSES, page: page.value, pageSize: PAGE_SIZE }),
  placeholderData: previousList => previousList,
}));

const pageTravelIds = computed(() => (list.value?.items ?? []).map(travel => travel.id).sort());

const { data: totals, status: totalStatus, refetch: refetchTotals } = useQuery(() => ({
  ...travelPaymentTotalsQuery(pageTravelIds.value),
  placeholderData: previousPayments => previousPayments,
}));

const pageRows = computed(() => (list.value?.items ?? []).map(travel => ({
  travel,
  travelerCount: travel.travelerCount,
  ...(totals.value?.[travel.id] ?? EMPTY_TOTALS),
})));

// Si falló la lista, los totales están desactivados (sin ids): se disparan solos cuando vuelva
function retry() {
  refetchList();
  refetchTotals();
}

// Temporal hasta el sub-paso d: las tarjetas siguen sumando todos los viajes desde los stores
const payableTravels = computed(() =>
  travelStore.allTravels.filter(travel => PAYABLE_STATUSES.includes(travel.status)),
);

// Los viajes llegan de forma asíncrona (init-stores); se cargan pagos y configuraciones
// cuando cambia el conjunto de viajes con pagos.
const payableTravelIds = computed(() => payableTravels.value.map(travel => travel.id).join(','));

watch(payableTravelIds, (ids) => {
  if (ids)
    paymentStore.fetchByTravels(ids.split(','));
}, { immediate: true });

const travelSummaries = computed(() => {
  return payableTravels.value.map((travel) => {
    const travelers = travelerStore.getTravelersByTravel(travel.id);
    const summaries = travelers.map(t =>
      paymentStore.getTravelerPaymentSummary(t.id, travel.id),
    );

    const totalExpected = summaries.reduce((sum: number, s) => sum + s.finalCost, 0);
    const totalCollected = summaries.reduce((sum: number, s) => sum + s.totalPaid, 0);
    const balance = totalExpected - totalCollected;
    const percent = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

    return {
      travel,
      travelerCount: travelers.length,
      totalExpected,
      totalCollected,
      balance,
      percent,
    };
  });
});

const globalStats = computed(() => {
  const totals = travelSummaries.value;
  return {
    travelsWithPayments: totals.filter(t => t.totalCollected > 0).length,
    totalCollected: totals.reduce((sum, t) => sum + t.totalCollected, 0),
    totalBalance: totals.reduce((sum, t) => sum + t.balance, 0),
    settledTravels: totals.filter(t => t.percent >= 100).length,
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

    <!-- Stats cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-muted">
              Viajes con pagos
            </p>
            <p class="text-2xl font-bold mt-1">
              {{ globalStats.travelsWithPayments }}
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
              {{ formatCurrency(globalStats.totalCollected) }}
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
              :class="globalStats.totalBalance > 0 ? 'text-warning' : 'text-success'"
            >
              {{ formatCurrency(globalStats.totalBalance) }}
            </p>
          </div>
          <UIcon
            name="i-lucide-clock"
            class="w-10 h-10 opacity-60"
            :class="globalStats.totalBalance > 0 ? 'text-warning' : 'text-success'"
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
              {{ globalStats.settledTravels }}
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

      <div
        v-if="(listStatus === 'pending' && !list) || (totalStatus === 'pending' && !totals)"
        class="flex justify-center py-12"
      >
        <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-muted" />
      </div>
      <div
        v-else-if="listStatus === 'error' || totalStatus === 'error'"
        class="flex flex-col items-center justify-center gap-4 py-12"
      >
        <p class="text-muted">
          No se pudieron cargar los viajes
        </p>
        <UButton
          label="Reintentar"
          icon="i-lucide-refresh-cw"
          @click="retry"
        />
      </div>
      <div v-else-if="pageRows.length === 0" class="text-center py-12">
        <UIcon name="i-lucide-inbox" class="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <h3 class="text-lg font-medium mb-2">
          No hay viajes con pagos
        </h3>
        <p class="text-muted mb-4">
          Publica un viaje para gestionar sus pagos
        </p>
        <UButton icon="i-lucide-map" @click="goToTravelsDashboard">
          Ir a Viajes
        </UButton>
      </div>

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
    </UCard>
  </div>
</template>
