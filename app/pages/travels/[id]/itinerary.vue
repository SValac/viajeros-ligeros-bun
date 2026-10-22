<script setup lang="ts">
import { useTravelRoute } from '~/composables/travels/use-travel-route';

definePageMeta({
  name: 'travel-itinerary',
});

const { travelId, travel } = useTravelRoute();
</script>

<template>
  <UCard v-if="travel">
    <TravelActivityList
      :activities="travel.itinerary"
      :start-date="travel.startDate"
      :end-date="travel.endDate"
      :travel-id="travelId"
    />
  </UCard>
</template>
