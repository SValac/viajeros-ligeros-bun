<script setup lang="ts">
import { PROVIDER_CATEGORY } from '~/types/provider';

definePageMeta({
  name: 'providers-accommodation-detail',
});

const route = useRoute();
const router = useRouter();
const providerStore = useProviderStore();

const provider = computed(() => providerStore.getProviderById(route.params.id as string));

// Back to the list if the provider doesn't exist or belongs to another category. Only once the
// catalog has loaded: before that, every provider looks missing.
watch(
  () => [providerStore.isLoaded, provider.value] as const,
  ([isLoaded, current]) => {
    if (isLoaded && current?.category !== PROVIDER_CATEGORY.ACCOMMODATION)
      router.replace('/providers/accommodation');
  },
  { immediate: true },
);
</script>

<template>
  <CatalogLoadState
    :is-loaded="providerStore.isLoaded"
    :load-error="providerStore.loadError"
    label="los proveedores"
    @retry="providerStore.refetch()"
  >
    <div v-if="provider" class="space-y-6">
      <!-- Header con breadcrumb -->
      <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <NuxtLink to="/providers/accommodation" class="hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
          Hospedajes
        </NuxtLink>
        <UIcon name="i-lucide-chevron-right" class="w-4 h-4" />
        <span class="text-gray-900 dark:text-white font-medium">{{ provider.name }}</span>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <ProviderDetailCard :provider="provider" />

        <!-- Gestión de habitaciones -->
        <HotelRoomsManager
          :provider="provider"
          @close="router.push('/providers/accommodation')"
        />
      </div>
    </div>
  </CatalogLoadState>
</template>
