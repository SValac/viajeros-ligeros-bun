<script setup lang="ts">
import type { FormSubmitEvent } from '#ui/types';

import { z } from 'zod';

import type { AgencyProfile, HomePage } from '~/types/agency-profile';

import { cloneHomePage, homePageSchema, serializeHomePage } from '~/composables/agency-profile/use-home-page-domain';

type Props = {
  profile: AgencyProfile;
  saving?: boolean;
};

const { profile, saving = false } = defineProps<Props>();

const emit = defineEmits<{
  submit: [page: HomePage | null];
}>();

const schema = z.object({
  homePage: homePageSchema.nullable(),
});

type Schema = z.output<typeof schema>;

// Initialized once from the loaded profile (the parent page renders this only after
// loading), so edits stay local until they are saved.
const state = ref<{ homePage: HomePage | null }>({ homePage: cloneHomePage(profile.homePage) });

// Compared as the stored JSON, so only edits that would change what gets saved count.
// It resets itself after saving, when `profile` updates.
const isDirty = computed(() =>
  JSON.stringify(serializeHomePage(state.value.homePage)) !== JSON.stringify(serializeHomePage(profile.homePage)),
);
useUnsavedChangesGuard(isDirty);

function onSubmit(event: FormSubmitEvent<Schema>) {
  emit('submit', event.data.homePage);
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
      title="Página principal"
      description="Opcional. Personaliza los textos de la página de inicio de tu sitio; el diseño y el orden los pone la web. Lo que dejes vacío usa el texto predeterminado."
      variant="subtle"
    >
      <AgencyHomePageEditor
        v-model="state.homePage"
        :company-name="profile.companyName ?? ''"
      />
    </UPageCard>

    <div class="flex justify-end">
      <UButton
        type="submit"
        icon="i-lucide-save"
        :loading="saving"
      >
        Guardar página principal
      </UButton>
    </div>
  </UForm>
</template>
