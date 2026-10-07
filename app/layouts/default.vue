<script setup lang="ts">
const route = useRoute();

// Título del navbar: la sección del menú lateral según el primer segmento de la ruta.
const SECTION_TITLES: Record<string, string> = {
  travels: 'Viajes',
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
          <!-- #left en lugar de `title`: el título de la sección no es el <h1>, cada página tiene el suyo -->
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
