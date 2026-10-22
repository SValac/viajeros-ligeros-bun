<script setup lang="ts">
import type { AgencyProfileFormData } from '~/types/agency-profile';

import { siteImageAccept, siteImageHint } from '~/composables/agency-profile/use-agency-profile-domain';
import { useSiteImageActions } from '~/composables/agency-profile/use-site-image-actions';
import { toErrorMessage } from '~/utils/error-message';

definePageMeta({
  name: 'profile',
});

const agencyProfileStore = useAgencyProfileStore();
const toast = useToast();

// Rendered by app/pages/profile.vue only once the profile has loaded.
const profile = computed(() => agencyProfileStore.profile!);

async function handleSubmit(data: AgencyProfileFormData) {
  try {
    await agencyProfileStore.saveProfile(data);
  }
  catch (e) {
    toast.add({
      title: 'No se pudo guardar el perfil',
      description: toErrorMessage(e, 'Intenta de nuevo'),
      color: 'error',
      icon: 'i-lucide-alert-circle',
    });
    return;
  }
  toast.add({ title: 'Perfil guardado', color: 'success', icon: 'i-lucide-check-circle' });
}

const { selectImage, removeImage } = useSiteImageActions();
</script>

<template>
  <div class="space-y-6">
    <UPageCard
      title="Logo"
      description="Se muestra en las tarjetas y el detalle de tus viajes."
      variant="subtle"
    >
      <ImageUpload
        :image-url="profile.logoUrl"
        label="logo"
        :accept="siteImageAccept('logoUrl')"
        :hint="siteImageHint('logoUrl')"
        :uploading="agencyProfileStore.uploadingImage === 'logoUrl'"
        @select="selectImage('logoUrl', $event)"
        @remove="removeImage('logoUrl')"
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
