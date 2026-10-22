<script setup lang="ts">
import { PROVIDER_CATEGORY } from '~/types/provider';

definePageMeta({
  name: 'providers-bus-agencies-new',
});
</script>

<template>
  <ProviderCreatePage
    :category="PROVIDER_CATEGORY.BUS_AGENCIES"
  />
</template>
