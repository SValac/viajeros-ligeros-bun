<script setup lang="ts">
import { useProviderDetail } from '~/composables/providers/use-provider-detail';
import { PROVIDER_CATEGORY } from '~/types/provider';

definePageMeta({
  name: 'providers-guides-detail',
});

const { provider, providerStore } = useProviderDetail(PROVIDER_CATEGORY.GUIDES);
</script>

<template>
  <LoadState
    :is-loaded="providerStore.isLoaded"
    :load-error="providerStore.loadError"
    label="los proveedores"
    @retry="providerStore.refetch()"
  >
    <div v-if="provider" class="space-y-6">
      <!-- Breadcrumb -->
      <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <NuxtLink to="/providers/guides" class="hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
          Guías
        </NuxtLink>
        <UIcon name="i-lucide-chevron-right" class="w-4 h-4" />
        <span class="text-gray-900 dark:text-white font-medium">{{ provider.name }}</span>
      </div>

      <div class="max-w-3xl mx-auto w-full">
        <ProviderDetailCard :provider="provider" />
      </div>
    </div>
  </LoadState>
</template>
