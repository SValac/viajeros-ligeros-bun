<script setup lang="ts">
import type { Provider } from '~/types/provider';

import { PROVIDER_CATEGORY } from '~/types/provider';

definePageMeta({
  name: 'providers-transportation',
});
</script>

<template>
  <ProviderCategoryList
    :category="PROVIDER_CATEGORY.TRANSPORTATION"
    :detail-route="(provider: Provider) => `/providers/transportation/${provider.id}`"
    create-route="/providers/transportation/new"
  />
</template>
