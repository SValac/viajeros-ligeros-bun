<script setup lang="ts">
import { useTravelRoute } from '~/composables/travels/use-travel-route';

definePageMeta({
  name: 'travel-itinerary',
});

const { travelId, travel } = useTravelRoute();
</script>

<template>
  <UCard v-if="travel">
    <!-- Con travelId, la lista guarda cada cambio al momento -->
    <TravelActivityList
      :model-value="travel.itinerary"
      :start-date="travel.startDate"
      :end-date="travel.endDate"
      :travel-id="travelId"
    />
  </UCard>
</template>
