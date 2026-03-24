<script setup lang="ts">
import type { Travel, TravelBus } from '~/types/travel';
import type { TravelerFilters } from '~/types/traveler';

type Props = {
  availableTravels: Travel[];
  availableBuses: TravelBus[];
};

const props = defineProps<Props>();

// defineModel — Vue 3.4+ (Nuxt 4 / Vue 3.5)
const filters = defineModel<TravelerFilters>({ default: () => ({}) });

const travelOptions = computed(() =>
  props.availableTravels.map(t => ({ label: t.destino, value: t.id })),
);

// Filtra los camiones por el viaje seleccionado si hay uno activo
const busOptions = computed(() => {
  const buses = filters.value.travelId
    ? props.availableBuses.filter(b =>
        props.availableTravels
          .find(t => t.id === filters.value.travelId)
          ?.autobuses
          .some(ab => ab.id === b.id),
      )
    : props.availableBuses;

  return buses.map(b => ({
    label: [b.marca, b.modelo].filter(Boolean).join(' ') || `Camión ${b.id}`,
    value: b.id,
  }));
});

function onTravelChange(val: string | undefined) {
  // Al cambiar de viaje, reseteamos el camión para evitar selección inválida
  filters.value = { ...filters.value, travelId: val, travelBusId: undefined };
}

function onBusChange(val: string | undefined) {
  filters.value = { ...filters.value, travelBusId: val };
}

function clearAll() {
  filters.value = {};
}

const hasFilters = computed(() =>
  Object.values(filters.value).some(v => v !== undefined && v !== ''),
);
</script>

<template>
  <div class="flex flex-wrap items-center gap-3">
    <USelect
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
