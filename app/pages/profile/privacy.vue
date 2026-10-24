<script setup lang="ts">
import type { PrivacyNotice } from '~/types/agency-profile';

import { clonePrivacyNotice, privacyNoticeSchema, serializePrivacyNotice } from '~/composables/agency-profile/use-privacy-notice-domain';
import { toErrorMessage } from '~/utils/error-message';

definePageMeta({
  name: 'profile-privacy',
});

const agencyProfileStore = useAgencyProfileStore();
const toast = useToast();

// Rendered by app/pages/profile.vue only once the profile has loaded.
const profile = computed(() => agencyProfileStore.profile!);

async function handleSubmit(notice: PrivacyNotice | null) {
  try {
    await agencyProfileStore.savePrivacyNotice(notice);
  }
  catch (e) {
    toast.add({
      title: 'No se pudo guardar el aviso de privacidad',
      description: toErrorMessage(e, 'Intenta de nuevo'),
      color: 'error',
      icon: 'i-lucide-alert-circle',
    });
    return;
  }
  toast.add({
    title: notice ? 'Aviso de privacidad guardado' : 'Aviso de privacidad quitado',
    color: 'success',
    icon: 'i-lucide-check-circle',
  });
}
</script>

<template>
  <AgencyPageForm
    :page="profile.privacyNotice"
    :schema="privacyNoticeSchema"
    :clone="clonePrivacyNotice"
    :serialize="serializePrivacyNotice"
    title="Aviso de privacidad"
    description="Tu sitio lo muestra en su propia página, con un enlace en el pie de página. La ley lo pide si recabas datos personales o usas herramientas como el píxel de Meta. La plantilla es solo un ejemplo: revísala con un asesor legal y adáptala a tu agencia. Sin aviso, tu sitio no muestra la página ni el enlace."
    submit-label="Guardar aviso de privacidad"
    :saving="agencyProfileStore.saving"
    @submit="handleSubmit"
  >
    <template #default="{ state, path }">
      <AgencyPrivacyNoticeEditor
        v-model="state.page"
        :name="path"
        :contact-email="profile.contactEmail ?? ''"
      />
    </template>
  </AgencyPageForm>
</template>
