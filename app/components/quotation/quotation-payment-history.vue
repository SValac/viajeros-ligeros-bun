<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';

import { h } from 'vue';

import type { SupplierPaymentKind } from '~/composables/quotation/use-supplier-payments';
import type { SupplierPayment, SupplierPaymentFields } from '~/types/quotation';

import { useSupplierPayments } from '~/composables/quotation/use-supplier-payments';
import { formatCurrency } from '~/utils/currency';
import { parseDisplayDate } from '~/utils/format-date';
import { getPaymentTypeLabel } from '~/utils/payment-type';

type Props = {
  kind: SupplierPaymentKind;
  parentId: string;
  subtitle?: string;
};

const { kind, parentId, subtitle } = defineProps<Props>();

const toast = useToast();
const { payments, paid, pendingBalance, add, update, remove } = useSupplierPayments(kind, () => parentId);

const isFormModalOpen = shallowRef(false);
const selectedPayment = shallowRef<SupplierPayment | null>(null);
const isDeleteModalOpen = shallowRef(false);
const paymentToDelete = shallowRef<SupplierPayment | null>(null);

function formatDate(dateString: string): string {
  // Date without time (`YYYY-MM-DD`): with `new Date()` it would show a day earlier in Mexico
  return parseDisplayDate(dateString).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function openNewPayment() {
  selectedPayment.value = null;
  isFormModalOpen.value = true;
}

function openEditPayment(payment: SupplierPayment) {
  selectedPayment.value = payment;
  isFormModalOpen.value = true;
}

function openDeleteConfirm(payment: SupplierPayment) {
  paymentToDelete.value = payment;
  isDeleteModalOpen.value = true;
}

function closeDeleteModal() {
  isDeleteModalOpen.value = false;
}

async function handleSubmit(data: SupplierPaymentFields) {
  if (selectedPayment.value) {
    const result = await update(selectedPayment.value.id, data);
    if (result) {
      toast.add({ title: 'Pago actualizado', color: 'success' });
    }
  }
  else {
    const result = await add(data);
    if ('error' in result) {
      toast.add({ title: 'Error', description: result.error, color: 'error' });
    }
    else {
      toast.add({ title: 'Pago registrado', color: 'success' });
    }
  }
  isFormModalOpen.value = false;
  selectedPayment.value = null;
}

async function confirmDelete() {
  if (!paymentToDelete.value)
    return;
  await remove(paymentToDelete.value.id);
  toast.add({ title: 'Pago eliminado', color: 'warning' });
  isDeleteModalOpen.value = false;
  paymentToDelete.value = null;
}

const columns: TableColumn<SupplierPayment>[] = [
  {
    accessorKey: 'paymentDate',
    header: 'Fecha',
    cell: ({ row }) => formatDate(row.original.paymentDate),
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
        'onClick': () => openDeleteConfirm(row.original),
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

  <!-- Modal: confirm deletion -->
  <UModal
    v-model:open="isDeleteModalOpen"
    title="Eliminar Pago"
    description="¿Estás seguro de que deseas eliminar este pago? Esta acción no se puede deshacer."
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
