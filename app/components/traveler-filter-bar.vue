<script setup lang="ts">
import type { Travel, TravelBus } from '~/types/travel';
import type { Traveler, TravelerFilters } from '~/types/traveler';

type Props = {
  availableTravels: Travel[];
  availableBuses: TravelBus[];
  representantes?: Traveler[];
  hideTravelFilter?: boolean;
};

const props = defineProps<Props>();

// defineModel — Vue 3.4+ (Nuxt 4 / Vue 3.5)
const filters = defineModel<TravelerFilters>({ default: () => ({}) });

const providerStore = useProviderStore();

const travelOptions = computed(() =>
  props.availableTravels.map(t => ({ label: t.destination, value: t.id })),
);

const representanteOptions = computed(() =>
  (props.representantes ?? []).map(r => ({
    label: `${r.firstName} ${r.lastName}`,
    value: r.id,
  })),
);

// Opciones de camiones
const busOptions = computed(() => {
  return props.availableBuses.map((b) => {
    const agencia = providerStore.getProviderById(b.providerId)?.name;
    const busName = [b.brand, b.model].filter(Boolean).join(' ').trim() || 'Camión';
    return {
      label: agencia ? `${agencia} — ${busName}` : busName,
      value: b.id,
    };
  });
});

function onTravelChange(val: string | undefined) {
  // Al cambiar de viaje, reseteamos el camión y representante para evitar selección inválida
  filters.value = { ...filters.value, travelId: val, travelBusId: undefined, representativeId: undefined };
}

function onBusChange(val: string | undefined) {
  filters.value = { ...filters.value, travelBusId: val };
}

function onRepresentanteChange(val: string | undefined) {
  filters.value = { ...filters.value, representativeId: val };
}

function clearAll() {
  filters.value = props.hideTravelFilter
    ? { travelId: filters.value.travelId }
    : {};
}

const hasFilters = computed(() =>
  Object.values(filters.value).some(v => v !== undefined && v !== ''),
);
</script>

<template>
  <div class="flex flex-wrap items-center gap-3">
    <USelect
      v-if="!hideTravelFilter"
      :model-value="filters.travelId"
      :items="travelOptions"
      value-key="value"
      label-key="label"
      placeholder="Todos los viajes"
      class="w-56"
      @update:model-value="onTravelChange"
    />

    <USelect
      :model-value="filters.travelBusId"
      :items="busOptions"
      value-key="value"
      label-key="label"
      placeholder="Todos los camiones"
      class="w-52"
      @update:model-value="onBusChange"
    />

    <USelect
      v-if="representanteOptions.length > 0"
      :model-value="filters.representativeId"
      :items="representanteOptions"
      value-key="value"
      label-key="label"
      placeholder="Todos los grupos"
      class="w-56"
      @update:model-value="onRepresentanteChange"
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
