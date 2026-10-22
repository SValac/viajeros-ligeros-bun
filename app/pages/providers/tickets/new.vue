<script setup lang="ts">
import { PROVIDER_CATEGORY } from '~/types/provider';

definePageMeta({
  name: 'providers-tickets-new',
});
</script>

<template>
  <ProviderCreatePage
    :category="PROVIDER_CATEGORY.TICKETS"
  />
</template>
