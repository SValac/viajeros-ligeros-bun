<script setup lang="ts">

</script>

<template>
  <UDashboardGroup>
    <TheSidebar />
    <UDashboardPanel
      id="inbox-1"
      resizable
    >
      <template #header>
        <UDashboardNavbar title="Inbox">
          <template #leading>
            <UDashboardSidebarCollapse />
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
