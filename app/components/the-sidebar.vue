<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui';

import { PROVIDER_CATEGORY_LIST } from '~/utils/provider-categories';

import UserMenu from './user-menu.vue';

const route = useRoute();

// Logo and name come from the agency profile (/profile); without them (or without a profile, e.g. a coordinator) the app's ones stay
const agencyProfileStore = useAgencyProfileStore();
onMounted(() => agencyProfileStore.fetchProfile());

const items = computed<NavigationMenuItem[]>(() => [{
  label: 'Viajes',
  icon: 'i-lucide-map',
  to: { name: 'travels-dashboard' },
  // `/travels/[id]/*` and `/travels/new` are sibling routes of `/travels/dashboard`: force it active
  active: route.path.startsWith('/travels'),
}, {
  label: 'Calendario',
  icon: 'i-lucide-calendar-days',
  to: { name: 'calendar' },
}, {
  label: 'Cotizaciones',
  icon: 'i-lucide-calculator',
  to: { name: 'quotations-index' },
  // `/quotations/[id]` is a sibling route (not a child) of `/quotations`: force it active
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
  // One entry per category, in the order of PROVIDER_CATEGORY_META
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
      <!-- Not an <h1>: each screen's <h1> is the page title -->
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
