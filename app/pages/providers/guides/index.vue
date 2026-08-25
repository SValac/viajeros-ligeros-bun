<script setup lang="ts">
import type { Provider } from '~/types/provider';

import { PROVIDER_CATEGORY } from '~/types/provider';

definePageMeta({
  name: 'providers-guides',
});
</script>

<template>
  <ProviderCategoryList
    :category="PROVIDER_CATEGORY.GUIDES"
    :detail-route="(provider: Provider) => `/providers/guides/${provider.id}`"
    create-route="/providers/guides/new"
  />
</template>
