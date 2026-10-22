<script setup lang="ts">
import type { AgencySeoFormData, AgencySiteImageField } from '~/types/agency-profile';

import {
  shareImageWarning,
  siteImageAccept,
  siteImageHint,
} from '~/composables/agency-profile/use-agency-profile-domain';
import { useSiteImageActions } from '~/composables/agency-profile/use-site-image-actions';
import { toErrorMessage } from '~/utils/error-message';

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
  try {
    await agencyProfileStore.saveSeo(data);
  }
  catch (e) {
    toast.add({
      title: 'No se pudo guardar el SEO',
      description: toErrorMessage(e, 'Intenta de nuevo'),
      color: 'error',
      icon: 'i-lucide-alert-circle',
    });
    return;
  }
  toast.add({ title: 'SEO guardado', color: 'success', icon: 'i-lucide-check-circle' });
}

const { selectImage, removeImage } = useSiteImageActions();

async function handleImageRemove(field: AgencySiteImageField) {
  if (await removeImage(field) && field === 'shareImageUrl')
    shareImageSize.value = null;
}
</script>

<template>
  <div class="space-y-6">
    <UPageCard
      title="Favicon"
      description="El ícono de tu sitio en la pestaña del navegador, en Google y al guardarlo en la pantalla de inicio del celular. Si no subes uno, se usa tu logo."
      variant="subtle"
    >
      <ImageUpload
        :image-url="profile.faviconUrl"
        label="favicon"
        :accept="siteImageAccept('faviconUrl')"
        :hint="siteImageHint('faviconUrl')"
        :uploading="agencyProfileStore.uploadingImage === 'faviconUrl'"
        @select="selectImage('faviconUrl', $event)"
        @remove="handleImageRemove('faviconUrl')"
      />
    </UPageCard>

    <UPageCard
      title="Imagen para compartir"
      description="Aparece al compartir el enlace de tu sitio en WhatsApp, Facebook u otras redes. Cada viaje usa su propia portada."
      variant="subtle"
    >
      <ImageUpload
        :image-url="profile.shareImageUrl"
        label="imagen"
        :accept="siteImageAccept('shareImageUrl')"
        :hint="siteImageHint('shareImageUrl')"
        shape="wide"
        :uploading="agencyProfileStore.uploadingImage === 'shareImageUrl'"
        :warning="shareWarning"
        @select="selectImage('shareImageUrl', $event)"
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
