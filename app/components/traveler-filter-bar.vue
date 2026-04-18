<script setup lang="ts">
import type { CotizacionBus } from '~/types/cotizacion';
import type { Travel } from '~/types/travel';
import type { Traveler, TravelerFilters } from '~/types/traveler';

type Props = {
  availableTravels: Travel[];
  availableBuses: CotizacionBus[];
  representantes?: Traveler[];
};

const props = defineProps<Props>();

// defineModel — Vue 3.4+ (Nuxt 4 / Vue 3.5)
const filters = defineModel<TravelerFilters>({ default: () => ({}) });

const cotizacionStore = useCotizacionStore();
const providerStore = useProviderStore();

const travelOptions = computed(() =>
  props.availableTravels.map(t => ({ label: t.destino, value: t.id })),
);

const representanteOptions = computed(() =>
  (props.representantes ?? []).map(r => ({
    label: `${r.nombre} ${r.apellido}`,
    value: r.id,
  })),
);

// Filtra los camiones por la cotizacion del viaje seleccionado
const busOptions = computed(() => {
  let buses = props.availableBuses;

  if (filters.value.travelId) {
    const cotizacion = cotizacionStore.getCotizacionByTravel(filters.value.travelId);
    buses = cotizacion
      ? buses.filter(b => b.cotizacionId === cotizacion.id)
      : [];
  }

  return buses.map((b) => {
    const agencia = providerStore.getProviderById(b.proveedorId)?.nombre;
    return {
      label: agencia ? `${agencia} — Unidad ${b.numeroUnidad}` : `Unidad ${b.numeroUnidad}`,
      value: b.id,
    };
  });
});

function onTravelChange(val: string | undefined) {
  // Al cambiar de viaje, reseteamos el camión y representante para evitar selección inválida
  filters.value = { ...filters.value, travelId: val, travelBusId: undefined, representanteId: undefined };
}

function onBusChange(val: string | undefined) {
  filters.value = { ...filters.value, travelBusId: val };
}

function onRepresentanteChange(val: string | undefined) {
  filters.value = { ...filters.value, representanteId: val };
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

    <USelect
      v-if="representanteOptions.length > 0"
      :model-value="filters.representanteId"
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
