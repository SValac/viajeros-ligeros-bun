<script setup lang="ts">
import { PROVIDER_CATEGORY } from '~/types/provider';

definePageMeta({
  name: 'providers-transportation-detail',
});

const route = useRoute();
const router = useRouter();
const providerStore = useProviderStore();

const provider = computed(() => providerStore.getProviderById(route.params.id as string));

watchEffect(() => {
  if (provider.value === undefined) {
    router.replace('/providers/transportation');
  }
  else if (provider.value.category !== PROVIDER_CATEGORY.TRANSPORTATION) {
    router.replace('/providers/transportation');
  }
});
</script>

<template>
  <div v-if="provider" class="space-y-6">
    <!-- Breadcrumb -->
    <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
      <NuxtLink to="/providers/transportation" class="hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
        Transporte
      </NuxtLink>
      <span class="i-lucide-chevron-right w-4 h-4" />
      <span class="text-gray-900 dark:text-white font-medium">{{ provider.name }}</span>
    </div>

    <div class="max-w-3xl mx-auto w-full">
      <ProviderDetailCard :provider="provider" />
    </div>
  </div>
</template>
