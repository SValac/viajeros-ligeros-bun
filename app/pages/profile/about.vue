<script setup lang="ts">
import type { AboutPage } from '~/types/agency-profile';

import { aboutPageSchema, cloneAboutPage, serializeAboutPage } from '~/composables/agency-profile/use-about-page-domain';
import { toErrorMessage } from '~/utils/error-message';

definePageMeta({
  name: 'profile-about',
});

const agencyProfileStore = useAgencyProfileStore();
const toast = useToast();

// Rendered by app/pages/profile.vue only once the profile has loaded.
const profile = computed(() => agencyProfileStore.profile!);

async function handleSubmit(page: AboutPage | null) {
  try {
    await agencyProfileStore.saveAboutPage(page);
  }
  catch (e) {
    toast.add({
      title: 'No se pudo guardar la página Nosotros',
      description: toErrorMessage(e, 'Intenta de nuevo'),
      color: 'error',
      icon: 'i-lucide-alert-circle',
    });
    return;
  }
  toast.add({
    title: page ? 'Página Nosotros guardada' : 'Página Nosotros quitada',
    color: 'success',
    icon: 'i-lucide-check-circle',
  });
}
</script>

<template>
  <AgencyPageForm
    :page="profile.aboutPage"
    :schema="aboutPageSchema"
    :clone="cloneAboutPage"
    :serialize="serializeAboutPage"
    title="Página Nosotros"
    description="Opcional. Arma la página «Nosotros» de tu sitio por secciones; el diseño lo pone la web, tú solo el contenido. Sin página, tu sitio no la muestra en el menú."
    submit-label="Guardar página Nosotros"
    :saving="agencyProfileStore.saving"
    @submit="handleSubmit"
  >
    <template #default="{ state, path }">
      <AgencyAboutPageEditor
        v-model="state.page"
        :name="path"
        :company-name="profile.companyName ?? ''"
      />
    </template>
  </AgencyPageForm>
</template>
