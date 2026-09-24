<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui';

// Parent of the profile tabs (app/pages/profile/*). Loads the profile once and renders
// the active tab only after it is available, since each tab's form initializes from it.
const agencyProfileStore = useAgencyProfileStore();

onMounted(() => agencyProfileStore.fetchProfile({ force: true }));

// To add a tab: create app/pages/profile/<name>.vue and add its entry here.
const tabs: NavigationMenuItem[] = [
  { label: 'Datos generales', icon: 'i-lucide-building-2', to: { name: 'profile' }, exact: true },
  { label: 'Nosotros', icon: 'i-lucide-users', to: { name: 'profile-about' } },
];
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <div class="flex items-center gap-4">
      <UIcon name="i-lucide-building-2" class="size-10 text-primary" />
      <div>
        <h1 class="text-3xl font-bold text-highlighted">
          Perfil de agencia
        </h1>
        <p class="mt-1 text-muted">
          Estos datos son públicos: aparecen en tu sitio y junto a tus viajes en la web.
        </p>
      </div>
    </div>

    <UNavigationMenu
      :items="tabs"
      highlight
      class="border-b border-default"
    />

    <div
      v-if="agencyProfileStore.loading && !agencyProfileStore.profile"
      class="flex justify-center py-12"
    >
      <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-muted" />
    </div>

    <UAlert
      v-else-if="!agencyProfileStore.profile"
      title="No se pudo cargar el perfil"
      :description="agencyProfileStore.error ?? undefined"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-circle"
    />

    <template v-else>
      <UAlert
        v-if="!agencyProfileStore.isComplete"
        title="Completa tu perfil para publicar viajes"
        description="Necesitas el nombre de tu empresa y tu estado (en «Datos generales») para que tus viajes aparezcan correctamente en la web."
        color="warning"
        variant="subtle"
        icon="i-lucide-triangle-alert"
      />

      <NuxtPage />
    </template>
  </div>
</template>
