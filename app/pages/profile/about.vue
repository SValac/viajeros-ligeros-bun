<script setup lang="ts">
import type { AboutPage } from '~/types/agency-profile';

definePageMeta({
  name: 'profile-about',
});

const agencyProfileStore = useAgencyProfileStore();
const toast = useToast();

// Rendered by app/pages/profile.vue only once the profile has loaded.
const profile = computed(() => agencyProfileStore.profile!);

async function handleSubmit(page: AboutPage | null) {
  const success = await agencyProfileStore.saveAboutPage(page);
  if (success) {
    toast.add({
      title: page ? 'Página Nosotros guardada' : 'Página Nosotros quitada',
      color: 'success',
      icon: 'i-lucide-check-circle',
    });
    return;
  }
  toast.add({
    title: 'No se pudo guardar la página Nosotros',
    description: agencyProfileStore.error ?? undefined,
    color: 'error',
    icon: 'i-lucide-alert-circle',
  });
}
</script>

<template>
  <AgencyAboutPageForm
    :profile="profile"
    :saving="agencyProfileStore.saving"
    @submit="handleSubmit"
  />
</template>
