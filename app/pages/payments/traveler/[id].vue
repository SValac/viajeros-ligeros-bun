<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';

import { h } from 'vue';

import type { Payment, PaymentFormData, PaymentType, TravelerAccountConfig } from '~/types/payment';

import { useActionToast } from '~/composables/use-action-toast';
import { useFormModal } from '~/composables/use-form-modal';
import { useRedirectIfMissing } from '~/composables/use-redirect-if-missing';
import { useQueryWithLoadState } from '~/queries/load-state';
import { travelerDetailQuery } from '~/queries/travelers';
import { travelListQuery } from '~/queries/travels';
import { actionsColumn, deleteAction } from '~/utils/actions-column';
import { formatCurrency } from '~/utils/currency';
import { formatShortDate } from '~/utils/format-date';
import { getPaymentTypeLabel } from '~/utils/payment-type';
import { formatTravelerName } from '~/utils/traveler-labels';

definePageMeta({
  name: 'payments-traveler',
});

const route = useRoute();
const router = useRouter();
const { runWithToast } = useActionToast();
const paymentStore = usePaymentStore();
const quotationStore = useQuotationStore();
const confirmDelete = useConfirmDelete();

const travelerId = computed(() => route.params.id as string);
const { data: traveler, status, refetch, loadState: travelerLoad } = useQueryWithLoadState(() => travelerDetailQuery(travelerId.value));

useRedirectIfMissing({ status, data: traveler }, { to: { name: 'payments-index' } });

const travelerName = computed(() =>
  traveler.value ? formatTravelerName(traveler.value) : '',
);

// One quotation per travel the traveler is in (for its public prices). The quotation query
// skips the request when that travel's quotation is cached and fresh.
async function ensureQuotationsLoaded(travelIds: string[]) {
  await runWithToast(() => Promise.all(travelIds.filter(Boolean).map(id => quotationStore.fetchByTravel(id))), {
    error: 'No se pudieron cargar los precios del viaje',
    errorFallback: 'Recarga la página',
  });
}

// All travel IDs this traveler has account configs or payments for
const travelerTravelIds = computed((): string[] => {
  const paymentTravelIds = paymentStore.getPaymentsByTraveler(travelerId.value).map((p: Payment) => p.travelId);
  const configuredTravelIds = paymentStore.accountConfigs
    .filter((c: { travelerId: string; travelId: string }) => c.travelerId === travelerId.value)
    .map((c: { travelerId: string; travelId: string }) => c.travelId);
  const enrolledTravelId = traveler.value?.travelId;
  return [...new Set([...configuredTravelIds, ...paymentTravelIds, ...(enrolledTravelId ? [enrolledTravelId] : [])])];
});

const travelSummaryFilters = computed(() => ({
  ids: [...travelerTravelIds.value].sort(),
}));

const { data: travelSummaries } = useQuery(() => ({
  ...travelListQuery(travelSummaryFilters.value),
  enabled: travelSummaryFilters.value.ids.length > 0,
}));

const travelLabels = computed(() => new Map(
  (travelSummaries.value?.items ?? []).map(t => [t.id, t.label]),
));

// Filters
const dateFrom = ref('');
const dateTo = ref('');
const travelFilter = ref<string>('all');

const travelOptions = computed(() => [
  { label: 'Todos los viajes', value: 'all' },
  ...travelerTravelIds.value.map((id) => {
    return { label: travelLabels.value.get(id) ?? id, value: id };
  }),
]);

function getTravelName(id: string) {
  return travelLabels.value.get(id) ?? id;
}

const filteredPayments = computed(() => {
  return paymentStore.getPaymentsByTraveler(travelerId.value).filter((p: Payment) => {
    if (travelFilter.value !== 'all' && p.travelId !== travelFilter.value)
      return false;
    if (dateFrom.value && p.paymentDate < dateFrom.value)
      return false;
    if (dateTo.value && p.paymentDate > dateTo.value)
      return false;
    return true;
  });
});

// Modals
const { isOpen: isEditModalOpen, editing: editingPayment, openEdit: openEditModal, close: closeEditModal } = useFormModal<Payment>();

async function handleEditSubmit(data: PaymentFormData) {
  if (!editingPayment.value)
    return;
  const paymentId = editingPayment.value.id;
  if (await runWithToast(() => paymentStore.updatePayment(paymentId, data), {
    success: 'Pago actualizado',
    error: 'Error',
    errorFallback: 'No se pudo actualizar el pago',
  })) {
    closeEditModal();
  }
}

async function handleDelete(payment: Payment) {
  if (await confirmDelete({
    title: 'Eliminar pago',
    description: '¿Estás seguro de eliminar este pago? Esta acción no se puede deshacer.',
  })) {
    await runWithToast(() => paymentStore.deletePayment(payment.id), {
      success: { title: 'Pago eliminado', color: 'warning' },
      error: 'Error',
      errorFallback: 'No se pudo eliminar el pago',
    });
  }
}

function getRowActions(payment: Payment) {
  return [
    [{ label: 'Editar', icon: 'i-lucide-pencil', onSelect: () => openEditModal(payment) }],
    [deleteAction(() => handleDelete(payment))],
  ];
}

const columns: TableColumn<Payment>[] = [
  {
    accessorKey: 'paymentDate',
    header: 'Fecha',
    cell: ({ row }) => h('span', { class: 'text-sm' }, formatShortDate(row.getValue('paymentDate'))),
  },
  {
    accessorKey: 'amount',
    header: 'Monto',
    cell: ({ row }) => h('span', { class: 'text-sm font-medium text-success' }, formatCurrency(row.getValue('amount'))),
  },
  {
    accessorKey: 'paymentType',
    header: 'Tipo',
    cell: ({ row }) => {
      const type = row.getValue<PaymentType>('paymentType');
      return h(resolveComponent('UBadge'), { color: type === 'cash' ? 'neutral' : 'info', variant: 'subtle' }, () => getPaymentTypeLabel(type));
    },
  },
  {
    accessorKey: 'notes',
    header: 'Notas',
    cell: ({ row }) => h('span', { class: 'text-sm text-muted' }, row.getValue('notes') || '—'),
  },
  actionsColumn(getRowActions),
];

// Config modal
const { isOpen: isConfigModalOpen, editing: editingConfigTravelId, openEdit: openConfigModal, close: closeConfigModal } = useFormModal<string>();

function goToTravelPayments(travelId: string) {
  router.push({ name: 'payments-travel', params: { id: travelId } });
}

const editingConfig = computed(() =>
  editingConfigTravelId.value
    ? paymentStore.getAccountConfig(travelerId.value, editingConfigTravelId.value)
    : undefined,
);

const editingConfigPublicPrices = computed(() => {
  if (!editingConfigTravelId.value)
    return [];
  const quotation = quotationStore.getQuotationByTravel(editingConfigTravelId.value);
  return quotation ? quotationStore.getPublicPricesByQuotation(quotation.id) : [];
});

async function handleConfigSubmit(config: TravelerAccountConfig) {
  if (await runWithToast(() => paymentStore.setAccountConfig(config), {
    success: 'Configuración guardada',
    error: 'Error',
    errorFallback: 'No se pudo guardar la configuración',
  })) {
    closeConfigModal();
  }
}

const editingSummary = computed(() => {
  if (!editingPayment.value)
    return null;
  return paymentStore.getTravelerPaymentSummary(travelerId.value, editingPayment.value.travelId);
});

const editMaxAmount = computed(() => {
  if (!editingSummary.value || !editingPayment.value)
    return 0;
  return editingSummary.value.balance + editingPayment.value.amount;
});

onMounted(async () => {
  await runWithToast(() => paymentStore.fetchByTraveler(travelerId.value), {
    error: 'No se pudieron cargar los pagos',
    errorFallback: 'Recarga la página',
  });
  await ensureQuotationsLoaded(travelerTravelIds.value);
});

watch(travelerTravelIds, (ids) => {
  void ensureQuotationsLoaded(ids);
});
</script>

<template>
  <!-- `null` = it doesn't exist: keep the skeleton while useRedirectIfMissing leaves, not a blank page -->
  <LoadState
    v-bind="travelerLoad"
    :is-loaded="!!traveler"
    label="el viajero"
    skeleton="detail"
    @retry="refetch()"
  >
    <div v-if="traveler" class="space-y-6">
      <PageHeader
        :title="travelerName"
        description="Historial de pagos"
        :to="{ name: 'payments-index' }"
        back-label="Volver a pagos"
      />

      <!-- Filters -->
      <div class="flex flex-wrap gap-3">
        <USelect
          v-model="travelFilter"
          :items="travelOptions"
          value-key="value"
          label-key="label"
          class="w-52"
        />
        <UInput
          v-model="dateFrom"
          type="date"
          class="w-44"
        />
        <UInput
          v-model="dateTo"
          type="date"
          class="w-44"
        />
        <UButton
          v-if="travelFilter !== 'all' || dateFrom || dateTo"
          icon="i-lucide-filter-x"
          variant="ghost"
          color="neutral"
          @click="() => { travelFilter = 'all'; dateFrom = ''; dateTo = ''; }"
        >
          Limpiar
        </UButton>
      </div>

      <!-- Per-travel sections -->
      <template v-for="id in travelerTravelIds" :key="id">
        <template v-if="travelFilter === 'all' || travelFilter === id">
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <h2 class="text-xl font-semibold flex items-center gap-2">
                <UIcon name="i-lucide-map-pin" class="w-5 h-5 text-primary" />
                {{ getTravelName(id) }}
              </h2>
              <div class="flex items-center gap-2">
                <UButton
                  size="sm"
                  variant="ghost"
                  color="neutral"
                  icon="i-lucide-settings"
                  @click="openConfigModal(id)"
                >
                  Configurar cuenta
                </UButton>
                <UButton
                  size="sm"
                  variant="outline"
                  icon="i-lucide-credit-card"
                  @click="goToTravelPayments(id)"
                >
                  Ver pagos del viaje
                </UButton>
              </div>
            </div>

            <!-- Summary card -->
            <PaymentSummaryCard
              :summary="paymentStore.getTravelerPaymentSummary(travelerId, id)"
              :traveler-name="travelerName"
            />

            <!-- Payment history -->
            <UCard>
              <template #header>
                <span class="text-sm font-medium text-muted">Historial de pagos</span>
              </template>
              <div
                v-if="filteredPayments.filter((p: Payment) => p.travelId === id).length === 0"
                class="text-center py-8 text-muted"
              >
                Sin pagos registrados para este viaje
              </div>
              <UTable
                v-else
                :columns="columns"
                :data="filteredPayments.filter((p: Payment) => p.travelId === id)"
              />
            </UCard>
          </div>
        </template>
      </template>

      <!-- Empty state -->
      <EmptyState v-if="travelerTravelIds.length === 0" section="payments" />

      <!-- Account Config Modal -->
      <UModal
        v-model:open="isConfigModalOpen"
        title="Configurar cuenta"
        :description="editingConfigTravelId ? getTravelName(editingConfigTravelId) : ''"
      >
        <template #body>
          <PaymentAccountConfigForm
            v-if="editingConfigTravelId"
            :traveler-id="travelerId"
            :travel-id="editingConfigTravelId"
            :public-prices="editingConfigPublicPrices"
            :config="editingConfig"
            @submit="handleConfigSubmit"
            @cancel="closeConfigModal"
          />
        </template>
      </UModal>

      <!-- Edit Modal -->
      <UModal v-model:open="isEditModalOpen" title="Editar pago">
        <template #body>
          <PaymentForm
            v-if="editingPayment"
            :payment="editingPayment"
            :traveler-id="travelerId"
            :travel-id="editingPayment.travelId"
            :max-amount="editMaxAmount"
            @submit="handleEditSubmit"
            @cancel="closeEditModal"
          />
        </template>
      </UModal>
    </div>
  </LoadState>
</template>
