<script setup lang="ts">
import { useTravelRoute } from '~/composables/travels/use-travel-route';

definePageMeta({
  name: 'travel-buses',
});

const cotizacionStore = useCotizacionStore();

const { travelId } = useTravelRoute();

// Los autobuses (y sus coordinadores) viven en la cotización: cargarla al abrir la pestaña
watch(travelId, id => cotizacionStore.fetchByTravel(id), { immediate: true });
</script>

<template>
  <div class="space-y-3">
    <p class="text-sm text-muted">
      Coordinadores y operadores de cada autobús. Los autobuses se apartan en la cotización.
    </p>
    <TravelBusesSection :travel-id="travelId" editable />
  </div>
</template>
