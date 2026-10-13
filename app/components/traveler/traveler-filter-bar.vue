<script setup lang="ts">
import type { Travel, TravelBus } from '~/types/travel';
import type { Traveler, TravelerFilters } from '~/types/traveler';

type Props = {
  availableTravels: Travel[];
  availableBuses: TravelBus[];
  representatives?: Traveler[];
  hideTravelFilter?: boolean;
};

const props = defineProps<Props>();

// defineModel — Vue 3.4+ (Nuxt 4 / Vue 3.5)
const filters = defineModel<TravelerFilters>({ default: () => ({}) });

const providerStore = useProviderStore();

const travelOptions = computed(() =>
  props.availableTravels.map(t => ({ label: t.label, value: t.id })),
);

const representativeOptions = computed(() =>
  (props.representatives ?? []).map(r => ({
    label: `${r.firstName} ${r.lastName}`,
    value: r.id,
  })),
);

// Bus options
const busOptions = computed(() => {
  return props.availableBuses.map((b) => {
    const agency = providerStore.getProviderById(b.providerId)?.name;
    const busName = [b.brand, b.model].filter(Boolean).join(' ').trim() || 'Camión';
    return {
      label: agency ? `${agency} — ${busName}` : busName,
      value: b.id,
    };
  });
});

function onTravelChange(val: string | undefined) {
  // When the travel changes, reset the bus and representative to avoid an invalid selection
  filters.value = { ...filters.value, travelId: val, travelBusId: undefined, representativeId: undefined };
}

function onBusChange(val: string | undefined) {
  filters.value = { ...filters.value, travelBusId: val };
}

function onRepresentativeChange(val: string | undefined) {
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
      v-if="representativeOptions.length > 0"
      :model-value="filters.representativeId"
      :items="representativeOptions"
      value-key="value"
      label-key="label"
      placeholder="Todos los grupos"
      class="w-56"
      @update:model-value="onRepresentativeChange"
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
