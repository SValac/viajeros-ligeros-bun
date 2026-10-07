<script setup lang="ts">
import { PROVIDER_CATEGORY } from '~/types/provider';

definePageMeta({
  name: 'providers-bus-agencies-detail',
});

const route = useRoute();
const router = useRouter();
const providerStore = useProviderStore();

const provider = computed(() => providerStore.getProviderById(route.params.id as string));

watchEffect(() => {
  if (provider.value === undefined) {
    router.replace('/providers/bus-agencies');
  }
  else if (provider.value.category !== PROVIDER_CATEGORY.BUS_AGENCIES) {
    router.replace('/providers/bus-agencies');
  }
});
</script>

<template>
  <div v-if="provider" class="space-y-6">
    <!-- Breadcrumb -->
    <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
      <NuxtLink to="/providers/bus-agencies" class="hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
        Agencias de Autobús
      </NuxtLink>
      <UIcon name="i-lucide-chevron-right" class="w-4 h-4" />
      <span class="text-gray-900 dark:text-white font-medium">{{ provider.name }}</span>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <ProviderDetailCard :provider="provider" />

      <!-- Unidades -->
      <BusList :provider-id="provider.id" />
    </div>
  </div>
</template>
