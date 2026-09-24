<script setup lang="ts">
import { ABOUT_PAGE_ICON_LABELS, ABOUT_PAGE_ICONS } from '~/composables/agency-profile/use-about-page-domain';

// Stores the bare key (`map-pinned`); the public site renders it as `i-lucide-<key>`.
const model = defineModel<string>({ required: true });

const items = ABOUT_PAGE_ICONS.map(key => ({
  value: key as string,
  label: ABOUT_PAGE_ICON_LABELS[key],
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
