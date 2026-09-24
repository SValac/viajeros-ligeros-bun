<script setup lang="ts">
import type { FormSubmitEvent } from '#ui/types';

import { z } from 'zod';

import type { AboutPage, AgencyProfile } from '~/types/agency-profile';

import { aboutPageSchema, cloneAboutPage, serializeAboutPage } from '~/composables/agency-profile/use-about-page-domain';

type Props = {
  profile: AgencyProfile;
  saving?: boolean;
};

const { profile, saving = false } = defineProps<Props>();

const emit = defineEmits<{
  submit: [page: AboutPage | null];
}>();

const schema = z.object({
  aboutPage: aboutPageSchema.nullable(),
});

type Schema = z.output<typeof schema>;

// Initialized once from the loaded profile (the parent page renders this only after
// loading), so edits stay local until they are saved.
const state = ref<{ aboutPage: AboutPage | null }>({ aboutPage: cloneAboutPage(profile.aboutPage) });

// Compared as the stored JSON, so only edits that would change what gets saved count.
// It resets itself after saving, when `profile` updates.
const isDirty = computed(() =>
  JSON.stringify(serializeAboutPage(state.value.aboutPage)) !== JSON.stringify(serializeAboutPage(profile.aboutPage)),
);
useUnsavedChangesGuard(isDirty);

function onSubmit(event: FormSubmitEvent<Schema>) {
  emit('submit', event.data.aboutPage);
}
</script>

<template>
  <UForm
    :schema="schema"
    :state="state"
    class="space-y-6"
    @submit="onSubmit"
  >
    <UPageCard
      title="Página Nosotros"
      description="Opcional. Arma la página «Nosotros» de tu sitio por secciones; el diseño lo pone la web, tú solo el contenido. Sin página, tu sitio no la muestra en el menú."
      variant="subtle"
    >
      <AgencyAboutPageEditor
        v-model="state.aboutPage"
        :company-name="profile.companyName ?? ''"
      />
    </UPageCard>

    <div class="flex justify-end">
      <UButton
        type="submit"
        icon="i-lucide-save"
        :loading="saving"
      >
        Guardar página Nosotros
      </UButton>
    </div>
  </UForm>
</template>
