<script setup lang="ts">
import { PAGE_SECTION_ICON_LABELS, PAGE_SECTION_ICONS } from '~/composables/agency-profile/use-page-sections-domain';

// Stores the bare key (`map-pinned`); the public site renders it as `i-lucide-<key>`.
const model = defineModel<string>({ required: true });

const items = PAGE_SECTION_ICONS.map(key => ({
  value: key as string,
  label: PAGE_SECTION_ICON_LABELS[key],
  icon: `i-lucide-${key}`,
}));

const selectedIcon = computed(() => `i-lucide-${model.value}`);
</script>

<template>
  <USelectMenu
    v-model="model"
    :items="items"
    value-key="value"
    :icon="selectedIcon"
    :search-input="{ placeholder: 'Buscar ícono...' }"
    class="w-full"
  />
</template>
