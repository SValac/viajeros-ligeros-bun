<script setup lang="ts">
import { PROVIDER_CATEGORY } from '~/types/provider';

definePageMeta({
  name: 'providers-guides-new',
});
</script>

<template>
  <ProviderCreatePage
    :category="PROVIDER_CATEGORY.GUIDES"
  />
</template>
