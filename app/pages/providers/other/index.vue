<script setup lang="ts">
import type { Provider } from '~/types/provider';

import { PROVIDER_CATEGORY } from '~/types/provider';

definePageMeta({
  name: 'providers-other',
});
</script>

<template>
  <ProviderCategoryList
    :category="PROVIDER_CATEGORY.OTHER"
    :detail-route="(provider: Provider) => `/providers/other/${provider.id}`"
    create-route="/providers/other/new"
  />
</template>
