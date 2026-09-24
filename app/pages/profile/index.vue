<script setup lang="ts">
import type { AgencyProfileFormData } from '~/types/agency-profile';

definePageMeta({
  name: 'profile',
});

const agencyProfileStore = useAgencyProfileStore();
const toast = useToast();

// Rendered by app/pages/profile.vue only once the profile has loaded.
const profile = computed(() => agencyProfileStore.profile!);

async function handleSubmit(data: AgencyProfileFormData) {
  const success = await agencyProfileStore.saveProfile(data);
  if (success) {
    toast.add({ title: 'Perfil guardado', color: 'success', icon: 'i-lucide-check-circle' });
    return;
  }
  toast.add({
    title: 'No se pudo guardar el perfil',
    description: agencyProfileStore.error ?? undefined,
    color: 'error',
    icon: 'i-lucide-alert-circle',
  });
}

async function handleLogoSelect(file: File) {
  const success = await agencyProfileStore.changeLogo(file);
  toast.add(success
    ? { title: 'Logo actualizado', color: 'success', icon: 'i-lucide-check-circle' }
    : { title: 'No se pudo subir el logo', description: agencyProfileStore.error ?? undefined, color: 'error', icon: 'i-lucide-alert-circle' });
}

async function handleLogoRemove() {
  const success = await agencyProfileStore.removeLogo();
  toast.add(success
    ? { title: 'Logo eliminado', color: 'warning', icon: 'i-lucide-trash-2' }
    : { title: 'No se pudo quitar el logo', description: agencyProfileStore.error ?? undefined, color: 'error', icon: 'i-lucide-alert-circle' });
}
</script>

<template>
  <div class="space-y-6">
    <UPageCard
      title="Logo"
      description="Se muestra en las tarjetas y el detalle de tus viajes."
      variant="subtle"
    >
      <AgencyLogoUpload
        :logo-url="profile.logoUrl"
        :uploading="agencyProfileStore.uploadingLogo"
        @select="handleLogoSelect"
        @remove="handleLogoRemove"
      />
    </UPageCard>

    <AgencyProfileForm
      :profile="profile"
      :states="agencyProfileStore.states"
      :saving="agencyProfileStore.saving"
      @submit="handleSubmit"
    />
  </div>
</template>
