<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';

import { h } from 'vue';

import type { Provider } from '~/types/provider';

import { PROVIDER_CATEGORY } from '~/types/provider';

definePageMeta({
  name: 'providers-bus-agencies',
});

const extraColumns: TableColumn<Provider>[] = [
  {
    accessorKey: 'active',
    header: 'Estado',
    cell: ({ row }) => {
      const active = row.getValue('active') as boolean;
      return h(resolveComponent('UBadge'), {
        variant: 'subtle',
        color: active ? 'primary' : 'warning',
      }, () => active ? 'Activo' : 'Inactivo');
    },
  },
];
</script>

<template>
  <ProviderCategoryList
    :category="PROVIDER_CATEGORY.BUS_AGENCIES"
    :detail-route="(provider: Provider) => `/providers/bus-agencies/${provider.id}`"
    :extra-columns="extraColumns"
  />
</template>
