<script setup lang="ts">
import { CURRENCY_FORMAT_OPTIONS } from '~/utils/currency';

// Amount in pesos with local format ($4,500.00), or a percentage (12.5%) with `percent`.
// It's typed freely (4500, 4,500.50) and formatted when leaving the field; the v-model
// updates at that moment (blur or Enter), not on every keystroke.
//
// No min/max on purpose: in the NumberField, Home/End jump to the minimum/maximum and
// out-of-range values are clamped without warning. The form schema validates the limits.

const { percent = false, placeholder, ariaLabel, disabled = false } = defineProps<{
  percent?: boolean;
  placeholder?: string;
  // Only when it's not inside a UFormField with a label
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
