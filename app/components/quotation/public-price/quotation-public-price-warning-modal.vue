<script setup lang="ts">
import type { QuotationPublicPrice } from '~/types/quotation';

import { formatCurrency } from '~/utils/currency';

export type PublicPriceWarningAction = 'edit' | 'delete';

export type TravelerWithPrice = {
  id: string;
  name: string;
  /** Amount stored in the traveler's account config when the price was assigned. */
  amount?: number;
};

type Props = {
  action: PublicPriceWarningAction;
  price: QuotationPublicPrice | null;
  /** Travelers whose account config points at this price. */
  travelers: TravelerWithPrice[];
  loading?: boolean;
};

const { action, price, travelers, loading = false } = defineProps<Props>();

const emit = defineEmits<{
  confirm: [];
}>();

const open = defineModel<boolean>('open', { required: true });

const enUso = computed(() => travelers.length > 0);

const title = computed(() => {
  if (!enUso.value)
    return 'Eliminar precio';
  const n = travelers.length;
  return `Este precio lo ${n === 1 ? 'tiene 1 viajero' : `tienen ${n} viajeros`}`;
});

// What happens to the travelers' accounts, so the user knows whether to follow up in Pagos
const description = computed(() => {
  const nombre = price ? `"${price.priceType}"` : 'este precio';
  if (!enUso.value)
    return `¿Eliminar ${nombre}? Esta acción no se puede deshacer.`;
  if (action === 'edit')
    return `Los viajeros conservan el monto con el que se configuró su cuenta: cambiar ${nombre} no actualiza sus saldos. Si deben pagar el nuevo precio, ajusta sus cuentas en Pagos.`;
  return `Al eliminar ${nombre}, estos viajeros quedan sin precio vinculado. Conservan el monto que tienen registrado, pero al editar su cuenta tendrás que elegir otro precio.`;
});

const confirmLabel = computed(() => {
  if (action === 'delete')
    return 'Eliminar';
  return 'Guardar de todos modos';
});

function close() {
  open.value = false;
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="title"
    :description="description"
  >
    <template v-if="enUso" #body>
      <ul class="divide-y divide-default rounded-md border border-default">
        <li
          v-for="traveler in travelers"
          :key="traveler.id"
          class="flex items-center justify-between gap-3 px-3 py-2 text-sm"
        >
          <span class="truncate">{{ traveler.name }}</span>
          <span v-if="traveler.amount !== undefined" class="shrink-0 text-muted">
            {{ formatCurrency(traveler.amount) }}
          </span>
        </li>
      </ul>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-3">
        <UButton
          variant="ghost"
          color="neutral"
          label="Cancelar"
          @click="close"
        />
        <UButton
          :color="action === 'delete' ? 'error' : 'warning'"
          :label="confirmLabel"
          :loading="loading"
          @click="emit('confirm')"
        />
      </div>
    </template>
  </UModal>
</template>
