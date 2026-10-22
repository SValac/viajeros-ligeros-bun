<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';

import { h } from 'vue';

import type { QuotationBus } from '~/types/quotation';

import { useQuotationContext } from '~/composables/quotation/use-quotation-context';
import { paymentMethodColumn, useSupplierTable } from '~/composables/quotation/use-supplier-table';
import { actionsColumn, deleteAction } from '~/utils/actions-column';
import { formatCurrency } from '~/utils/currency';

type Props = {
  quotationId: string;
  readonly?: boolean;
};

type Emits = {
  (e: 'add'): void;
};

const { quotationId, readonly = false } = defineProps<Props>();

defineEmits<Emits>();

const quotationStore = useQuotationStore();
const { coordinatorCount } = useQuotationContext(() => quotationId);
const providerStore = useProviderStore();
const toast = useToast();
const confirmDelete = useConfirmDelete();

const buses = computed(() => quotationStore.getBusesByQuotation(quotationId));

// Modal state
const isDetailsFormOpen = shallowRef(false);
const isHistoryOpen = shallowRef(false);
const selectedBus = shallowRef<QuotationBus | null>(null);

function openHistory(bus: QuotationBus) {
  selectedBus.value = bus;
  isHistoryOpen.value = true;
}

function openDetails(bus: QuotationBus) {
  selectedBus.value = bus;
  isDetailsFormOpen.value = true;
}

async function handleToggleConfirmed(bus: QuotationBus) {
  if (readonly)
    return;
  await quotationStore.updateBusQuotation(bus.id, { confirmed: !bus.confirmed });
}

async function handleDelete(bus: QuotationBus) {
  if (!(await confirmDelete({
    title: 'Eliminar autobús',
    description: '¿Estás seguro? Se eliminarán también todos los pagos asociados.',
  }))) {
    return;
  }

  await quotationStore.deleteBusQuotation(bus.id);
  toast.add({ title: 'Autobús eliminado', color: 'warning' });
}

const supplierTable = useSupplierTable<QuotationBus>('bus');

function getBusActions(bus: QuotationBus) {
  const paymentActions = supplierTable.paymentActions(bus, openHistory);

  if (readonly)
    return [paymentActions];

  return [
    paymentActions,
    [
      {
        label: 'Editar detalles',
        icon: 'i-lucide-pencil',
        onSelect: () => openDetails(bus),
      },
      supplierTable.confirmAction(bus, handleToggleConfirmed),
    ],
    [
      deleteAction(() => handleDelete(bus)),
    ],
  ];
}

const columns: TableColumn<QuotationBus>[] = [
  {
    accessorKey: 'providerId',
    header: 'Agencia',
    cell: ({ row }) => h('span', { class: 'font-medium' }, providerStore.getProviderName(row.original.providerId)),
  },
  {
    accessorKey: 'unitNumber',
    header: 'Unidad',
    cell: ({ row }) => h('span', { class: 'font-mono' }, row.original.unitNumber),
  },
  {
    accessorKey: 'capacity',
    header: 'Asientos',
  },
  {
    id: 'split',
    header: 'División',
    cell: ({ row }) => h(resolveComponent('QuotationSplitTypeBadge'), { splitType: row.original.splitType }),
  },
  {
    accessorKey: 'totalCost',
    header: 'Costo Total',
    cell: ({ row }) => h('span', { class: 'font-medium' }, formatCurrency(row.original.totalCost ?? 0)),
  },
  {
    id: 'costPerPerson',
    header: 'Costo/persona',
    cell: ({ row }) => formatCurrency(quotationStore.getBusCostPerPerson(row.original.id, coordinatorCount.value)),
  },
  supplierTable.paidColumn,
  supplierTable.pendingColumn,
  paymentMethodColumn(),
  supplierTable.statusColumn,
  supplierTable.confirmedColumn,
  actionsColumn(getBusActions, { size: 'xs' }),
];
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between w-full">
        <h2 class="font-semibold flex items-center gap-2">
          <UIcon name="i-lucide-bus" class="w-5 h-5 text-muted" />
          Autobuses Apartados
        </h2>
        <UButton
          v-if="!readonly"
          icon="i-lucide-plus"
          size="xs"
          label="Agregar Autobús"
          @click="$emit('add')"
        />
      </div>
    </template>

    <!-- Table -->
    <UTable
      v-if="buses.length > 0"
      :data="buses"
      :columns="columns"
    />

    <!-- Empty state -->
    <EmptyState
      v-else
      section="buses"
      :actions="readonly ? undefined : [{ label: 'Agregar autobús', icon: 'i-lucide-plus', onClick: () => $emit('add') }]"
    />
  </UCard>

  <!-- Slideover: payment history -->
  <USlideover
    v-model:open="isHistoryOpen"
    :title="selectedBus ? `Pagos — ${selectedBus.unitNumber}` : 'Historial de Pagos'"
    description="Registro de pagos realizados a la agencia"
    side="right"
  >
    <template #body>
      <div class="p-4">
        <QuotationPaymentHistory
          v-if="selectedBus"
          kind="bus"
          :parent-id="selectedBus.id"
          :subtitle="selectedBus.unitNumber"
        />
      </div>
    </template>
  </USlideover>

  <!-- Modal: edit bus (same form as adding) -->
  <QuotationBusForm
    v-model:open="isDetailsFormOpen"
    :quotation-id="quotationId"
    :bus="selectedBus"
  />
</template>
