<script setup lang="ts">
import type { AgencySeoFormData, AgencySiteImageField } from '~/types/agency-profile';

import {
  shareImageWarning,
  SITE_IMAGE_RULES,
  siteImageAccept,
  siteImageHint,
} from '~/composables/agency-profile/use-agency-profile-domain';

definePageMeta({
  name: 'profile-seo',
});

const agencyProfileStore = useAgencyProfileStore();
const toast = useToast();

// Rendered by app/pages/profile.vue only once the profile has loaded.
const profile = computed(() => agencyProfileStore.profile!);

// Measured by the preview once the stored share image loads; the proportions can only
// be advised, not enforced (any image works, it just gets cropped).
const shareImageSize = shallowRef<{ width: number; height: number } | null>(null);
const shareWarning = computed(() =>
  shareImageSize.value ? shareImageWarning(shareImageSize.value.width, shareImageSize.value.height) : null,
);

async function handleSubmit(data: AgencySeoFormData) {
  const success = await agencyProfileStore.saveSeo(data);
  if (success) {
    toast.add({ title: 'SEO guardado', color: 'success', icon: 'i-lucide-check-circle' });
    return;
  }
  toast.add({
    title: 'No se pudo guardar el SEO',
    description: agencyProfileStore.error ?? undefined,
    color: 'error',
    icon: 'i-lucide-alert-circle',
  });
}

async function handleImageSelect(field: AgencySiteImageField, file: File) {
  const noun = SITE_IMAGE_RULES[field].noun;
  const success = await agencyProfileStore.changeSiteImage(field, file);
  toast.add(success
    ? { title: `${noun} se actualizó`, color: 'success', icon: 'i-lucide-check-circle' }
    : { title: `No se pudo subir ${noun.toLowerCase()}`, description: agencyProfileStore.error ?? undefined, color: 'error', icon: 'i-lucide-alert-circle' });
}

async function handleImageRemove(field: AgencySiteImageField) {
  const noun = SITE_IMAGE_RULES[field].noun;
  const success = await agencyProfileStore.removeSiteImage(field);
  if (success && field === 'shareImageUrl')
    shareImageSize.value = null;
  toast.add(success
    ? { title: `${noun} se quitó`, color: 'warning', icon: 'i-lucide-trash-2' }
    : { title: `No se pudo quitar ${noun.toLowerCase()}`, description: agencyProfileStore.error ?? undefined, color: 'error', icon: 'i-lucide-alert-circle' });
}
</script>

<template>
  <div class="space-y-6">
    <UPageCard
      title="Favicon"
      description="El ícono de tu sitio en la pestaña del navegador, en Google y al guardarlo en la pantalla de inicio del celular. Si no subes uno, se usa tu logo."
      variant="subtle"
    >
      <AgencyImageUpload
        :image-url="profile.faviconUrl"
        label="favicon"
        :accept="siteImageAccept('faviconUrl')"
        :hint="siteImageHint('faviconUrl')"
        :uploading="agencyProfileStore.uploadingImage === 'faviconUrl'"
        @select="handleImageSelect('faviconUrl', $event)"
        @remove="handleImageRemove('faviconUrl')"
      />
    </UPageCard>

    <UPageCard
      title="Imagen para compartir"
      description="Aparece al compartir el enlace de tu sitio en WhatsApp, Facebook u otras redes. Cada viaje usa su propia portada."
      variant="subtle"
    >
      <AgencyImageUpload
        :image-url="profile.shareImageUrl"
        label="imagen"
        :accept="siteImageAccept('shareImageUrl')"
        :hint="siteImageHint('shareImageUrl')"
        shape="wide"
        :uploading="agencyProfileStore.uploadingImage === 'shareImageUrl'"
        :warning="shareWarning"
        @select="handleImageSelect('shareImageUrl', $event)"
        @remove="handleImageRemove('shareImageUrl')"
        @measure="(width, height) => shareImageSize = { width, height }"
      />
    </UPageCard>

    <AgencySeoForm
      :profile="profile"
      :saving="agencyProfileStore.saving"
      @submit="handleSubmit"
    />
  </div>
</template>
