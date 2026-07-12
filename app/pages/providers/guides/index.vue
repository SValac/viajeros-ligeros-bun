<script setup lang="ts">
import { PROVIDER_CATEGORY } from '~/types/provider';

definePageMeta({
  name: 'providers-guides',
});
</script>

<template>
  <ProviderCategoryList :category="PROVIDER_CATEGORY.GUIDES" />
</template>
