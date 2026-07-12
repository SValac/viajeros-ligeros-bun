<script setup lang="ts">
import { PROVIDER_CATEGORY_META } from '~/utils/provider-categories';

definePageMeta({
  name: 'providers-dashboard',
});

const providerStore = useProviderStore();

const stats = computed(() => providerStore.statsByCategory);
const total = computed(() => providerStore.totalProviders);

const categories = Object.values(PROVIDER_CATEGORY_META);
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
        Gestión de Proveedores
      </h1>
      <p class="text-gray-500 dark:text-gray-400 mt-1">
        Administra el catálogo de proveedores de servicios
      </p>
    </div>

    <!-- Resumen total -->
    <UCard>
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Total Proveedores Activos
          </p>
          <p class="text-3xl font-bold text-gray-900 dark:text-white mt-1">
            {{ total }}
          </p>
        </div>
        <UIcon name="i-lucide-handshake" class="w-12 h-12 text-gray-300 dark:text-gray-600" />
      </div>
    </UCard>

    <!-- Categorías -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <NuxtLink
        v-for="cat in categories"
        :key="cat.category"
        :to="cat.route"
        class="block"
      >
        <UCard class="hover:ring-2 hover:ring-primary-500 dark:hover:ring-primary-400 transition-shadow cursor-pointer">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ cat.label }}
              </p>
              <p class="text-2xl font-bold mt-1" :class="cat.dashboardTextColorClass">
                {{ stats[cat.category] }}
              </p>
              <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {{ stats[cat.category] === 1 ? 'proveedor' : 'proveedores' }}
              </p>
            </div>
            <UIcon
              :name="cat.icon"
              class="w-10 h-10"
              :class="cat.iconColorClass"
            />
          </div>
        </UCard>
      </NuxtLink>
    </div>
  </div>
</template>
