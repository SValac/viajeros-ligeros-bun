<script setup lang="ts">
import type { AgencyProfileFormData } from '~/types/agency-profile';

definePageMeta({
  name: 'profile',
});

const agencyProfileStore = useAgencyProfileStore();
const toast = useToast();

onMounted(() => agencyProfileStore.fetchProfile({ force: true }));

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
  <div class="mx-auto max-w-3xl space-y-6">
    <div class="flex items-center gap-4">
      <UIcon name="i-lucide-building-2" class="size-10 text-primary" />
      <div>
        <h1 class="text-3xl font-bold text-highlighted">
          Perfil de agencia
        </h1>
        <p class="mt-1 text-muted">
          Estos datos son públicos: aparecen junto a tus viajes en la web.
        </p>
      </div>
    </div>

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
        description="Necesitas el nombre de tu empresa y tu estado para que tus viajes aparezcan correctamente en la web."
        color="warning"
        variant="subtle"
        icon="i-lucide-triangle-alert"
      />

      <UPageCard
        title="Logo"
        description="Se muestra en las tarjetas y el detalle de tus viajes."
        variant="subtle"
      >
        <AgencyLogoUpload
          :logo-url="agencyProfileStore.profile.logoUrl"
          :uploading="agencyProfileStore.uploadingLogo"
          @select="handleLogoSelect"
          @remove="handleLogoRemove"
        />
      </UPageCard>

      <AgencyProfileForm
        :profile="agencyProfileStore.profile"
        :states="agencyProfileStore.states"
        :saving="agencyProfileStore.saving"
        @submit="handleSubmit"
      />
    </template>
  </div>
</template>
