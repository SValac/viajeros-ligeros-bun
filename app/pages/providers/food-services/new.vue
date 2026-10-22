<script setup lang="ts">
import { PROVIDER_CATEGORY } from '~/types/provider';

definePageMeta({
  name: 'providers-food-services-new',
});
</script>

<template>
  <ProviderCreatePage
    :category="PROVIDER_CATEGORY.FOOD_SERVICES"
  />
</template>
