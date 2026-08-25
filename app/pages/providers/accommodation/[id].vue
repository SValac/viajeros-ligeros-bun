<script setup lang="ts">
import { PROVIDER_CATEGORY } from '~/types/provider';

definePageMeta({
  name: 'providers-accommodation-detail',
});

const route = useRoute();
const router = useRouter();
const providerStore = useProviderStore();

const provider = computed(() => providerStore.getProviderById(route.params.id as string));

// Redirect if provider not found or not hospedaje
watchEffect(() => {
  if (provider.value === undefined) {
    router.replace('/providers/accommodation');
  }
  else if (provider.value.category !== PROVIDER_CATEGORY.ACCOMMODATION) {
    router.replace('/providers/accommodation');
  }
});
</script>

<template>
  <div v-if="provider" class="space-y-6">
    <!-- Header con breadcrumb -->
    <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
      <NuxtLink to="/providers/accommodation" class="hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
        Hospedajes
      </NuxtLink>
      <span class="i-lucide-chevron-right w-4 h-4" />
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
</template>
