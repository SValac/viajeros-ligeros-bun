<script setup lang="ts">
import { PROVIDER_CATEGORY } from '~/types/provider';

definePageMeta({
  name: 'providers-transportation-detail',
});
</script>

<template>
  <ProviderDetailPage
    :category="PROVIDER_CATEGORY.TRANSPORTATION"
  />
</template>
