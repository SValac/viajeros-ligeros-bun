<script setup lang="ts">

</script>

<template>
  <main class="flex flex-1">
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
        <div class="h-full bg-amber-200" />
      </template>
    </UDashboardPanel>
  </main>
</template>

<style scoped>

</style>
