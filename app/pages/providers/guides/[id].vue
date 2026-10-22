<script setup lang="ts">
import { PROVIDER_CATEGORY } from '~/types/provider';

definePageMeta({
  name: 'providers-guides-detail',
});
</script>

<template>
  <ProviderDetailPage
    :category="PROVIDER_CATEGORY.GUIDES"
  />
</template>
