<script setup lang="ts">
import type { ProviderCategory, ProviderFilters } from '~/types/provider';

type Props = {
  modelValue: ProviderFilters;
  availableCiudades: string[];
  availableEstados: string[];
  showCategoryFilter?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  showCategoryFilter: true,
});

const emit = defineEmits<{
  'update:modelValue': [filters: ProviderFilters];
}>();

const categoryOptions = [
  { label: 'Guías', value: 'guides' },
  { label: 'Transporte', value: 'transportation' },
  { label: 'Hospedaje', value: 'accommodation' },
  { label: 'Agencias de Autobús', value: 'bus_agencies' },
  { label: 'Comidas', value: 'food_services' },
  { label: 'Otros', value: 'other' },
];

const searchTerm = ref(props.modelValue.searchTerm ?? '');
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

watch(() => props.modelValue.searchTerm, (val) => {
  searchTerm.value = val ?? '';
});

function onSearchInput(val: string) {
  searchTerm.value = val;
  if (debounceTimer)
    clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    emit('update:modelValue', { ...props.modelValue, searchTerm: val || undefined });
  }, 300);
}

const ciudadOptions = computed(() =>
  props.availableCiudades.map(c => ({ label: c, value: c })),
);

const estadoOptions = computed(() =>
  props.availableEstados.map(e => ({ label: e, value: e })),
);

function onCategoryChange(val: string | undefined) {
  emit('update:modelValue', {
    ...props.modelValue,
    category: val as ProviderCategory | undefined,
  });
}

function onCiudadChange(val: string | undefined) {
  emit('update:modelValue', {
    ...props.modelValue,
    city: val,
  });
}

function onEstadoChange(val: string | undefined) {
  emit('update:modelValue', {
    ...props.modelValue,
    state: val,
  });
}

function clearAll() {
  searchTerm.value = '';
  emit('update:modelValue', {});
}

const hasFilters = computed(() =>
  Object.values(props.modelValue).some(v => v !== undefined && v !== ''),
);
</script>

<template>
  <div class="flex flex-wrap items-center gap-3">
    <UInput
      :model-value="searchTerm"
      icon="i-lucide-search"
      placeholder="Buscar proveedor..."
      class="w-56"
      @update:model-value="onSearchInput"
    />

    <USelect
      v-if="showCategoryFilter"
      :model-value="modelValue.category"
      :items="categoryOptions"
      value-key="value"
      label-key="label"
      placeholder="Todas las categorías"
      class="w-52"
      @update:model-value="onCategoryChange"
    />

    <USelect
      :model-value="modelValue.city"
      :items="ciudadOptions"
      value-key="value"
      label-key="label"
      placeholder="Todas las ciudades"
      class="w-48"
      @update:model-value="onCiudadChange"
    />

    <USelect
      :model-value="modelValue.state"
      :items="estadoOptions"
      value-key="value"
      label-key="label"
      placeholder="Todos los estados"
      class="w-48"
      @update:model-value="onEstadoChange"
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
