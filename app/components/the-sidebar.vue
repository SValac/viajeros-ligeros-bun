<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui';

import UserMenu from './user-menu.vue';

const route = useRoute();

// Logo y nombre vienen del perfil de la agencia (/profile); sin ellos (o sin perfil, p. ej. un coordinador) quedan los de la app
const agencyProfileStore = useAgencyProfileStore();
onMounted(() => agencyProfileStore.fetchProfile());

const items = computed<NavigationMenuItem[][]>(() => [[{
  label: 'Inicio',
  icon: 'i-lucide-house',
  to: '/',
}, {
  label: 'Viajes',
  icon: 'i-lucide-map',
  to: { name: 'travels-dashboard' },
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
  }, {
    label: 'Guías',
    icon: 'i-lucide-user-search',
    to: '/providers/guides',
  }, {
    label: 'Transportes',
    icon: 'i-lucide-car',
    to: '/providers/transportation',
  }, {
    label: 'Hospedajes',
    icon: 'i-lucide-hotel',
    to: '/providers/accommodation',
  }, {
    label: 'Agencias de Autobús',
    icon: 'i-lucide-bus',
    to: '/providers/bus-agencies',
  }, {
    label: 'Comidas',
    icon: 'i-lucide-utensils',
    to: '/providers/food-services',
  }, {
    label: 'Otros',
    icon: 'i-lucide-package',
    to: '/providers/other',
  }],
}], [{
  label: 'Feedback',
  icon: 'i-lucide-message-circle',
  to: 'https://github.com/nuxt-ui-templates/dashboard',
  target: '_blank',
}, {
  label: 'Help & Support',
  icon: 'i-lucide-info',
  to: 'https://github.com/nuxt/ui',
  target: '_blank',
}]]);
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
      <h1
        v-if="!collapsed"
        class="text-center text-lg font-semibold"
      >
        {{ agencyProfileStore.profile?.companyName || 'Viajeros Ligeros' }}
      </h1>
    </template>

    <template #default="{ collapsed }">
      <UNavigationMenu
        :collapsed="collapsed"
        :items="items[0]"
        orientation="vertical"
        :popover="collapsed"
      />

      <UNavigationMenu
        :collapsed="collapsed"
        :items="items[1]"
        orientation="vertical"
        class="mt-auto"
      />
    </template>

    <template #footer="{ collapsed }">
      <UserMenu :collapsed="collapsed" />
    </template>
  </UDashboardSidebar>
</template>

<style scoped>

</style>
