<script setup lang="ts">
import { PROVIDER_CATEGORY } from '~/types/provider';

definePageMeta({
  name: 'providers-bus-agencies-detail',
});
</script>

<template>
  <ProviderDetailPage
    :category="PROVIDER_CATEGORY.BUS_AGENCIES"
  >
    <template #aside="{ provider }">
      <BusList :provider-id="provider.id" />
    </template>
  </ProviderDetailPage>
</template>
