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
  { value: 'individual', label: 'Individual' },
  { value: 'matrimonial', label: 'Matrimonial' },
  { value: 'queen', label: 'Queen' },
  { value: 'king', label: 'King' },
];

function updateCantidad(val: string | number) {
  emit('update:modelValue', { ...props.modelValue, cantidad: Number(val) });
}

function updateTamaño(val: string) {
  emit('update:modelValue', { ...props.modelValue, tamaño: val as BedSize });
}
</script>

<template>
  <div class="flex items-center gap-2">
    <UInput
      :model-value="modelValue.cantidad"
      type="number"
      :min="1"
      :max="10"
      class="w-20"
      @update:model-value="updateCantidad"
    />
    <USelect
      :model-value="modelValue.tamaño"
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
