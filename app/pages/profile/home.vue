<script setup lang="ts">
import type { HomePage } from '~/types/agency-profile';

import {
  bannerImageWarning,
  SITE_IMAGE_RULES,
  siteImageAccept,
  siteImageHint,
} from '~/composables/agency-profile/use-agency-profile-domain';

definePageMeta({
  name: 'profile-home',
});

const agencyProfileStore = useAgencyProfileStore();
const toast = useToast();

// Rendered by app/pages/profile.vue only once the profile has loaded.
const profile = computed(() => agencyProfileStore.profile!);

// Measured by the preview once the stored banner loads; the proportions can only be
// advised, not enforced (any image works, it just gets cropped).
const bannerSize = shallowRef<{ width: number; height: number } | null>(null);
const bannerWarning = computed(() =>
  bannerSize.value ? bannerImageWarning(bannerSize.value.width, bannerSize.value.height) : null,
);

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

async function handleBannerSelect(file: File) {
  const noun = SITE_IMAGE_RULES.bannerImageUrl.noun;
  const success = await agencyProfileStore.changeSiteImage('bannerImageUrl', file);
  toast.add(success
    ? { title: `${noun} se actualizó`, color: 'success', icon: 'i-lucide-check-circle' }
    : { title: `No se pudo subir ${noun.toLowerCase()}`, description: agencyProfileStore.error ?? undefined, color: 'error', icon: 'i-lucide-alert-circle' });
}

async function handleBannerRemove() {
  const noun = SITE_IMAGE_RULES.bannerImageUrl.noun;
  const success = await agencyProfileStore.removeSiteImage('bannerImageUrl');
  if (success)
    bannerSize.value = null;
  toast.add(success
    ? { title: `${noun} se quitó`, color: 'warning', icon: 'i-lucide-trash-2' }
    : { title: `No se pudo quitar ${noun.toLowerCase()}`, description: agencyProfileStore.error ?? undefined, color: 'error', icon: 'i-lucide-alert-circle' });
}
</script>

<template>
  <div class="space-y-6">
    <UPageCard
      title="Banner"
      description="Una imagen a todo lo ancho, arriba del encabezado de tu página principal. Tu sitio la recorta desde el centro: en computadora queda como una franja angosta y en celular más alta, así que deja lo importante al centro. Si no subes uno, la página empieza directo con el encabezado."
      variant="subtle"
    >
      <div class="space-y-4">
        <AgencyImageUpload
          :image-url="profile.bannerImageUrl"
          label="banner"
          :accept="siteImageAccept('bannerImageUrl')"
          :hint="siteImageHint('bannerImageUrl')"
          shape="banner"
          :uploading="agencyProfileStore.uploadingImage === 'bannerImageUrl'"
          :warning="bannerWarning"
          @select="handleBannerSelect"
          @remove="handleBannerRemove"
          @measure="(width, height) => bannerSize = { width, height }"
        />

        <div v-if="profile.bannerImageUrl" class="space-y-2">
          <p class="text-xs text-muted">
            Así se recorta en celular:
          </p>
          <div class="aspect-video w-40 overflow-hidden rounded-lg border border-default bg-elevated">
            <img
              :src="profile.bannerImageUrl"
              alt="Vista previa del banner en celular"
              class="size-full object-cover"
            >
          </div>
        </div>
      </div>
    </UPageCard>

    <AgencyHomePageForm
      :profile="profile"
      :saving="agencyProfileStore.saving"
      @submit="handleSubmit"
    />
  </div>
</template>
