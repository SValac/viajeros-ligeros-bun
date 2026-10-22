<script setup lang="ts">
import { PROVIDER_CATEGORY } from '~/types/provider';

definePageMeta({
  name: 'providers-other-new',
});
</script>

<template>
  <ProviderCreatePage
    :category="PROVIDER_CATEGORY.OTHER"
  />
</template>
