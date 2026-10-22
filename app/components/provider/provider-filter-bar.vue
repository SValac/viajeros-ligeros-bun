<script setup lang="ts">
import { refDebounced } from '@vueuse/core';

import type { ProviderCategory, ProviderFilters } from '~/types/provider';

import { PROVIDER_CATEGORY_LIST } from '~/utils/provider-categories';

type Props = {
  availableCities: string[];
  availableStates: string[];
  showCategoryFilter?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  showCategoryFilter: true,
});

const filters = defineModel<ProviderFilters>({ required: true });

const categoryOptions = PROVIDER_CATEGORY_LIST.map(meta => ({ label: meta.label, value: meta.category }));

const searchTerm = ref(filters.value.searchTerm ?? '');
const debouncedSearchTerm = refDebounced(searchTerm, 300);

watch(() => filters.value.searchTerm, (val) => {
  searchTerm.value = val ?? '';
});

function setFilter<K extends keyof ProviderFilters>(key: K, value: ProviderFilters[K]) {
  filters.value = { ...filters.value, [key]: value || undefined };
}

// Updates only what the parent doesn't have yet: a change coming from the parent (or
// "Limpiar") settles here too.
watch(debouncedSearchTerm, (val) => {
  if ((val || undefined) !== filters.value.searchTerm)
    setFilter('searchTerm', val);
});

const cityOptions = computed(() =>
  props.availableCities.map(c => ({ label: c, value: c })),
);

const statusOptions = computed(() =>
  props.availableStates.map(e => ({ label: e, value: e })),
);

function clearAll() {
  searchTerm.value = '';
  filters.value = {};
}

const hasFilters = computed(() =>
  Object.values(filters.value).some(v => v !== undefined && v !== ''),
);
</script>

<template>
  <div class="flex flex-wrap items-center gap-3">
    <UInput
      v-model="searchTerm"
      icon="i-lucide-search"
      placeholder="Buscar por nombre, ubicación o contacto..."
      class="w-full sm:w-80"
    />

    <USelect
      v-if="showCategoryFilter"
      :model-value="filters.category"
      :items="categoryOptions"
      value-key="value"
      label-key="label"
      placeholder="Todas las categorías"
      class="w-52"
      @update:model-value="setFilter('category', $event as ProviderCategory | undefined)"
    />

    <USelect
      :model-value="filters.city"
      :items="cityOptions"
      value-key="value"
      label-key="label"
      placeholder="Todas las ciudades"
      class="w-48"
      @update:model-value="setFilter('city', $event)"
    />

    <USelect
      :model-value="filters.state"
      :items="statusOptions"
      value-key="value"
      label-key="label"
      placeholder="Todos los estados"
      class="w-48"
      @update:model-value="setFilter('state', $event)"
    />

    <UButton
      v-if="hasFilters"
      icon="i-lucide-filter-x"
      variant="ghost"
      color="neutral"
      @click="clearAll"
    >
      Limpiar filtros
    </UButton>
  </div>
</template>
