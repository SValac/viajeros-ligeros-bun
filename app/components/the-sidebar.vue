<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui';

const items: NavigationMenuItem[][] = [[{
  label: 'Inicio',
  icon: 'i-lucide-house',
  to: '/',
}, {
  label: 'Viajes',
  icon: 'i-lucide-map',
  to: { name: 'travels-dashboard' },
}, {
  label: 'Viajeros',
  icon: 'i-lucide-users',
  to: { name: 'travelers-index' },
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
}]];
</script>

<template>
  <UDashboardSidebar
    collapsible
    resizable
    :ui="{ footer: 'border-t border-default' }"
  >
    <template #header="{ collapsed }">
      <Logo class="w-auto shrink-0 mx-auto" />
      <h1
        v-if="!collapsed"
        class="text-center text-lg font-semibold"
      >
        Viajeros Ligeros
      </h1>
    </template>

    <template #default="{ collapsed }">
      <UButton
        :label="collapsed ? undefined : 'Search...'"
        icon="i-lucide-search"
        color="neutral"
        variant="outline"
        block
        :square="collapsed"
      >
        <template v-if="!collapsed" #trailing>
          <div class="flex items-center gap-0.5 ms-auto">
            <UKbd value="meta" variant="subtle" />
            <UKbd value="K" variant="subtle" />
          </div>
        </template>
      </UButton>

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
      <UButton
        :avatar="{
          src: 'https://github.com/benjamincanac.png',
        }"
        :label="collapsed ? undefined : 'Benjamin'"
        color="neutral"
        variant="ghost"
        class="w-full"
        :block="collapsed"
      />
    </template>
  </UDashboardSidebar>
</template>

<style scoped>

</style>
