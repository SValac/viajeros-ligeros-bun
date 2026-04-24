<script setup lang="ts">
import type { BedConfiguration, BedSize } from '~/types/hotel-room';

const props = defineProps<{
  modelValue: BedConfiguration;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: BedConfiguration];
  'remove': [];
}>();

const bedSizeOptions = [
  { value: 'single', label: 'Individual' },
  { value: 'double', label: 'Matrimonial' },
  { value: 'queen', label: 'Queen' },
  { value: 'king', label: 'King' },
];

function updateCantidad(val: string | number) {
  emit('update:modelValue', { ...props.modelValue, count: Number(val) });
}

function updateTamaño(val: string) {
  emit('update:modelValue', { ...props.modelValue, size: val as BedSize });
}
</script>

<template>
  <div class="flex items-center gap-2">
    <UInput
      :model-value="modelValue.count"
      type="number"
      :min="1"
      :max="10"
      class="w-20"
      @update:model-value="updateCantidad"
    />
    <USelect
      :model-value="modelValue.size"
      :items="bedSizeOptions"
      value-key="value"
      label-key="label"
      class="w-40"
      @update:model-value="updateTamaño"
    />
    <UButton
      icon="i-lucide-trash-2"
      variant="ghost"
      color="error"
      size="sm"
      @click="emit('remove')"
    />
  </div>
</template>
