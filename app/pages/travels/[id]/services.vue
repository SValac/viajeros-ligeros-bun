<script setup lang="ts">
import { useTravelRoute } from '~/composables/travels/use-travel-route';

definePageMeta({
  name: 'travel-services',
});

const { travelId, travel } = useTravelRoute();
</script>

<template>
  <div v-if="travel" class="space-y-3">
    <p class="text-sm text-muted">
      Lo que incluye (o no incluye) el viaje, tal como se muestra en la web. Son independientes de los proveedores de la cotización.
    </p>
    <TravelServiceList
      :services="travel.services"
      :travel-id="travelId"
    />
  </div>
</template>
