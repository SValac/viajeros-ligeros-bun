<script setup lang="ts">
import type { ProviderPayment, ProviderPaymentFormData } from '~/types/quotation';

type Props = {
  quotationProviderId: string;
  readonly?: boolean;
  proveedorNombre?: string;
};

const { quotationProviderId, readonly = false, proveedorNombre } = defineProps<Props>();

const cotizacionStore = useCotizacionStore();
const toast = useToast();

const pagos = computed(() => cotizacionStore.getPagosByProveedor(quotationProviderId));
const anticipado = computed(() => cotizacionStore.getAnticipadoProveedor(quotationProviderId));
const saldoPendiente = computed(() => cotizacionStore.getSaldoPendienteProveedor(quotationProviderId));

// Modal state
const isFormModalOpen = shallowRef(false);
const selectedPago = shallowRef<ProviderPayment | null>(null);
const isDeleteModalOpen = shallowRef(false);
const pagoToDelete = shallowRef<ProviderPayment | null>(null);

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function openNewPago() {
  selectedPago.value = null;
  isFormModalOpen.value = true;
}

function openEditPago(pago: ProviderPayment) {
  selectedPago.value = pago;
  isFormModalOpen.value = true;
}

function openDeleteConfirm(pago: ProviderPayment) {
  pagoToDelete.value = pago;
  isDeleteModalOpen.value = true;
}

async function handleSubmit(data: ProviderPaymentFormData) {
  if (selectedPago.value) {
    const result = await cotizacionStore.updateProviderPayment(selectedPago.value.id, data);
    if (result) {
      toast.add({ title: 'Pago actualizado', color: 'success' });
    }
  }
  else {
    const result = await cotizacionStore.addProviderPayment(data);
    if ('error' in result) {
      toast.add({ title: 'Error', description: result.error, color: 'error' });
    }
    else {
      toast.add({ title: 'Pago registrado', color: 'success' });
    }
  }
  isFormModalOpen.value = false;
  selectedPago.value = null;
}

async function confirmDelete() {
  if (!pagoToDelete.value)
    return;
  await cotizacionStore.deleteProviderPayment(pagoToDelete.value.id);
  toast.add({ title: 'Pago eliminado', color: 'warning' });
  isDeleteModalOpen.value = false;
  pagoToDelete.value = null;
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h3 class="font-semibold text-lg flex items-center gap-2">
        <span class="i-lucide-receipt w-5 h-5 text-muted" />
        Historial de Pagos
        <span v-if="proveedorNombre" class="text-muted font-normal">
          — {{ proveedorNombre }}
        </span>
      </h3>
      <UButton
        v-if="!readonly"
        icon="i-lucide-plus"
        size="sm"
        label="Registrar pago"
        @click="openNewPago"
      />
    </div>

    <!-- Tabla de pagos -->
    <div v-if="pagos.length > 0">
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
              <th v-if="!readonly" class="pb-2 font-medium">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="pago in pagos"
              :key="pago.id"
              class="border-b border-default/50 hover:bg-elevated/50"
            >
              <td class="py-2 pr-4">
                {{ formatDate(pago.paymentDate) }}
              </td>
              <td class="py-2 pr-4">
                {{ pago.concept || '—' }}
              </td>
              <td class="py-2 pr-4">
                <UBadge
                  :label="pago.paymentType === 'cash' ? 'Efectivo' : 'Transferencia'"
                  :color="pago.paymentType === 'cash' ? 'success' : 'info'"
                  variant="subtle"
                  size="xs"
                />
              </td>
              <td class="py-2 pr-4 font-medium">
                {{ formatCurrency(pago.amount) }}
              </td>
              <td class="py-2 pr-4 text-muted text-xs max-w-32 truncate">
                {{ pago.notes || '—' }}
              </td>
              <td v-if="!readonly" class="py-2">
                <div class="flex items-center gap-1">
                  <UButton
                    icon="i-lucide-pencil"
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    @click="openEditPago(pago)"
                  />
                  <UButton
                    icon="i-lucide-trash-2"
                    size="xs"
                    variant="ghost"
                    color="error"
                    @click="openDeleteConfirm(pago)"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Estado vacío -->
    <div v-else class="py-8 text-center bg-elevated/50 rounded-lg">
      <span class="i-lucide-receipt-x w-10 h-10 text-muted mx-auto mb-2 block" />
      <p class="text-muted text-sm">
        No hay pagos registrados
      </p>
      <UButton
        v-if="!readonly"
        size="xs"
        variant="ghost"
        label="Registrar primer pago"
        class="mt-2"
        @click="openNewPago"
      />
    </div>

    <!-- Footer: totales -->
    <div class="pt-2 border-t border-default flex items-center justify-between text-sm">
      <span class="text-muted">Total pagado</span>
      <span class="font-semibold text-success">{{ formatCurrency(anticipado) }}</span>
    </div>
    <div class="flex items-center justify-between text-sm">
      <span class="text-muted">Saldo pendiente</span>
      <span class="font-semibold" :class="saldoPendiente > 0 ? 'text-warning' : 'text-success'">
        {{ formatCurrency(saldoPendiente) }}
      </span>
    </div>
  </div>

  <!-- Modal: form de pago -->
  <UModal
    v-model:open="isFormModalOpen"
    :title="selectedPago ? 'Editar Pago' : 'Registrar Pago'"
    :description="selectedPago ? 'Modifica los datos del pago registrado' : 'Ingresa los datos del nuevo pago al proveedor'"
    class="sm:max-w-lg"
  >
    <template #body>
      <PagoProveedorForm
        :quotation-provider-id="quotationProviderId"
        :max-monto="selectedPago ? selectedPago.amount + saldoPendiente : saldoPendiente"
        :pago="selectedPago"
        @submit="handleSubmit"
        @cancel="isFormModalOpen = false"
      />
    </template>
  </UModal>

  <!-- Modal: confirmar eliminación -->
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
          @click="isDeleteModalOpen = false"
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
