<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';

import { h } from 'vue';

import type { PaymentFormData, PaymentStatus, TravelerAccountConfig } from '~/types/payment';
import type { Traveler, TravelerWithChildren } from '~/types/traveler';

import { useTravelPayments } from '~/composables/payments/use-travel-payments';
import { useTravelQuotation } from '~/composables/quotation/use-travel-quotation';
import { groupTravelersByRepresentative, selectPayingTravelers } from '~/composables/travelers/use-traveler-domain';
import { useExpandedGroups } from '~/composables/use-expanded-groups';
import { useQueryWithLoadState } from '~/queries/load-state';
import { travelersByTravelQuery } from '~/queries/travelers';
import { travelDetailQuery } from '~/queries/travels';
import { actionsColumn } from '~/utils/actions-column';
import { formatCurrency } from '~/utils/currency';
import { toErrorMessage } from '~/utils/error-message';
import { getPaymentStatusFilterOptions } from '~/utils/payment-status';
import { groupNameCell } from '~/utils/table-cells';
import { formatTravelerName, getTravelerTypeLabel } from '~/utils/traveler-labels';

// Payments of a travel's travelers: cash summary, account configs and payments. Used by the
// travel's "Pagos" tab and by /payments/travel/[id].
const props = defineProps<{
  travelId: string;
}>();

const router = useRouter();
const toast = useToast();
const paymentStore = usePaymentStore();

const quotationStore = useQuotationStore();

const travelId = computed(() => props.travelId);
const { data: travelerData, refetch: refetchTravelers, loadState: travelersLoad } = useQueryWithLoadState(() => travelersByTravelQuery(travelId.value));
const { data: travel } = useQuery(() => travelDetailQuery(travelId.value));
// The public prices (what each traveler is charged) live in the quotation.
const { quotation } = useTravelQuotation(travelId);
const publicPrices = computed(() =>
  quotation.value
    ? quotationStore.getPublicPricesByQuotation(quotation.value.id)
    : [],
);

const enrolledTravelers = computed(() =>
  selectPayingTravelers(travelerData.value?.travelers ?? []),
);

// Status filter
const statusFilter = ref<PaymentStatus | 'all'>('all');
const statusFilterOptions = getPaymentStatusFilterOptions('traveler');

// Grouped first so companions stay under their representative; the status filter only picks
// which root rows show.
const groupedFilteredTravelers = computed<TravelerWithChildren[]>(() =>
  groupTravelersByRepresentative(enrolledTravelers.value).filter(t =>
    statusFilter.value === 'all'
    || paymentStore.getTravelerPaymentSummary(t.id, travelId.value).status === statusFilter.value,
  ),
);

const expanded = useExpandedGroups(groupedFilteredTravelers);

// Travel cash
const cashSummary = computed(() => {
  const summaries = enrolledTravelers.value
    .filter((t: Traveler) => !!paymentStore.getAccountConfig(t.id, travelId.value)?.publicPriceId)
    .map((t: Traveler) =>
      paymentStore.getTravelerPaymentSummary(t.id, travelId.value),
    );
  const totalExpected = summaries.reduce((sum: number, s) => sum + s.finalCost, 0);
  const totalCollected = summaries.reduce((sum: number, s) => sum + s.totalPaid, 0);
  return { totalExpected, totalCollected, balance: totalExpected - totalCollected };
});

// Modals
const isPaymentModalOpen = shallowRef(false);
const isConfigModalOpen = shallowRef(false);
const selectedTraveler = shallowRef<Traveler | null>(null);

function openPaymentModal(traveler: Traveler) {
  selectedTraveler.value = traveler;
  isPaymentModalOpen.value = true;
}

function openConfigModal(traveler: Traveler) {
  selectedTraveler.value = traveler;
  isConfigModalOpen.value = true;
}

function closeModals() {
  isPaymentModalOpen.value = false;
  isConfigModalOpen.value = false;
  selectedTraveler.value = null;
}

function clearStatusFilter() {
  statusFilter.value = 'all';
}

const selectedSummary = computed(() => {
  if (!selectedTraveler.value)
    return null;
  return paymentStore.getTravelerPaymentSummary(
    selectedTraveler.value.id,
    travelId.value,
  );
});

const selectedConfig = computed(() => {
  if (!selectedTraveler.value)
    return undefined;
  return paymentStore.getAccountConfig(selectedTraveler.value.id, travelId.value);
});

async function handlePaymentSubmit(data: PaymentFormData) {
  try {
    await paymentStore.addPayment(data);
    toast.add({ title: 'Pago registrado', description: `Se registró un abono de ${formatCurrency(data.amount)}`, color: 'success' });
    closeModals();
  }
  catch (e) {
    toast.add({ title: 'Error', description: toErrorMessage(e, 'No se pudo registrar el pago'), color: 'error' });
  }
}

async function handleConfigSubmit(config: TravelerAccountConfig) {
  try {
    await paymentStore.setAccountConfig(config);
    toast.add({ title: 'Configuración guardada', color: 'success' });
    closeModals();
  }
  catch (e) {
    toast.add({ title: 'Error', description: toErrorMessage(e, 'No se pudo guardar la configuración'), color: 'error' });
  }
}

function getRowActions(travelerWithChildren: TravelerWithChildren) {
  return [
    [
      {
        label: 'Registrar abono',
        icon: 'i-lucide-plus-circle',
        disabled: !paymentStore.getAccountConfig(travelerWithChildren.id, travelId.value)?.publicPriceId,
        onSelect: () => openPaymentModal(travelerWithChildren),
      },
      {
        label: 'Ver historial',
        icon: 'i-lucide-history',
        onSelect: () => router.push({ name: 'payments-traveler', params: { id: travelerWithChildren.id } }),
      },
    ],
    [
      {
        label: 'Configurar cuenta',
        icon: 'i-lucide-settings',
        onSelect: () => openConfigModal(travelerWithChildren),
      },
    ],
  ];
}

const columns: TableColumn<TravelerWithChildren>[] = [
  {
    id: 'name',
    header: 'Nombre',
    cell: ({ row }) => groupNameCell(row, h(resolveComponent('NuxtLink'), {
      to: { name: 'payments-traveler', params: { id: row.original.id } },
      class: 'font-medium hover:text-primary transition-colors',
    }, () => formatTravelerName(row.original))),
  },
  {
    id: 'travelerType',
    header: 'Tipo',
    cell: ({ row }) => {
      const config = paymentStore.getAccountConfig(row.original.id, travelId.value);
      const label = getTravelerTypeLabel(config?.travelerType ?? 'adult');
      return h(resolveComponent('UBadge'), { color: 'neutral', variant: 'subtle' }, () => label);
    },
  },
  {
    id: 'type',
    header: 'Precio',
    cell: ({ row }) => {
      const config = paymentStore.getAccountConfig(row.original.id, travelId.value);
      if (config?.publicPriceId) {
        const price = publicPrices.value.find(p => p.id === config.publicPriceId);
        if (price) {
          return h(resolveComponent('UBadge'), { color: 'neutral', variant: 'subtle' }, () => price.priceType);
        }
      }
      const label = getTravelerTypeLabel(config?.travelerType ?? 'adult');
      return h(resolveComponent('UBadge'), { color: 'neutral', variant: 'subtle' }, () => label);
    },
  },
  {
    id: 'finalCost',
    header: 'Costo final',
    cell: ({ row }) => {
      const config = paymentStore.getAccountConfig(row.original.id, travelId.value);
      if (!config?.publicPriceId)
        return h('span', { class: 'text-sm text-muted' }, '—');
      const s = paymentStore.getTravelerPaymentSummary(row.original.id, travelId.value);
      return h('span', { class: 'text-sm' }, formatCurrency(s.finalCost));
    },
  },
  {
    id: 'discount',
    header: 'Descuento',
    cell: ({ row }) => {
      const config = paymentStore.getAccountConfig(row.original.id, travelId.value);
      if (!config?.publicPriceId)
        return h('span', { class: 'text-sm text-muted' }, '—');
      const s = paymentStore.getTravelerPaymentSummary(row.original.id, travelId.value);
      if (s.totalDiscountAmount <= 0)
        return h('span', { class: 'text-sm text-muted' }, '—');
      return h('span', { class: 'text-sm' }, formatCurrency(s.totalDiscountAmount));
    },
  },
  {
    id: 'surcharge',
    header: 'Incremento',
    cell: ({ row }) => {
      const config = paymentStore.getAccountConfig(row.original.id, travelId.value);
      if (!config?.publicPriceId)
        return h('span', { class: 'text-sm text-muted' }, '—');
      const s = paymentStore.getTravelerPaymentSummary(row.original.id, travelId.value);
      if (s.totalSurchargeAmount <= 0)
        return h('span', { class: 'text-sm text-muted' }, '—');
      return h('span', { class: 'text-sm' }, formatCurrency(s.totalSurchargeAmount));
    },
  },
  {
    id: 'totalPaid',
    header: 'Abonado',
    cell: ({ row }) => {
      const config = paymentStore.getAccountConfig(row.original.id, travelId.value);
      if (!config?.publicPriceId)
        return h('span', { class: 'text-sm text-muted' }, '—');
      const s = paymentStore.getTravelerPaymentSummary(row.original.id, travelId.value);
      return h('span', { class: 'text-sm' }, formatCurrency(s.totalPaid));
    },
  },
  {
    id: 'balance',
    header: 'Saldo pendiente',
    cell: ({ row }) => {
      const config = paymentStore.getAccountConfig(row.original.id, travelId.value);
      if (!config?.publicPriceId)
        return h('span', { class: 'text-sm text-muted' }, '—');
      const s = paymentStore.getTravelerPaymentSummary(row.original.id, travelId.value);
      return h('span', { class: s.balance > 0 ? 'text-sm text-warning' : 'text-sm text-success' }, formatCurrency(s.balance));
    },
  },
  {
    id: 'status',
    header: 'Estado',
    cell: ({ row }) => {
      const config = paymentStore.getAccountConfig(row.original.id, travelId.value);
      if (!config?.publicPriceId)
        return h(resolveComponent('UBadge'), { color: 'neutral', variant: 'subtle' }, () => 'Sin configurar');
      const s = paymentStore.getTravelerPaymentSummary(row.original.id, travelId.value);
      return h(resolveComponent('PaymentStatusBadge'), { status: s.status, party: 'traveler' });
    },
  },
  actionsColumn(getRowActions),
];

useTravelPayments(travelId);
</script>

<template>
  <div v-if="travel" class="space-y-6">
    <!-- Travel cash -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard
        label="Total esperado"
        icon="i-lucide-wallet"
        :value="formatCurrency(cashSummary.totalExpected)"
      />
      <StatCard
        label="Total recaudado"
        icon="i-lucide-trending-up"
        :value="formatCurrency(cashSummary.totalCollected)"
      />
      <StatCard
        label="Saldo por cobrar"
        icon="i-lucide-clock"
        :value="formatCurrency(cashSummary.balance)"
        :value-class="cashSummary.balance > 0 ? 'text-warning' : 'text-success'"
      />
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-3">
      <USelect
        v-model="statusFilter"
        :items="statusFilterOptions"
        value-key="value"
        label-key="label"
        class="w-44"
      />
    </div>

    <!-- Travelers table -->
    <UCard>
      <!-- Until the travelers load (or if they fail), "no travelers" would be a lie -->
      <LoadState
        v-bind="travelersLoad"
        label="los viajeros"
        @retry="refetchTravelers()"
      >
        <template v-if="groupedFilteredTravelers.length === 0">
          <EmptyState v-if="enrolledTravelers.length === 0" section="travelers" />
          <EmptyState
            v-else
            section="noResults"
            :actions="[{ label: 'Limpiar filtros', icon: 'i-lucide-filter-x', color: 'neutral', variant: 'outline', onClick: clearStatusFilter }]"
          />
        </template>
        <UTable
          v-else
          v-model:expanded="expanded"
          :columns="columns"
          :data="groupedFilteredTravelers"
          :get-row-id="(row) => row.id"
          :get-sub-rows="(row) => row.children"
          :ui="{
            base: 'border-separate border-spacing-0',
            tbody: '[&>tr]:last:[&>td]:border-b-0',
            tr: 'group',
            td: 'empty:p-0 group-has-[td:not(:empty)]:border-b border-default',
          }"
        />
      </LoadState>
    </UCard>

    <!-- Payment Modal -->
    <UModal
      v-model:open="isPaymentModalOpen"
      title="Registrar abono"
      :description="selectedTraveler ? formatTravelerName(selectedTraveler) : ''"
    >
      <template #body>
        <PaymentForm
          v-if="selectedTraveler && selectedConfig?.publicPriceId && selectedSummary"
          :traveler-id="selectedTraveler.id"
          :travel-id="travelId"
          :max-amount="selectedSummary.balance"
          @submit="handlePaymentSubmit"
          @cancel="closeModals"
        />
        <div v-else class="flex flex-col gap-3">
          <UAlert
            color="warning"
            variant="soft"
            icon="i-lucide-triangle-alert"
            title="Cuenta sin configurar"
            description="Configura primero la cuenta del viajero para poder registrar pagos."
          />
          <UButton
            color="warning"
            variant="soft"
            @click="() => { const t = selectedTraveler; closeModals(); if (t) openConfigModal(t); }"
          >
            Configurar cuenta
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Account Config Modal -->
    <UModal
      v-model:open="isConfigModalOpen"
      title="Configurar cuenta"
      :description="selectedTraveler ? formatTravelerName(selectedTraveler) : ''"
    >
      <template #body>
        <PaymentAccountConfigForm
          v-if="selectedTraveler"
          :traveler-id="selectedTraveler.id"
          :travel-id="travelId"
          :public-prices="publicPrices"
          :config="selectedConfig"
          @submit="handleConfigSubmit"
          @cancel="closeModals"
        />
      </template>
    </UModal>
  </div>
</template>
