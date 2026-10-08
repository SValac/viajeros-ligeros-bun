<script setup lang="ts">
import type { Provider } from '~/types/provider';

import { PROVIDER_CATEGORY } from '~/types/provider';

definePageMeta({
  name: 'providers-tickets',
});
</script>

<template>
  <ProviderCategoryList
    :category="PROVIDER_CATEGORY.TICKETS"
    :detail-route="(provider: Provider) => `/providers/tickets/${provider.id}`"
    create-route="/providers/tickets/new"
  />
</template>
