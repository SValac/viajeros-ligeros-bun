<script setup lang="ts">
import type { Provider, ProviderCategory } from '~/types/provider';

import { useProviderDetail } from '~/composables/providers/use-provider-detail';
import { PROVIDER_CATEGORY_META } from '~/utils/provider-categories';

// Body of every /providers/<category>/[id] page: LoadState, breadcrumb back to the category
// and ProviderDetailCard. A filled `aside` slot switches to two columns (bus units, rooms).
type Props = {
  category: ProviderCategory;
};

const { category } = defineProps<Props>();

defineSlots<{
  /** Right column next to the card; gets the loaded provider */
  aside?: (props: { provider: Provider }) => unknown;
}>();

const { provider, providerStore } = useProviderDetail(category);
const label = computed(() => PROVIDER_CATEGORY_META[category].label);
const route = computed(() => PROVIDER_CATEGORY_META[category].route);
</script>

<template>
  <LoadState
    :is-loaded="providerStore.isLoaded"
    :load-error="providerStore.loadError"
    label="los proveedores"
    skeleton="detail"
    @retry="providerStore.refetch()"
  >
    <div v-if="provider" class="space-y-6">
      <!-- Breadcrumb -->
      <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <NuxtLink :to="route" class="hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
          {{ label }}
        </NuxtLink>
        <UIcon name="i-lucide-chevron-right" class="w-4 h-4" />
        <span class="text-gray-900 dark:text-white font-medium">{{ provider.name }}</span>
      </div>

      <div
        v-if="$slots.aside"
        class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start"
      >
        <ProviderDetailCard :provider="provider" />
        <slot name="aside" :provider="provider" />
      </div>
      <div
        v-else
        class="max-w-3xl mx-auto w-full"
      >
        <ProviderDetailCard :provider="provider" />
      </div>
    </div>
  </LoadState>
</template>
