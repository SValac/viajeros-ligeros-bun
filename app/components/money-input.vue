<script setup lang="ts">
import { CURRENCY_FORMAT_OPTIONS } from '~/utils/currency';

// Monto en pesos con formato local ($4,500.00), o porcentaje (12.5%) con `percent`.
// Se escribe libre (4500, 4,500.50) y se formatea al salir del campo; el v-model se
// actualiza en ese momento (blur o Enter), no con cada tecla.
//
// Sin min/max a propósito: en el NumberField, Inicio/Fin saltan al mínimo/máximo y los
// valores fuera de rango se recortan sin avisar. Los límites los valida el schema del form.

const { percent = false, placeholder, ariaLabel, disabled = false } = defineProps<{
  percent?: boolean;
  placeholder?: string;
  // Solo cuando no está dentro de un UFormField con label
  ariaLabel?: string;
  disabled?: boolean;
}>();

const model = defineModel<number | null | undefined>();

const formatOptions = computed<Intl.NumberFormatOptions>(() => percent
  ? { style: 'unit', unit: 'percent', maximumFractionDigits: 2 }
  : CURRENCY_FORMAT_OPTIONS);
</script>

<template>
  <UInputNumber
    v-model="model"
    :format-options="formatOptions"
    :step-snapping="false"
    disable-wheel-change
    :increment="false"
    :decrement="false"
    :placeholder="placeholder ?? (percent ? '0%' : '$0.00')"
    :aria-label="ariaLabel"
    :disabled="disabled"
    class="w-full"
  />
</template>
