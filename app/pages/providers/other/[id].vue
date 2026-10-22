<script setup lang="ts">
import { PROVIDER_CATEGORY } from '~/types/provider';

definePageMeta({
  name: 'providers-other-detail',
});
</script>

<template>
  <ProviderDetailPage
    :category="PROVIDER_CATEGORY.OTHER"
  />
</template>
