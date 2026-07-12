<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';

import { h } from 'vue';

import type { Provider } from '~/types/provider';

import { PROVIDER_CATEGORY } from '~/types/provider';

definePageMeta({
  name: 'providers-accommodation',
});

const extraColumns: TableColumn<Provider>[] = [
  {
    id: 'habitaciones',
    header: 'Habitaciones',
    cell: ({ row }) =>
      h(resolveComponent('HotelRoomsSummary'), { providerId: row.original.id }),
  },
];
</script>

<template>
  <ProviderCategoryList
    :category="PROVIDER_CATEGORY.ACCOMMODATION"
    :detail-route="(provider: Provider) => `/providers/accommodation/${provider.id}`"
    :extra-columns="extraColumns"
  />
</template>
