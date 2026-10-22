<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';

import { h } from 'vue';

import type { PaymentStatus } from '~/types/payment';
import type { ProviderPriceAdjustmentDraft, QuotationProvider, QuotationProviderFormData } from '~/types/quotation';

import { useQuotationContext } from '~/composables/quotation/use-quotation-context';
import { calculateProviderQuotedCost, countServiceTakers, getPriceAdjustmentError, isPerPersonProvider } from '~/composables/quotation/use-quotation-domain';
import { paymentMethodColumn, useSupplierTable } from '~/composables/quotation/use-supplier-table';
import { useActionToast } from '~/composables/use-action-toast';
import { useFormModal } from '~/composables/use-form-modal';
import { actionsColumn, deleteAction } from '~/utils/actions-column';
import { formatCurrency } from '~/utils/currency';
import { CONFIRMED_QUOTATION_EMPTY_DESCRIPTION } from '~/utils/empty-states';
import { toErrorMessage } from '~/utils/error-message';
import { getPaymentStatusFilterOptions } from '~/utils/payment-status';
import { PAYMENT_TYPE_OPTIONS } from '~/utils/payment-type';
import { pluralize } from '~/utils/pluralize';

type Props = {
  quotationId: string;
  readonly?: boolean;
};

const { quotationId, readonly = false } = defineProps<Props>();

const quotationStore = useQuotationStore();
const providerStore = useProviderStore();
const toast = useToast();
const { runWithToast } = useActionToast();
const confirmDelete = useConfirmDelete();

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
const { isOpen: isProviderFormOpen, editing: selectedProvider, openNew: openNewProvider, openEdit: openEditProvider } = useFormModal<QuotationProvider>();
const isHistoryOpen = shallowRef(false);
const historyProviderId = shallowRef<string>('');
const historyProviderName = shallowRef<string>('');
const isAdjustmentsOpen = shallowRef(false);
const adjustmentsProvider = shallowRef<QuotationProvider | null>(null);
const adjustmentsDraft = ref<ProviderPriceAdjustmentDraft[]>([]);
const invalidAdjustments = computed(() => adjustmentsDraft.value.some(a => getPriceAdjustmentError(a) !== null));
const isCourtesyOpen = shallowRef(false);
const courtesyProvider = shallowRef<QuotationProvider | null>(null);

// The quotation's travel, to link to its per-person services tab.
const { travelId, coordinatorCount } = useQuotationContext(() => quotationId);

// Filter options
const paymentStatusOptions = getPaymentStatusFilterOptions('supplier');

const confirmedOptions = [
  { label: 'Todos', value: 'all' },
  { label: 'Sí', value: 'yes' },
  { label: 'No', value: 'no' },
];

const paymentMethodOptions = [{ label: 'Todos', value: 'all' }, ...PAYMENT_TYPE_OPTIONS];

function isProviderInactive(providerId: string): boolean {
  const provider = providerStore.getProviderById(providerId);
  return provider ? !provider.active : false;
}

// Cost with a full bus: for a per-person service, cost × sellable seats.
function getQuotedCost(provider: QuotationProvider): number {
  return calculateProviderQuotedCost(provider, quotationStore.getSellableSeats(provider.quotationId, coordinatorCount.value));
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
  const providerId = adjustmentsProvider.value.id;
  if (!(await runWithToast(() => quotationStore.saveProviderAdjustments(providerId, adjustmentsDraft.value), {
    error: 'Error',
    errorFallback: 'No se pudieron guardar los precios por tipo',
  }))) {
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
  const providerId = courtesyProvider.value.id;
  if (!(await runWithToast(() => quotationStore.updateProviderCourtesy(providerId, coordinatorsCourtesy), {
    error: 'Error',
    errorFallback: 'No se pudo actualizar la cortesía',
  }))) {
    return;
  }
  toast.add({ title: 'Cortesía actualizada', color: 'success' });
  isCourtesyOpen.value = false;
  courtesyProvider.value = null;
}

function openHistory(provider: QuotationProvider) {
  historyProviderId.value = provider.id;
  historyProviderName.value = providerStore.getProviderName(provider.providerId);
  isHistoryOpen.value = true;
}

async function handleProviderSubmit(data: QuotationProviderFormData, adjustments: ProviderPriceAdjustmentDraft[]) {
  const editing = selectedProvider.value;
  let saved: QuotationProvider;
  try {
    saved = editing
      ? await quotationStore.updateQuotationProvider(editing.id, data)
      : await quotationStore.addQuotationProvider(data);
  }
  catch (e) {
    toast.add({ title: editing ? 'No se pudo actualizar el proveedor' : 'No se pudo agregar el proveedor', description: toErrorMessage(e, 'Intenta de nuevo'), color: 'error' });
    return;
  }
  toast.add({ title: editing ? 'Proveedor actualizado' : 'Proveedor agregado', color: 'success' });

  // Adjustments go separately; for a total cost any existing ones are deleted.
  if (adjustments.length > 0 || quotationStore.getAdjustmentsByProvider(saved.id).length > 0) {
    await runWithToast(() => quotationStore.saveProviderAdjustments(saved.id, adjustments), {
      error: 'No se guardaron los precios por tipo',
    });
  }
  isProviderFormOpen.value = false;
  selectedProvider.value = null;
}

async function handleToggleConfirmed(provider: QuotationProvider) {
  if (readonly)
    return;
  await runWithToast(() => quotationStore.toggleProviderConfirmed(provider.id), {
    error: 'No se pudo actualizar el proveedor',
  });
}

async function handleDelete(provider: QuotationProvider) {
  if (!(await confirmDelete({
    title: 'Eliminar proveedor',
    description: '¿Estás seguro? Se eliminarán también todos los pagos asociados a este proveedor.',
  }))) {
    return;
  }

  await runWithToast(() => quotationStore.deleteQuotationProvider(provider.id), {
    success: { title: 'Proveedor eliminado', color: 'warning' },
    error: 'No se pudo eliminar el proveedor',
  });
}

const supplierTable = useSupplierTable<QuotationProvider>('provider');

function getProviderActions(provider: QuotationProvider) {
  const paymentActions = [
    ...supplierTable.paymentActions(provider, openHistory),
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
    supplierTable.confirmAction(provider, handleToggleConfirmed),
  ];

  const destructiveActions = [
    deleteAction(() => handleDelete(provider)),
  ];

  return [paymentActions, writeActions, destructiveActions];
}

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
      h('span', { class: 'font-medium' }, providerStore.getProviderName(row.original.providerId)),
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
      return h(resolveComponent('QuotationSplitTypeBadge'), { splitType: row.original.splitType });
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
            }, `${pluralize(adjustmentCount, 'precio')} por tipo`)
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
            }, () => `${countServiceTakers(provider)} lo toman`)
          : null,
      ]);
    },
  },
  {
    id: 'costPerPerson',
    header: 'Costo/persona',
    cell: ({ row }) => formatCurrency(quotationStore.getProviderCostPerPerson(row.original.id, coordinatorCount.value)),
  },
  supplierTable.paidColumn,
  supplierTable.pendingColumn,
  paymentMethodColumn(),
  supplierTable.statusColumn,
  supplierTable.confirmedColumn,
  actionsColumn(getProviderActions, { size: 'xs' }),
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
      :description="readonly ? CONFIRMED_QUOTATION_EMPTY_DESCRIPTION : undefined"
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
    :description="adjustmentsProvider ? `${providerStore.getProviderName(adjustmentsProvider.providerId)} · ${adjustmentsProvider.serviceDescription} · base ${formatCurrency(adjustmentsProvider.unitCost ?? 0)}` : undefined"
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
</template>
