<script setup lang="ts">
import { useTravelRoute } from '~/composables/travels/use-travel-route';

definePageMeta({
  name: 'travel-payments',
});

const { travelId } = useTravelRoute();
</script>

<template>
  <TravelPaymentsPanel :travel-id="travelId" />
</template>
