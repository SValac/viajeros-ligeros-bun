<script setup lang="ts">
const route = useRoute();

// Navbar title: the side menu section matching the route's first segment.
const SECTION_TITLES: Record<string, string> = {
  travels: 'Viajes',
  calendar: 'Calendario',
  quotations: 'Cotizaciones',
  payments: 'Pagos',
  coordinators: 'Coordinadores',
  providers: 'Proveedores',
  profile: 'Perfil de agencia',
};

const sectionTitle = computed(() => SECTION_TITLES[route.path.split('/')[1] ?? ''] ?? '');
</script>

<template>
  <UDashboardGroup>
    <TheSidebar />
    <UDashboardPanel
      id="main"
      resizable
    >
      <template #header>
        <UDashboardNavbar>
          <!-- #left instead of `title`: the section title isn't the <h1>, each page has its own -->
          <template #left>
            <UDashboardSidebarCollapse />
            <span class="font-semibold text-highlighted truncate">{{ sectionTitle }}</span>
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <div class="h-full">
          <slot />
        </div>
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>

<style scoped>

</style>
