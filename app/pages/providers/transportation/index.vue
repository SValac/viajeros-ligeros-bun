<script setup lang="ts">
import { PROVIDER_CATEGORY } from '~/types/provider';

definePageMeta({
  name: 'providers-transportation',
});
</script>

<template>
  <ProviderCategoryList :category="PROVIDER_CATEGORY.TRANSPORTATION" />
</template>
