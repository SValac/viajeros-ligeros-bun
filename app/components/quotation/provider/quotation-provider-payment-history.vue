<script setup lang="ts">
import type { ProviderPayment, ProviderPaymentFormData } from '~/types/quotation';

import { formatCurrency } from '~/utils/currency';
import { parseDisplayDate } from '~/utils/format-date';

type Props = {
  quotationProviderId: string;
  providerName?: string;
};

const { quotationProviderId, providerName } = defineProps<Props>();

const quotationStore = useQuotationStore();
const toast = useToast();

const payments = computed(() => quotationStore.getPaymentsByProvider(quotationProviderId));
const paid = computed(() => quotationStore.getPaidByProvider(quotationProviderId));
const pendingBalance = computed(() => quotationStore.getPendingBalanceByProvider(quotationProviderId));

// Modal state
const isFormModalOpen = shallowRef(false);
const selectedPayment = shallowRef<ProviderPayment | null>(null);
const isDeleteModalOpen = shallowRef(false);
const paymentToDelete = shallowRef<ProviderPayment | null>(null);

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

function openEditPayment(payment: ProviderPayment) {
  selectedPayment.value = payment;
  isFormModalOpen.value = true;
}

function openDeleteConfirm(payment: ProviderPayment) {
  paymentToDelete.value = payment;
  isDeleteModalOpen.value = true;
}

function closeDeleteModal() {
  isDeleteModalOpen.value = false;
}

async function handleSubmit(data: ProviderPaymentFormData) {
  if (selectedPayment.value) {
    const result = await quotationStore.updateProviderPayment(selectedPayment.value.id, data);
    if (result) {
      toast.add({ title: 'Pago actualizado', color: 'success' });
    }
  }
  else {
    const result = await quotationStore.addProviderPayment(data);
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
  await quotationStore.deleteProviderPayment(paymentToDelete.value.id);
  toast.add({ title: 'Pago eliminado', color: 'warning' });
  isDeleteModalOpen.value = false;
  paymentToDelete.value = null;
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h3 class="font-semibold text-lg flex items-center gap-2">
        <UIcon name="i-lucide-receipt" class="w-5 h-5 text-muted" />
        Historial de Pagos
        <span v-if="providerName" class="text-muted font-normal">
          — {{ providerName }}
        </span>
      </h3>
      <UButton
        icon="i-lucide-plus"
        size="sm"
        label="Registrar pago"
        @click="openNewPayment"
      />
    </div>

    <!-- Payments table -->
    <div v-if="payments.length > 0">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-default text-left text-muted">
              <th class="pb-2 pr-4 font-medium">
                Fecha
              </th>
              <th class="pb-2 pr-4 font-medium">
                Concepto
              </th>
              <th class="pb-2 pr-4 font-medium">
                Tipo
              </th>
              <th class="pb-2 pr-4 font-medium">
                Monto
              </th>
              <th class="pb-2 pr-4 font-medium">
                Notas
              </th>
              <th class="pb-2 font-medium">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="payment in payments"
              :key="payment.id"
              class="border-b border-default/50 hover:bg-elevated/50"
            >
              <td class="py-2 pr-4">
                {{ formatDate(payment.paymentDate) }}
              </td>
              <td class="py-2 pr-4">
                {{ payment.concept || '—' }}
              </td>
              <td class="py-2 pr-4">
                <UBadge
                  :label="payment.paymentType === 'cash' ? 'Efectivo' : 'Transferencia'"
                  :color="payment.paymentType === 'cash' ? 'success' : 'info'"
                  variant="subtle"
                />
              </td>
              <td class="py-2 pr-4 font-medium">
                {{ formatCurrency(payment.amount) }}
              </td>
              <td class="py-2 pr-4 text-muted text-xs max-w-32 truncate">
                {{ payment.notes || '—' }}
              </td>
              <td class="py-2">
                <div class="flex items-center gap-1">
                  <UButton
                    icon="i-lucide-pencil"
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    @click="openEditPayment(payment)"
                  />
                  <UButton
                    icon="i-lucide-trash-2"
                    size="xs"
                    variant="ghost"
                    color="error"
                    @click="openDeleteConfirm(payment)"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Empty state -->
    <EmptyState
      v-else
      section="payments"
      compact
      :actions="[{ label: 'Registrar pago', icon: 'i-lucide-plus', size: 'sm', variant: 'outline', onClick: openNewPayment }]"
    />

    <!-- Footer: totals -->
    <div class="pt-2 border-t border-default flex items-center justify-between text-sm">
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

  <!-- Modal: payment form -->
  <UModal
    v-model:open="isFormModalOpen"
    :title="selectedPayment ? 'Editar Pago' : 'Registrar Pago'"
    :description="selectedPayment ? 'Modifica los datos del pago registrado' : 'Ingresa los datos del nuevo pago al proveedor'"
    class="sm:max-w-lg"
  >
    <template #body>
      <QuotationProviderPaymentForm
        :quotation-provider-id="quotationProviderId"
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
