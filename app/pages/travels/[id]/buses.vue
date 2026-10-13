<script setup lang="ts">
import { useTravelRoute } from '~/composables/travels/use-travel-route';

definePageMeta({
  name: 'travel-buses',
});

const { travelId } = useTravelRoute();
</script>

<template>
  <div class="space-y-3">
    <p class="text-sm text-muted">
      Coordinadores y operadores de cada autobús. Los autobuses se apartan en la cotización.
    </p>
    <TravelBusesSection :travel-id="travelId" editable />
  </div>
</template>
