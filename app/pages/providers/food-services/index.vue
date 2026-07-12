<script setup lang="ts">
import { PROVIDER_CATEGORY } from '~/types/provider';

definePageMeta({
  name: 'providers-food-services',
});
</script>

<template>
  <ProviderCategoryList :category="PROVIDER_CATEGORY.FOOD_SERVICES" />
</template>
