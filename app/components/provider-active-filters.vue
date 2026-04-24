<script setup lang="ts">
import type { ProviderCategory, ProviderFilters } from '~/types/provider';

type Props = {
  filters: ProviderFilters;
  totalCount: number;
  resultCount: number;
};

const props = defineProps<Props>();

const emit = defineEmits<{
  removeFilter: [key: keyof ProviderFilters];
  clearAll: [];
}>();

const categoryLabels: Record<ProviderCategory, string> = {
  guides: 'Guías',
  transportation: 'Transporte',
  accommodation: 'Hospedaje',
  bus_agencies: 'Agencias de Autobús',
  food_services: 'Comidas',
  other: 'Otros',
};

type ActiveChip = {
  key: keyof ProviderFilters;
  label: string;
};

const activeChips = computed<ActiveChip[]>(() => {
  const chips: ActiveChip[] = [];

  if (props.filters.category) {
    chips.push({
      key: 'category',
      label: `Categoría: ${categoryLabels[props.filters.category]}`,
    });
  }
  if (props.filters.city) {
    chips.push({ key: 'city', label: `Ciudad: ${props.filters.city}` });
  }
  if (props.filters.state) {
    chips.push({ key: 'state', label: `Estado: ${props.filters.state}` });
  }
  if (props.filters.searchTerm) {
    chips.push({ key: 'searchTerm', label: `Búsqueda: "${props.filters.searchTerm}"` });
  }

  return chips;
});

const hasFilters = computed(() => activeChips.value.length > 0);
</script>

<template>
  <div v-if="hasFilters" class="flex flex-wrap items-center gap-2">
    <span class="text-sm text-gray-500 dark:text-gray-400">
      Mostrando {{ resultCount }} de {{ totalCount }} proveedores
    </span>

    <UBadge
      v-for="chip in activeChips"
      :key="chip.key"
      variant="subtle"
      color="primary"
      class="flex items-center gap-1 cursor-pointer"
      @click="emit('removeFilter', chip.key)"
    >
      {{ chip.label }}
      <UIcon name="i-lucide-x" class="w-3 h-3" />
    </UBadge>

    <UButton
      variant="ghost"
      color="neutral"
      size="xs"
      @click="emit('clearAll')"
    >
      Limpiar todo
    </UButton>
  </div>
</template>
