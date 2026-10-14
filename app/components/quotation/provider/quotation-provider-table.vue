<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';

import { h } from 'vue';

import type { PaymentStatus } from '~/types/payment';
import type { ProviderPriceAdjustmentDraft, QuotationProvider, QuotationProviderFormData } from '~/types/quotation';

import { calculateProviderQuotedCost, getPriceAdjustmentError, isPerPersonProvider } from '~/composables/quotation/use-quotation-domain';
import { useSupplierPaymentColumns } from '~/composables/quotation/use-supplier-payment-columns';
import { useTravelCoordinatorCount } from '~/composables/travels/use-travel-coordinator-count';
import { formatCurrency } from '~/utils/currency';

type Props = {
  quotationId: string;
  readonly?: boolean;
};

const { quotationId, readonly = false } = defineProps<Props>();

const quotationStore = useQuotationStore();
const providerStore = useProviderStore();
const toast = useToast();

// Derived data
const providers = computed(() => quotationStore.filteredProviders(quotationId));

// Filter state (local — synced to store)
const filterPaymentStatus = shallowRef<PaymentStatus | 'all'>('all');
const filterConfirmed = shallowRef<'all' | 'yes' | 'no'>('all');
const filterPaymentMethod = shallowRef<'all' | 'cash' | 'transfer'>('all');

watch([filterPaymentStatus, filterConfirmed, filterPaymentMethod], () => {
  quotationStore.setFilters({
    paymentStatus: filterPaymentStatus.value,
    confirmed: filterConfirmed.value === 'all'
      ? 'all'
      : filterConfirmed.value === 'yes',
    paymentMethod: filterPaymentMethod.value,
  });
});

// Modal state
const isProviderFormOpen = shallowRef(false);
const selectedProvider = shallowRef<QuotationProvider | null>(null);
const isHistoryOpen = shallowRef(false);
const historyProviderId = shallowRef<string>('');
const historyProviderName = shallowRef<string>('');
const isDeleteModalOpen = shallowRef(false);
const providerToDelete = shallowRef<QuotationProvider | null>(null);
const isAdjustmentsOpen = shallowRef(false);
const adjustmentsProvider = shallowRef<QuotationProvider | null>(null);
const adjustmentsDraft = ref<ProviderPriceAdjustmentDraft[]>([]);
const invalidAdjustments = computed(() => adjustmentsDraft.value.some(a => getPriceAdjustmentError(a) !== null));
const isCourtesyOpen = shallowRef(false);
const courtesyProvider = shallowRef<QuotationProvider | null>(null);

// The quotation's travel, to link to its per-person services tab.
const travelId = computed(() => quotationStore.quotations.find(c => c.id === quotationId)?.travelId);
const coordinatorCount = useTravelCoordinatorCount(travelId);

// Filter options
const paymentStatusOptions = [
  { label: 'Todos', value: 'all' },
  { label: 'Pendiente', value: 'pending' },
  { label: 'Anticipo', value: 'partial' },
  { label: 'Liquidado', value: 'paid' },
];

const confirmedOptions = [
  { label: 'Todos', value: 'all' },
  { label: 'Sí', value: 'yes' },
  { label: 'No', value: 'no' },
];

const paymentMethodOptions = [
  { label: 'Todos', value: 'all' },
  { label: 'Efectivo', value: 'cash' },
  { label: 'Transferencia', value: 'transfer' },
];

function getProviderName(providerId: string): string {
  return providerStore.getProviderById(providerId)?.name ?? 'Proveedor desconocido';
}

function isProviderInactive(providerId: string): boolean {
  const provider = providerStore.getProviderById(providerId);
  return provider ? !provider.active : false;
}

// Cost with a full bus: for a per-person service, cost × sellable seats.
function getQuotedCost(provider: QuotationProvider): number {
  return calculateProviderQuotedCost(provider, quotationStore.getSellableSeats(provider.quotationId, coordinatorCount.value));
}

// How many travelers count for the payment of a per-person service.
function getTakersCount(provider: QuotationProvider): number {
  return provider.unitCost ? Math.round(provider.payableCost / provider.unitCost) : 0;
}

function openAdjustments(provider: QuotationProvider) {
  adjustmentsProvider.value = provider;
  adjustmentsDraft.value = quotationStore.getAdjustmentsByProvider(provider.id)
    .map(({ id, label, kind, mode, value }) => ({ id, label, kind, mode, value }));
  isAdjustmentsOpen.value = true;
}

function closeAdjustments() {
  isAdjustmentsOpen.value = false;
}

async function handleAdjustmentsSave() {
  if (!adjustmentsProvider.value || invalidAdjustments.value)
    return;
  const error = await quotationStore.saveProviderAdjustments(adjustmentsProvider.value.id, adjustmentsDraft.value);
  if (error) {
    toast.add({ title: 'Error', description: error, color: 'error' });
    return;
  }
  toast.add({ title: 'Precios por tipo guardados', color: 'success' });
  isAdjustmentsOpen.value = false;
  adjustmentsProvider.value = null;
}

function openCourtesy(provider: QuotationProvider) {
  courtesyProvider.value = provider;
  isCourtesyOpen.value = true;
}

async function handleCourtesySubmit(coordinatorsCourtesy: boolean) {
  if (!courtesyProvider.value)
    return;
  const result = await quotationStore.updateProviderCourtesy(courtesyProvider.value.id, coordinatorsCourtesy);
  if ('error' in result) {
    toast.add({ title: 'Error', description: result.error, color: 'error' });
    return;
  }
  toast.add({ title: 'Cortesía actualizada', color: 'success' });
  isCourtesyOpen.value = false;
  courtesyProvider.value = null;
}

function openNewProvider() {
  selectedProvider.value = null;
  isProviderFormOpen.value = true;
}

function openEditProvider(provider: QuotationProvider) {
  selectedProvider.value = provider;
  isProviderFormOpen.value = true;
}

function openHistory(provider: QuotationProvider) {
  historyProviderId.value = provider.id;
  historyProviderName.value = getProviderName(provider.providerId);
  isHistoryOpen.value = true;
}

function openRecordPayment(provider: QuotationProvider) {
  historyProviderId.value = provider.id;
  historyProviderName.value = getProviderName(provider.providerId);
  isHistoryOpen.value = true;
}

function openDeleteConfirm(provider: QuotationProvider) {
  providerToDelete.value = provider;
  isDeleteModalOpen.value = true;
}

function closeDeleteModal() {
  isDeleteModalOpen.value = false;
}

async function handleProviderSubmit(data: QuotationProviderFormData, adjustments: ProviderPriceAdjustmentDraft[]) {
  let saved: QuotationProvider | undefined;
  if (selectedProvider.value) {
    saved = await quotationStore.updateQuotationProvider(selectedProvider.value.id, data);
    if (saved) {
      toast.add({ title: 'Proveedor actualizado', color: 'success' });
    }
    else {
      toast.add({ title: 'No se pudo actualizar el proveedor', description: quotationStore.error ?? undefined, color: 'error' });
      return;
    }
  }
  else {
    const result = await quotationStore.addQuotationProvider(data);
    if ('error' in result) {
      toast.add({ title: 'Error', description: result.error, color: 'error' });
    }
    else {
      saved = result;
      toast.add({ title: 'Proveedor agregado', color: 'success' });
    }
  }
  // Adjustments go separately; for a total cost any existing ones are deleted.
  if (saved && (adjustments.length > 0 || quotationStore.getAdjustmentsByProvider(saved.id).length > 0)) {
    const error = await quotationStore.saveProviderAdjustments(saved.id, adjustments);
    if (error)
      toast.add({ title: 'No se guardaron los precios por tipo', description: error, color: 'error' });
  }
  isProviderFormOpen.value = false;
  selectedProvider.value = null;
}

async function handleToggleConfirmed(provider: QuotationProvider) {
  if (readonly)
    return;
  await quotationStore.toggleProviderConfirmed(provider.id);
}

async function confirmDeleteProvider() {
  if (!providerToDelete.value)
    return;
  await quotationStore.deleteQuotationProvider(providerToDelete.value.id);
  toast.add({ title: 'Proveedor eliminado', color: 'warning' });
  isDeleteModalOpen.value = false;
  providerToDelete.value = null;
}

function getProviderActions(provider: QuotationProvider) {
  // Payments go on after the quotation is confirmed; only its structure is locked.
  const paymentActions = [
    {
      label: 'Ver historial de pagos',
      icon: 'i-lucide-receipt',
      onSelect: () => openHistory(provider),
    },
    {
      label: 'Registrar pago',
      icon: 'i-lucide-banknote',
      disabled: quotationStore.getPendingBalanceByProvider(provider.id) <= 0,
      onSelect: () => openRecordPayment(provider),
    },
    // The courtesy doesn't change the seat price, so it's also allowed on a
    // confirmed quotation.
    ...(isPerPersonProvider(provider)
      ? [{
          label: 'Precios por tipo de persona',
          icon: 'i-lucide-tags',
          onSelect: () => openAdjustments(provider),
        }, {
          label: 'Cortesía para coordinadores',
          icon: 'i-lucide-gift',
          onSelect: () => openCourtesy(provider),
        }]
      : []),
  ];

  if (readonly)
    return [paymentActions];

  const writeActions = [
    {
      label: 'Editar',
      icon: 'i-lucide-pencil',
      onSelect: () => openEditProvider(provider),
    },
    {
      label: provider.confirmed ? 'Marcar sin confirmar' : 'Marcar como confirmado',
      icon: provider.confirmed ? 'i-lucide-x-circle' : 'i-lucide-check-circle',
      onSelect: () => handleToggleConfirmed(provider),
    },
  ];

  const destructiveActions = [
    {
      label: 'Eliminar',
      icon: 'i-lucide-trash-2',
      color: 'error' as const,
      onSelect: () => openDeleteConfirm(provider),
    },
  ];

  return [paymentActions, writeActions, destructiveActions];
}

const supplierColumns = useSupplierPaymentColumns<QuotationProvider>('provider');
const columns: TableColumn<QuotationProvider>[] = [
  {
    accessorKey: 'providerId',
    header: 'Proveedor',
    cell: ({ row }) => h('div', { class: 'flex items-center gap-1.5' }, [
      isProviderInactive(row.original.providerId)
        ? h(resolveComponent('UIcon'), {
            name: 'i-lucide-triangle-alert',
            class: 'w-4 h-4 text-warning shrink-0',
            title: 'Proveedor inactivo en el catálogo',
          })
        : null,
      h('span', { class: 'font-medium' }, getProviderName(row.original.providerId)),
    ]),
  },
  {
    accessorKey: 'serviceDescription',
    header: 'Servicio',
    meta: { class: { td: 'max-w-40' } },
    cell: ({ row }) => h('div', [
      h('span', { class: 'truncate block' }, row.original.serviceDescription),
      row.original.coordinatorsCourtesy
        ? h(resolveComponent('UBadge'), {
            label: 'Cortesía coord.',
            icon: 'i-lucide-gift',
            color: 'info',
            variant: 'subtle',
            class: 'mt-1',
          })
        : null,
    ]),
  },
  {
    id: 'split',
    header: 'División',
    cell: ({ row }) => {
      if (isPerPersonProvider(row.original))
        return h(resolveComponent('UBadge'), { label: 'Por persona', color: 'primary', variant: 'subtle' });
      const isMinimum = (row.original.splitType ?? 'minimum') === 'minimum';
      return h(resolveComponent('UBadge'), {
        label: isMinimum ? 'Asientos min.' : 'Asientos vend.',
        color: isMinimum ? 'info' : 'neutral',
        variant: 'subtle',
      });
    },
  },
  {
    // For a per-person service, with a full bus
    id: 'quotedCost',
    header: 'Costo Total',
    cell: ({ row }) => {
      const provider = row.original;
      const perPerson = isPerPersonProvider(provider);
      const adjustmentCount = perPerson ? quotationStore.getAdjustmentsByProvider(provider.id).length : 0;
      return h('div', [
        h('p', { class: 'font-medium' }, formatCurrency(getQuotedCost(provider))),
        perPerson
          ? h('p', { class: 'text-xs text-muted whitespace-nowrap' }, `${formatCurrency(provider.unitCost ?? 0)} × ${quotationStore.getSellableSeats(provider.quotationId, coordinatorCount.value)} asientos`)
          : null,
        adjustmentCount > 0
          ? h('button', {
              type: 'button',
              class: 'text-xs text-primary hover:underline whitespace-nowrap',
              onClick: () => openAdjustments(provider),
            }, `${adjustmentCount} precio${adjustmentCount === 1 ? '' : 's'} por tipo`)
          : null,
      ]);
    },
  },
  {
    // For an optional one, only for the travelers who take it
    accessorKey: 'payableCost',
    header: 'A pagar',
    cell: ({ row }) => {
      const provider = row.original;
      return h('div', [
        h('p', { class: 'font-medium' }, formatCurrency(provider.payableCost)),
        isPerPersonProvider(provider) && travelId.value
          ? h(resolveComponent('ULink'), {
              to: { name: 'travel-optional-services', params: { id: travelId.value } },
              class: 'text-xs text-primary whitespace-nowrap',
            }, () => `${getTakersCount(provider)} lo toman`)
          : null,
      ]);
    },
  },
  {
    id: 'costPerPerson',
    header: 'Costo/persona',
    cell: ({ row }) => formatCurrency(quotationStore.getProviderCostPerPerson(row.original.id, coordinatorCount.value)),
  },
  supplierColumns.paidColumn,
  supplierColumns.pendingColumn,
  {
    accessorKey: 'paymentMethod',
    header: 'Método',
    cell: ({ row }) => h(resolveComponent('UBadge'), {
      label: row.original.paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia',
      color: 'neutral',
      variant: 'subtle',
    }),
  },
  supplierColumns.statusColumn,
  {
    accessorKey: 'confirmed',
    header: 'Confirmado',
    cell: ({ row }) => h(resolveComponent('UBadge'), {
      label: row.original.confirmed ? 'Sí' : 'No',
      color: row.original.confirmed ? 'success' : 'neutral',
      variant: 'subtle',
    }),
  },
  {
    id: 'actions',
    header: 'Acciones',
    cell: ({ row }) => h(resolveComponent('UDropdownMenu'), {
      items: getProviderActions(row.original),
    }, () => h(resolveComponent('UButton'), {
      'icon': 'i-lucide-more-vertical',
      'variant': 'ghost',
      'color': 'neutral',
      'size': 'xs',
      'aria-label': 'Acciones del proveedor',
    })),
  },
];
</script>

<template>
  <div class="space-y-4">
    <!-- Filter bar -->
    <div class="flex flex-wrap gap-3 items-end">
      <div class="flex-1 min-w-32">
        <p class="text-xs text-muted mb-1">
          Estado de pago
        </p>
        <USelect
          v-model="filterPaymentStatus"
          :items="paymentStatusOptions"
          size="sm"
        />
      </div>
      <div class="flex-1 min-w-28">
        <p class="text-xs text-muted mb-1">
          Confirmado
        </p>
        <USelect
          v-model="filterConfirmed"
          :items="confirmedOptions"
          size="sm"
        />
      </div>
      <div class="flex-1 min-w-32">
        <p class="text-xs text-muted mb-1">
          Método de pago
        </p>
        <USelect
          v-model="filterPaymentMethod"
          :items="paymentMethodOptions"
          size="sm"
        />
      </div>
      <UButton
        v-if="!readonly"
        icon="i-lucide-plus"
        label="Agregar proveedor"
        @click="openNewProvider"
      />
    </div>

    <!-- Table -->
    <UTable
      v-if="providers.length > 0"
      :data="providers"
      :columns="columns"
    />

    <!-- Empty state -->
    <EmptyState
      v-else
      section="services"
      :actions="readonly ? undefined : [{ label: 'Agregar proveedor', icon: 'i-lucide-plus', onClick: openNewProvider }]"
    />
  </div>

  <!-- Modal: provider form -->
  <UModal
    v-model:open="isProviderFormOpen"
    :title="selectedProvider ? 'Editar Proveedor' : 'Agregar Proveedor'"
    :description="selectedProvider ? 'Modifica los datos del proveedor en la cotización' : 'Agrega un nuevo proveedor de servicio a la cotización'"
    class="sm:max-w-2xl"
  >
    <template #body>
      <QuotationProviderForm
        :quotation-id="quotationId"
        :quotation-provider="selectedProvider"
        @submit="handleProviderSubmit"
        @cancel="isProviderFormOpen = false"
      />
    </template>
  </UModal>

  <!-- Modal: prices by type of person -->
  <UModal
    v-model:open="isAdjustmentsOpen"
    title="Precios por tipo de persona"
    :description="adjustmentsProvider ? `${getProviderName(adjustmentsProvider.providerId)} · ${adjustmentsProvider.serviceDescription} · base ${formatCurrency(adjustmentsProvider.unitCost ?? 0)}` : undefined"
    class="sm:max-w-2xl"
  >
    <template #body>
      <QuotationProviderAdjustmentsEditor
        v-if="adjustmentsProvider"
        v-model="adjustmentsDraft"
        :unit-cost="adjustmentsProvider.unitCost"
      />
    </template>
    <template #footer>
      <div class="flex justify-end gap-3 w-full">
        <UButton
          variant="ghost"
          color="neutral"
          label="Cancelar"
          @click="closeAdjustments"
        />
        <UButton
          label="Guardar"
          :disabled="invalidAdjustments"
          @click="handleAdjustmentsSave"
        />
      </div>
    </template>
  </UModal>

  <!-- Modal: courtesy for coordinators -->
  <UModal
    v-model:open="isCourtesyOpen"
    title="Cortesía para coordinadores"
    description="Define si los coordinadores cuentan para el pago de este servicio"
  >
    <template #body>
      <QuotationProviderCourtesyForm
        v-if="courtesyProvider"
        :provider="courtesyProvider"
        @submit="handleCourtesySubmit"
        @cancel="isCourtesyOpen = false"
      />
    </template>
  </UModal>

  <!-- Drawer/modal: payment history -->
  <USlideover
    v-model:open="isHistoryOpen"
    :title="`Pagos — ${historyProviderName}`"
    description="Registro de pagos realizados al proveedor"
    side="right"
  >
    <template #body>
      <div class="p-4">
        <QuotationPaymentHistory
          kind="provider"
          :parent-id="historyProviderId"
          :subtitle="historyProviderName"
        />
      </div>
    </template>
  </USlideover>

  <!-- Modal: confirm deletion -->
  <UModal
    v-model:open="isDeleteModalOpen"
    title="Eliminar Proveedor"
    description="¿Estás seguro? Se eliminarán también todos los pagos asociados a este proveedor."
  >
    <template #footer>
      <div class="flex justify-end gap-3">
        <UButton
          variant="ghost"
          color="neutral"
          label="Cancelar"
          @click="closeDeleteModal"
        />
        <UButton
          color="error"
          label="Eliminar"
          @click="confirmDeleteProvider"
        />
      </div>
    </template>
  </UModal>
</template>
