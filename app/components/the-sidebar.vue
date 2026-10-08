<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui';

import { PROVIDER_CATEGORY_LIST } from '~/utils/provider-categories';

import UserMenu from './user-menu.vue';

const route = useRoute();

// Logo y nombre vienen del perfil de la agencia (/profile); sin ellos (o sin perfil, p. ej. un coordinador) quedan los de la app
const agencyProfileStore = useAgencyProfileStore();
onMounted(() => agencyProfileStore.fetchProfile());

const items = computed<NavigationMenuItem[]>(() => [{
  label: 'Viajes',
  icon: 'i-lucide-map',
  to: { name: 'travels-dashboard' },
  // `/travels/[id]/*` y `/travels/new` son rutas hermanas de `/travels/dashboard`: forzar el activo
  active: route.path.startsWith('/travels'),
}, {
  label: 'Calendario',
  icon: 'i-lucide-calendar-days',
  to: { name: 'calendar' },
}, {
  label: 'Cotizaciones',
  icon: 'i-lucide-calculator',
  to: { name: 'quotations-index' },
  // `/quotations/[id]` es ruta hermana (no hija) de `/quotations`: forzar el activo
  active: route.path.startsWith('/quotations'),
}, {
  label: 'Pagos',
  icon: 'i-lucide-credit-card',
  to: { name: 'payments-index' },
}, {
  label: 'Coordinadores',
  icon: 'i-lucide-user-star',
  to: { name: 'coordinators-index' },
}, {
  label: 'Proveedores',
  icon: 'i-lucide-handshake',
  defaultOpen: true,
  children: [{
    label: 'Todos',
    icon: 'i-lucide-list',
    to: { name: 'providers-dashboard' },
  },
  // Una entrada por categoría, en el orden de PROVIDER_CATEGORY_META
  ...PROVIDER_CATEGORY_LIST.map(meta => ({ label: meta.label, icon: meta.icon, to: meta.route }))],
}]);
</script>

<template>
  <UDashboardSidebar
    collapsible
    resizable
    :ui="{ footer: 'border-t border-default' }"
  >
    <template #header="{ collapsed }">
      <Logo
        :src="agencyProfileStore.profile?.logoUrl"
        :alt="agencyProfileStore.profile?.companyName || 'Logo'"
        class="w-auto shrink-0 mx-auto"
      />
      <!-- No es <h1>: el <h1> de cada pantalla es el título de la página -->
      <p
        v-if="!collapsed"
        class="text-center text-lg font-semibold text-highlighted"
      >
        {{ agencyProfileStore.profile?.companyName || 'Viajeros Ligeros' }}
      </p>
    </template>

    <template #default="{ collapsed }">
      <UNavigationMenu
        :collapsed="collapsed"
        :items="items"
        orientation="vertical"
        :popover="collapsed"
      />
    </template>

    <template #footer="{ collapsed }">
      <UserMenu :collapsed="collapsed" />
    </template>
  </UDashboardSidebar>
</template>

<style scoped>

</style>
