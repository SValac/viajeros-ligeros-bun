<script setup lang="ts">
import type { BedConfiguration, BedSize } from '~/types/hotel-room';

const { removable = true } = defineProps<{
  removable?: boolean;
}>();

const emit = defineEmits<{
  remove: [];
}>();

const bed = defineModel<BedConfiguration>({ required: true });

const bedSizeOptions = [
  { value: 'single', label: 'Individual' },
  { value: 'double', label: 'Matrimonial' },
  { value: 'queen', label: 'Queen' },
  { value: 'king', label: 'King' },
];

function updateQuantity(val: string | number) {
  bed.value = { ...bed.value, count: Number(val) };
}

function updateSize(val: string) {
  bed.value = { ...bed.value, size: val as BedSize };
}
</script>

<template>
  <div class="flex items-center gap-2">
    <UInput
      :model-value="bed.count"
      type="number"
      :min="1"
      :max="10"
      class="w-20 shrink-0"
      @update:model-value="updateQuantity"
    />
    <USelect
      :model-value="bed.size"
      :items="bedSizeOptions"
      value-key="value"
      label-key="label"
      class="flex-1 min-w-0"
      @update:model-value="updateSize"
    />
    <UButton
      icon="i-lucide-trash-2"
      variant="ghost"
      color="error"
      size="sm"
      aria-label="Quitar cama"
      :disabled="!removable"
      @click="emit('remove')"
    />
  </div>
</template>
