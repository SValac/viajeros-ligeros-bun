<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';

import { h } from 'vue';

import type { PaymentStatus } from '~/types/payment';
import type { QuotationBus } from '~/types/quotation';

import { useTravelCoordinatorCount } from '~/composables/travels/use-travel-coordinator-count';
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
const travelId = computed(() => quotationStore.quotations.find(c => c.id === quotationId)?.travelId);
const coordinatorCount = useTravelCoordinatorCount(travelId);
const providerStore = useProviderStore();
const toast = useToast();

const buses = computed(() => quotationStore.getBusesByQuotation(quotationId));

// Modal state
const isDetailsFormOpen = shallowRef(false);
const isHistoryOpen = shallowRef(false);
const isDeleteModalOpen = shallowRef(false);
const selectedBus = shallowRef<QuotationBus | null>(null);

function getAgencyName(providerId: string): string {
  return providerStore.getProviderById(providerId)?.name ?? 'Desconocido';
}

function getPaymentStatusColor(status: PaymentStatus): 'warning' | 'info' | 'success' {
  if (status === 'pending')
    return 'warning';
  if (status === 'partial')
    return 'info';
  return 'success';
}

function getPaymentStatusLabel(status: PaymentStatus): string {
  if (status === 'pending')
    return 'Pendiente';
  if (status === 'partial')
    return 'Anticipo';
  return 'Liquidado';
}

function openHistory(bus: QuotationBus) {
  selectedBus.value = bus;
  isHistoryOpen.value = true;
}

function openDetails(bus: QuotationBus) {
  selectedBus.value = bus;
  isDetailsFormOpen.value = true;
}

function openDeleteConfirm(bus: QuotationBus) {
  selectedBus.value = bus;
  isDeleteModalOpen.value = true;
}

function closeDeleteModal() {
  isDeleteModalOpen.value = false;
}

async function handleToggleConfirmed(bus: QuotationBus) {
  if (readonly)
    return;
  await quotationStore.updateBusQuotation(bus.id, { confirmed: !bus.confirmed });
}

async function confirmDelete() {
  if (!selectedBus.value)
    return;
  await quotationStore.deleteBusQuotation(selectedBus.value.id);
  toast.add({ title: 'Autobús eliminado', color: 'warning' });
  isDeleteModalOpen.value = false;
  selectedBus.value = null;
}

function getBusActions(bus: QuotationBus) {
  // Payments go on after the quotation is confirmed; only its structure is locked.
  const paymentActions = [
    {
      label: 'Ver historial de pagos',
      icon: 'i-lucide-receipt',
      onSelect: () => openHistory(bus),
    },
    {
      label: 'Registrar pago',
      icon: 'i-lucide-banknote',
      disabled: quotationStore.getPendingBalanceByBus(bus.id) <= 0,
      onSelect: () => openHistory(bus),
    },
  ];

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
      {
        label: bus.confirmed ? 'Marcar sin confirmar' : 'Marcar como confirmado',
        icon: bus.confirmed ? 'i-lucide-x-circle' : 'i-lucide-check-circle',
        onSelect: () => handleToggleConfirmed(bus),
      },
    ],
    [
      {
        label: 'Eliminar',
        icon: 'i-lucide-trash-2',
        color: 'error' as const,
        onSelect: () => openDeleteConfirm(bus),
      },
    ],
  ];
}

const columns: TableColumn<QuotationBus>[] = [
  {
    accessorKey: 'providerId',
    header: 'Agencia',
    cell: ({ row }) => h('span', { class: 'font-medium' }, getAgencyName(row.original.providerId)),
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
    cell: ({ row }) => {
      const isMinimum = (row.original.splitType ?? 'minimum') === 'minimum';
      return h(resolveComponent('UBadge'), {
        label: isMinimum ? 'Asientos min.' : 'Asientos vend.',
        color: isMinimum ? 'info' : 'neutral',
        variant: 'subtle',
      });
    },
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
  {
    id: 'paid',
    header: 'Pagado',
    cell: ({ row }) => formatCurrency(quotationStore.getPaidByBus(row.original.id)),
  },
  {
    id: 'pending',
    header: 'Pendiente',
    cell: ({ row }) => {
      const balance = quotationStore.getPendingBalanceByBus(row.original.id);
      return h('span', { class: balance > 0 ? 'text-warning' : 'text-success' }, formatCurrency(balance));
    },
  },
  {
    accessorKey: 'paymentMethod',
    header: 'Método',
    cell: ({ row }) => h(resolveComponent('UBadge'), {
      label: row.original.paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia',
      color: 'neutral',
      variant: 'subtle',
    }),
  },
  {
    id: 'paymentStatus',
    header: 'Estado Pago',
    cell: ({ row }) => {
      const status = quotationStore.getBusPaymentStatus(row.original.id);
      return h(resolveComponent('UBadge'), {
        label: getPaymentStatusLabel(status),
        color: getPaymentStatusColor(status),
        variant: 'subtle',
      });
    },
  },
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
      items: getBusActions(row.original),
    }, () => h(resolveComponent('UButton'), {
      'icon': 'i-lucide-more-vertical',
      'variant': 'ghost',
      'color': 'neutral',
      'size': 'xs',
      'aria-label': 'Acciones del autobús',
    })),
  },
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

  <!-- Modal: confirm deletion -->
  <UModal
    v-model:open="isDeleteModalOpen"
    title="Eliminar Autobús"
    description="¿Estás seguro? Se eliminarán también todos los pagos asociados."
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
          @click="confirmDelete"
        />
      </div>
    </template>
  </UModal>
</template>
