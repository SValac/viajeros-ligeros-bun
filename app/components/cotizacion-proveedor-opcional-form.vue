<script setup lang="ts">
import type { QuotationProvider } from '~/types/quotation';

// Cambia solo si un servicio por persona se paga por los viajeros que lo toman. No toca el
// precio del asiento, así que se puede usar con la cotización confirmada.

type Props = {
  proveedor: QuotationProvider;
};

const { proveedor } = defineProps<Props>();

const emit = defineEmits<{
  submit: [data: { isOptional: boolean; coordinatorsCourtesy: boolean }];
  cancel: [];
}>();

const isOptional = shallowRef(proveedor.isOptional);
const coordinatorsCourtesy = shallowRef(proveedor.coordinatorsCourtesy);

watch(isOptional, (value) => {
  if (!value)
    coordinatorsCourtesy.value = false;
});

function onSubmit() {
  emit('submit', { isOptional: isOptional.value, coordinatorsCourtesy: coordinatorsCourtesy.value });
}
</script>

<template>
  <div class="space-y-4">
    <USwitch
      v-model="isOptional"
      label="Servicio opcional"
      description="Al proveedor se le paga solo por los viajeros que lo toman. Se marcan en la pestaña Servicios opcionales del viaje."
    />
    <USwitch
      v-if="isOptional"
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
      <UButton label="Guardar" @click="onSubmit" />
    </div>
  </div>
</template>
