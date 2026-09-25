<script setup lang="ts">
import type { HomePage } from '~/types/agency-profile';

definePageMeta({
  name: 'profile-home',
});

const agencyProfileStore = useAgencyProfileStore();
const toast = useToast();

// Rendered by app/pages/profile.vue only once the profile has loaded.
const profile = computed(() => agencyProfileStore.profile!);

async function handleSubmit(page: HomePage | null) {
  const success = await agencyProfileStore.saveHomePage(page);
  if (success) {
    toast.add({
      title: page ? 'Página principal guardada' : 'Página principal restaurada',
      color: 'success',
      icon: 'i-lucide-check-circle',
    });
    return;
  }
  toast.add({
    title: 'No se pudo guardar la página principal',
    description: agencyProfileStore.error ?? undefined,
    color: 'error',
    icon: 'i-lucide-alert-circle',
  });
}
</script>

<template>
  <AgencyHomePageForm
    :profile="profile"
    :saving="agencyProfileStore.saving"
    @submit="handleSubmit"
  />
</template>
