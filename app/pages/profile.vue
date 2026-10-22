<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui';

import { toErrorMessage } from '~/utils/error-message';

// Parent of the profile tabs (app/pages/profile/*). Loads the profile once and renders
// the active tab only after it is available, since each tab's form initializes from it.
const agencyProfileStore = useAgencyProfileStore();
// Its own ref, not the store's `error`: a failed save in a tab would overwrite that one.
const loadError = shallowRef<string | null>(null);

onMounted(async () => {
  try {
    await agencyProfileStore.fetchProfile({ force: true });
  }
  catch (e) {
    loadError.value = toErrorMessage(e, 'Intenta de nuevo');
  }
});

// To add a tab: create app/pages/profile/<name>.vue and add its entry here.
const tabs: NavigationMenuItem[] = [
  { label: 'Datos generales', icon: 'i-lucide-building-2', to: { name: 'profile' }, exact: true },
  { label: 'Página principal', icon: 'i-lucide-house', to: { name: 'profile-home' } },
  { label: 'Nosotros', icon: 'i-lucide-users', to: { name: 'profile-about' } },
  { label: 'SEO y redes', icon: 'i-lucide-search', to: { name: 'profile-seo' } },
];
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <PageHeader
      title="Perfil de agencia"
      description="Estos datos son públicos: aparecen en tu sitio y junto a tus viajes en la web."
      icon="i-lucide-building-2"
    />

    <UNavigationMenu
      :items="tabs"
      highlight
      class="border-b border-default overflow-x-auto"
      :ui="{ root: '[&>div]:min-w-max' }"
    />

    <LoadSkeleton
      v-if="agencyProfileStore.loading && !agencyProfileStore.profile"
      variant="form"
      label="el perfil"
    />

    <UAlert
      v-else-if="!agencyProfileStore.profile"
      title="No se pudo cargar el perfil"
      :description="loadError ?? undefined"
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
