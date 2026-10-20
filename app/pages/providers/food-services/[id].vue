<script setup lang="ts">
import { PROVIDER_CATEGORY } from '~/types/provider';

definePageMeta({
  name: 'providers-food-services-detail',
});
</script>

<template>
  <ProviderDetailPage
    :category="PROVIDER_CATEGORY.FOOD_SERVICES"
  />
</template>
