<script setup lang="ts">
import type { QuotationProvider } from '~/types/quotation';

// Cambia solo la cortesía para coordinadores de un servicio por persona. No toca el precio
// del asiento, así que se puede usar con la cotización confirmada.

type Props = {
  proveedor: QuotationProvider;
};

const { proveedor } = defineProps<Props>();

const emit = defineEmits<{
  submit: [coordinatorsCourtesy: boolean];
  cancel: [];
}>();

const coordinatorsCourtesy = shallowRef(proveedor.coordinatorsCourtesy);
</script>

<template>
  <div class="space-y-4">
    <USwitch
      v-model="coordinatorsCourtesy"
      label="Cortesía para coordinadores"
      description="El proveedor no cobra a los coordinadores, así que no cuentan para el pago."
    />

    <div class="flex justify-end gap-3 pt-2">
      <UButton
        type="button"
        variant="ghost"
        color="neutral"
        label="Cancelar"
        @click="emit('cancel')"
      />
      <UButton label="Guardar" @click="emit('submit', coordinatorsCourtesy)" />
    </div>
  </div>
</template>
