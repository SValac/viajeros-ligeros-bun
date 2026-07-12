<script setup lang="ts">
import { PROVIDER_CATEGORY } from '~/types/provider';

definePageMeta({
  name: 'providers-other',
});
</script>

<template>
  <ProviderCategoryList :category="PROVIDER_CATEGORY.OTHER" />
</template>
