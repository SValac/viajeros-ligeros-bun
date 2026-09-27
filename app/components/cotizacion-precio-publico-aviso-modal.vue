<script setup lang="ts">
import type { QuotationPublicPrice } from '~/types/quotation';

export type PrecioPublicoAvisoAccion = 'edit' | 'delete';

export type ViajeroConPrecio = {
  id: string;
  name: string;
  /** Amount stored in the traveler's account config when the price was assigned. */
  amount?: number;
};

type Props = {
  accion: PrecioPublicoAvisoAccion;
  precio: QuotationPublicPrice | null;
  /** Travelers whose account config points at this price. */
  viajeros: ViajeroConPrecio[];
  loading?: boolean;
};

const { accion, precio, viajeros, loading = false } = defineProps<Props>();

const emit = defineEmits<{
  confirm: [];
}>();

const open = defineModel<boolean>('open', { required: true });

const enUso = computed(() => viajeros.length > 0);

const title = computed(() => {
  if (!enUso.value)
    return 'Eliminar precio';
  const n = viajeros.length;
  return `Este precio lo ${n === 1 ? 'tiene 1 viajero' : `tienen ${n} viajeros`}`;
});

// What happens to the travelers' accounts, so the user knows whether to follow up in Pagos
const description = computed(() => {
  const nombre = precio ? `"${precio.priceType}"` : 'este precio';
  if (!enUso.value)
    return `¿Eliminar ${nombre}? Esta acción no se puede deshacer.`;
  if (accion === 'edit')
    return `Los viajeros conservan el monto con el que se configuró su cuenta: cambiar ${nombre} no actualiza sus saldos. Si deben pagar el nuevo precio, ajusta sus cuentas en Pagos.`;
  return `Al eliminar ${nombre}, estos viajeros quedan sin precio vinculado. Conservan el monto que tienen registrado, pero al editar su cuenta tendrás que elegir otro precio.`;
});

const confirmLabel = computed(() => {
  if (accion === 'delete')
    return 'Eliminar';
  return 'Guardar de todos modos';
});

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
}

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
          v-for="viajero in viajeros"
          :key="viajero.id"
          class="flex items-center justify-between gap-3 px-3 py-2 text-sm"
        >
          <span class="truncate">{{ viajero.name }}</span>
          <span v-if="viajero.amount !== undefined" class="shrink-0 text-muted">
            {{ formatCurrency(viajero.amount) }}
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
          :color="accion === 'delete' ? 'error' : 'warning'"
          :label="confirmLabel"
          :loading="loading"
          @click="emit('confirm')"
        />
      </div>
    </template>
  </UModal>
</template>
