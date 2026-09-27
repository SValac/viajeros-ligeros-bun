<script setup lang="ts">
import { useTravelRoute } from '~/composables/travels/use-travel-route';

definePageMeta({
  name: 'travel-gallery',
});

const { travelId } = useTravelRoute();
</script>

<template>
  <UCard>
    <TravelGallerySection :travel-id="travelId" />
  </UCard>
</template>
