<script setup lang="ts">
import type { Provider } from '~/types/provider';

import { PROVIDER_CATEGORY } from '~/types/provider';

definePageMeta({
  name: 'providers-food-services',
});
</script>

<template>
  <ProviderCategoryList
    :category="PROVIDER_CATEGORY.FOOD_SERVICES"
    :detail-route="(provider: Provider) => `/providers/food-services/${provider.id}`"
    create-route="/providers/food-services/new"
  />
</template>
