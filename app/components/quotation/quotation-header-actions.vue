<script setup lang="ts">
import { useQuotationContext } from '~/composables/quotation/use-quotation-context';
import { getQuotationStatusColor, getQuotationStatusLabel } from '~/utils/quotation-labels';

type Props = {
  quotationId: string;
  readonly: boolean;
};

const { quotationId, readonly } = defineProps<Props>();

const quotationStore = useQuotationStore();
const toast = useToast();

const { quotation } = useQuotationContext(() => quotationId);

const canConfirm = computed(() => quotationStore.canConfirm(quotationId));

const isConfirmModalOpen = shallowRef(false);
const isConfirming = shallowRef(false);
const isReopenModalOpen = shallowRef(false);
const isReopening = shallowRef(false);

function openConfirmModal() {
  isConfirmModalOpen.value = true;
}

function closeConfirmModal() {
  isConfirmModalOpen.value = false;
}

function openReopenModal() {
  isReopenModalOpen.value = true;
}

function closeReopenModal() {
  isReopenModalOpen.value = false;
}

async function reopenQuotation() {
  isReopening.value = true;
  const result = await quotationStore.reopenQuotation(quotationId);
  isReopening.value = false;
  isReopenModalOpen.value = false;

  if (result.success)
    toast.add({ title: 'Cotización reabierta', description: 'Vuelve a estar en borrador', color: 'success' });
  else
    toast.add({ title: 'Error al reabrir', description: result.error, color: 'error' });
}

async function confirmQuotation() {
  isConfirming.value = true;
  const result = await quotationStore.confirmQuotation(quotationId);
  isConfirming.value = false;
  isConfirmModalOpen.value = false;

  if (result.success)
    toast.add({ title: 'Cotización confirmada', color: 'success' });
  else
    toast.add({ title: 'Error al confirmar', description: result.error, color: 'error' });
}
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3">
    <!-- Status badge -->
    <!-- No title of its own: the page already shows "Cotización" as the <h1> -->
    <div class="flex items-center gap-2">
      <span class="text-sm text-muted">Estado</span>
      <UBadge
        v-if="quotation"
        :label="getQuotationStatusLabel(quotation.status)"
        :color="getQuotationStatusColor(quotation.status)"
        variant="subtle"
      />
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-2">
      <!-- Reopen quotation (back to draft) -->
      <UButton
        v-if="readonly"
        icon="i-lucide-lock-open"
        label="Reabrir cotización"
        color="neutral"
        variant="outline"
        size="sm"
        @click="openReopenModal"
      />

      <!-- Confirm quotation -->
      <UTooltip
        v-else
        :text="!canConfirm ? 'Todos los proveedores deben estar confirmados' : ''"
        :disabled="canConfirm && !readonly"
      >
        <UButton
          icon="i-lucide-check-circle"
          label="Confirmar cotización"
          color="success"
          size="sm"
          :disabled="readonly || !canConfirm"
          @click="openConfirmModal"
        />
      </UTooltip>
    </div>
  </div>

  <!-- Modal: confirmation -->
  <UModal
    v-model:open="isConfirmModalOpen"
    title="Confirmar Cotización"
    description="Al confirmar ya no se podrán editar proveedores, hospedaje ni autobuses. Los pagos a proveedores se siguen registrando normalmente, y puedes reabrirla si necesitas corregir algo."
  >
    <template #footer>
      <div class="flex justify-end gap-3">
        <UButton
          variant="ghost"
          color="neutral"
          label="Cancelar"
          @click="closeConfirmModal"
        />
        <UButton
          color="success"
          label="Confirmar"
          :loading="isConfirming"
          @click="confirmQuotation"
        />
      </div>
    </template>
  </UModal>

  <!-- Modal: reopen -->
  <UModal
    v-model:open="isReopenModalOpen"
    title="Reabrir Cotización"
    description="La cotización vuelve a borrador para poder editar proveedores, hospedaje y autobuses. Los pagos registrados no cambian."
  >
    <template #footer>
      <div class="flex justify-end gap-3">
        <UButton
          variant="ghost"
          color="neutral"
          label="Cancelar"
          @click="closeReopenModal"
        />
        <UButton
          icon="i-lucide-lock-open"
          label="Reabrir"
          :loading="isReopening"
          @click="reopenQuotation"
        />
      </div>
    </template>
  </UModal>
</template>
