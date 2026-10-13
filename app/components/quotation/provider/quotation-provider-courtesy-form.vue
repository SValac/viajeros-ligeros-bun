<script setup lang="ts">
import type { QuotationProvider } from '~/types/quotation';

// Changes only the coordinator courtesy of a per-person service. It doesn't touch the seat
// price, so it can be used on a confirmed quotation.

type Props = {
  provider: QuotationProvider;
};

const { provider } = defineProps<Props>();

const emit = defineEmits<{
  submit: [coordinatorsCourtesy: boolean];
  cancel: [];
}>();

const coordinatorsCourtesy = shallowRef(provider.coordinatorsCourtesy);
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
