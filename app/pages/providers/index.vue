<script setup lang="ts">
import type { ProviderCategory } from '~/types/provider';

import { PROVIDER_CATEGORY } from '~/types/provider';

definePageMeta({
  name: 'providers-dashboard',
});

const providerStore = useProviderStore();

const stats = computed(() => providerStore.statsByCategory);
const total = computed(() => providerStore.totalProviders);

type CategoryInfo = {
  key: ProviderCategory;
  label: string;
  icon: string;
  color: string;
  textColor: string;
  iconColor: string;
  route: string;
};

const categories: CategoryInfo[] = [
  {
    key: PROVIDER_CATEGORY.GUIAS,
    label: 'Guías',
    icon: 'i-lucide-user-search',
    color: 'blue',
    textColor: 'text-blue-600 dark:text-blue-400',
    iconColor: 'text-blue-400',
    route: '/providers/guides',
  },
  {
    key: PROVIDER_CATEGORY.TRANSPORTE,
    label: 'Transporte',
    icon: 'i-lucide-car',
    color: 'purple',
    textColor: 'text-purple-600 dark:text-purple-400',
    iconColor: 'text-purple-400',
    route: '/providers/transportation',
  },
  {
    key: PROVIDER_CATEGORY.HOSPEDAJE,
    label: 'Hospedaje',
    icon: 'i-lucide-hotel',
    color: 'green',
    textColor: 'text-green-600 dark:text-green-400',
    iconColor: 'text-green-400',
    route: '/providers/accommodation',
  },
  {
    key: PROVIDER_CATEGORY.AGENCIAS_AUTOBUS,
    label: 'Agencias de Autobús',
    icon: 'i-lucide-bus',
    color: 'orange',
    textColor: 'text-orange-600 dark:text-orange-400',
    iconColor: 'text-orange-400',
    route: '/providers/bus-agencies',
  },
  {
    key: PROVIDER_CATEGORY.COMIDAS,
    label: 'Comidas',
    icon: 'i-lucide-utensils',
    color: 'amber',
    textColor: 'text-amber-600 dark:text-amber-400',
    iconColor: 'text-amber-400',
    route: '/providers/food-services',
  },
  {
    key: PROVIDER_CATEGORY.OTROS,
    label: 'Otros',
    icon: 'i-lucide-package',
    color: 'gray',
    textColor: 'text-gray-600 dark:text-gray-400',
    iconColor: 'text-gray-400',
    route: '/providers/other',
  },
];
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
        :key="cat.key"
        :to="cat.route"
        class="block"
      >
        <UCard class="hover:ring-2 hover:ring-primary-500 dark:hover:ring-primary-400 transition-shadow cursor-pointer">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ cat.label }}
              </p>
              <p class="text-2xl font-bold mt-1" :class="cat.textColor">
                {{ stats[cat.key] }}
              </p>
              <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {{ stats[cat.key] === 1 ? 'proveedor' : 'proveedores' }}
              </p>
            </div>
            <UIcon
              :name="cat.icon"
              class="w-10 h-10"
              :class="cat.iconColor"
            />
          </div>
        </UCard>
      </NuxtLink>
    </div>
  </div>
</template>
