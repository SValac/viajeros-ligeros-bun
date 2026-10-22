<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';

import { h } from 'vue';

import type { SupplierPaymentKind } from '~/composables/quotation/use-supplier-payments';
import type { SupplierPayment, SupplierPaymentFields } from '~/types/quotation';

import { useSupplierPayments } from '~/composables/quotation/use-supplier-payments';
import { useActionToast } from '~/composables/use-action-toast';
import { useFormModal } from '~/composables/use-form-modal';
import { formatCurrency } from '~/utils/currency';
import { formatShortDate } from '~/utils/format-date';
import { getPaymentTypeLabel } from '~/utils/payment-type';

type Props = {
  kind: SupplierPaymentKind;
  parentId: string;
  subtitle?: string;
};

const { kind, parentId, subtitle } = defineProps<Props>();

const { runWithToast } = useActionToast();
const confirmDelete = useConfirmDelete();
const { payments, paid, pendingBalance, add, update, remove } = useSupplierPayments(kind, () => parentId);

const { isOpen: isFormModalOpen, editing: selectedPayment, openNew: openNewPayment, openEdit: openEditPayment } = useFormModal<SupplierPayment>();

async function handleSubmit(data: SupplierPaymentFields) {
  const editing = selectedPayment.value;
  if (!(await runWithToast(() => (editing ? update(editing.id, data) : add(data)), {
    success: editing ? 'Pago actualizado' : 'Pago registrado',
    error: 'Error',
    errorFallback: editing ? 'No se pudo actualizar el pago' : 'No se pudo registrar el pago',
  }))) {
    return;
  }
  isFormModalOpen.value = false;
  selectedPayment.value = null;
}

async function handleDelete(payment: SupplierPayment) {
  if (!(await confirmDelete({
    title: 'Eliminar pago',
    description: '¿Estás seguro de que deseas eliminar este pago? Esta acción no se puede deshacer.',
  }))) {
    return;
  }

  await runWithToast(() => remove(payment.id), {
    success: { title: 'Pago eliminado', color: 'warning' },
    error: 'Error',
    errorFallback: 'No se pudo eliminar el pago',
  });
}

const columns: TableColumn<SupplierPayment>[] = [
  {
    accessorKey: 'paymentDate',
    header: 'Fecha',
    cell: ({ row }) => formatShortDate(row.original.paymentDate),
  },
  {
    accessorKey: 'concept',
    header: 'Concepto',
    cell: ({ row }) => row.original.concept || '—',
  },
  {
    accessorKey: 'paymentType',
    header: 'Tipo',
    cell: ({ row }) => h(resolveComponent('UBadge'), {
      label: getPaymentTypeLabel(row.original.paymentType),
      color: row.original.paymentType === 'cash' ? 'success' : 'info',
      variant: 'subtle',
    }),
  },
  {
    accessorKey: 'amount',
    header: 'Monto',
    cell: ({ row }) => h('span', { class: 'font-medium' }, formatCurrency(row.original.amount)),
  },
  {
    accessorKey: 'notes',
    header: 'Notas',
    meta: { class: { td: 'text-muted text-xs max-w-32 truncate' } },
    cell: ({ row }) => row.original.notes || '—',
  },
  {
    id: 'actions',
    header: 'Acciones',
    cell: ({ row }) => h('div', { class: 'flex items-center gap-1' }, [
      h(resolveComponent('UButton'), {
        'icon': 'i-lucide-pencil',
        'size': 'xs',
        'variant': 'ghost',
        'color': 'neutral',
        'aria-label': 'Editar pago',
        'onClick': () => openEditPayment(row.original),
      }),
      h(resolveComponent('UButton'), {
        'icon': 'i-lucide-trash-2',
        'size': 'xs',
        'variant': 'ghost',
        'color': 'error',
        'aria-label': 'Eliminar pago',
        'onClick': () => handleDelete(row.original),
      }),
    ]),
  },
];
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h3 class="font-semibold text-lg flex items-center gap-2">
        <UIcon name="i-lucide-receipt" class="w-5 h-5 text-muted" />
        Historial de Pagos
        <span v-if="subtitle" class="text-muted font-normal">— {{ subtitle }}</span>
      </h3>
      <UButton
        icon="i-lucide-plus"
        size="sm"
        label="Registrar pago"
        :disabled="pendingBalance <= 0"
        @click="openNewPayment"
      />
    </div>

    <!-- Payments table -->
    <UTable
      v-if="payments.length > 0"
      :data="payments"
      :columns="columns"
    />

    <!-- Empty state -->
    <EmptyState
      v-else
      section="payments"
      compact
      :actions="[{ label: 'Registrar pago', icon: 'i-lucide-plus', size: 'sm', variant: 'outline', onClick: openNewPayment }]"
    />

    <!-- Totals -->
    <div class="pt-2 border-t border-default space-y-1">
      <div class="flex items-center justify-between text-sm">
        <span class="text-muted">Total pagado</span>
        <span class="font-semibold">{{ formatCurrency(paid) }}</span>
      </div>
      <div class="flex items-center justify-between text-sm">
        <span class="text-muted">Saldo pendiente</span>
        <span class="font-semibold" :class="pendingBalance > 0 ? 'text-warning' : 'text-success'">
          {{ formatCurrency(pendingBalance) }}
        </span>
      </div>
    </div>
  </div>

  <!-- Modal: payment form -->
  <UModal
    v-model:open="isFormModalOpen"
    :title="selectedPayment ? 'Editar Pago' : 'Registrar Pago'"
    class="sm:max-w-lg"
    :description="selectedPayment ? 'Modifica los datos del pago registrado' : 'Ingresa los datos del nuevo pago'"
  >
    <template #body>
      <QuotationPaymentForm
        :max-amount="selectedPayment ? selectedPayment.amount + pendingBalance : pendingBalance"
        :payment="selectedPayment"
        @submit="handleSubmit"
        @cancel="isFormModalOpen = false"
      />
    </template>
  </UModal>
</template>
