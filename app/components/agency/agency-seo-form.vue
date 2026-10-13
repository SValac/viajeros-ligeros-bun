<script setup lang="ts">
import type { FormSubmitEvent } from '#ui/types';

import { z } from 'zod';

import type { AgencyProfile, AgencySeoFormData } from '~/types/agency-profile';

import {
  defaultSeoDescription,
  defaultSeoTitle,
  mapProfileToSeoForm,
  mapSeoFormToUpdate,
  SEO_DESCRIPTION_MAX_LENGTH,
  SEO_DESCRIPTION_MIN_RECOMMENDED,
  SEO_TITLE_MAX_LENGTH,
} from '~/composables/agency-profile/use-agency-seo-domain';
import { sanitizeText, textSchema } from '~/utils/form-validation';

type Props = {
  profile: AgencyProfile;
  saving?: boolean;
};

const { profile, saving = false } = defineProps<Props>();

const emit = defineEmits<{
  submit: [data: AgencySeoFormData];
}>();

// Both texts are optional: empty means "use the site's default" (saved as NULL).
const schema = z.object({
  seoTitle: textSchema({ max: SEO_TITLE_MAX_LENGTH }),
  seoDescription: textSchema({ max: SEO_DESCRIPTION_MAX_LENGTH }),
});

type Schema = z.output<typeof schema>;

// Initialized once: the page mounts this form only after the profile has loaded.
// No re-sync on profile changes, so an image upload never wipes unsaved edits.
const state = ref<AgencySeoFormData>(mapProfileToSeoForm(profile));

const isDirty = computed(() =>
  JSON.stringify(mapSeoFormToUpdate(state.value)) !== JSON.stringify(mapSeoFormToUpdate(mapProfileToSeoForm(profile))),
);
useUnsavedChangesGuard(isDirty);

// The database rejects line breaks in both texts (they are single-line meta tags).
const toSingleLine = (value: string) => sanitizeText(value).replace(/[\r\n]+/g, ' ');
const seoTitleInput = useSanitizedModel(() => state.value.seoTitle, v => state.value.seoTitle = v, toSingleLine);
const seoDescriptionInput = useSanitizedModel(() => state.value.seoDescription, v => state.value.seoDescription = v, toSingleLine);

const seoTitleCounter = computed(() => `${state.value.seoTitle.length}/${SEO_TITLE_MAX_LENGTH}`);
const seoDescriptionCounter = computed(() => `${state.value.seoDescription.length}/${SEO_DESCRIPTION_MAX_LENGTH}`);

const fallbackTitle = computed(() => defaultSeoTitle(profile));
const fallbackDescription = computed(() => defaultSeoDescription(profile));

const descriptionLength = computed(() => state.value.seoDescription.trim().length);
const isDescriptionShort = computed(() =>
  descriptionLength.value > 0 && descriptionLength.value < SEO_DESCRIPTION_MIN_RECOMMENDED,
);

// What the public site will show with the current (unsaved) texts.
const preview = computed(() => ({
  siteName: profile.companyName?.trim() || 'Tu agencia',
  title: state.value.seoTitle.trim() || fallbackTitle.value,
  description: state.value.seoDescription.trim() || fallbackDescription.value,
  iconUrl: profile.faviconUrl ?? profile.logoUrl,
  shareImageUrl: profile.shareImageUrl,
}));

function onSubmit(event: FormSubmitEvent<Schema>) {
  emit('submit', event.data);
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
      title="Buscadores y redes"
      description="Opcional. Cómo aparece la página principal de tu sitio en Google y al compartir el enlace. Si los dejas vacíos, se usan el nombre y el eslogan de tu agencia."
      variant="subtle"
    >
      <UFormField
        label="Título"
        name="seoTitle"
        description="Nombra tu agencia y lo que ofreces. Google corta los títulos largos."
        :hint="seoTitleCounter"
      >
        <UInput
          v-model="seoTitleInput"
          :placeholder="fallbackTitle"
          :maxlength="SEO_TITLE_MAX_LENGTH"
          class="w-full"
        />
      </UFormField>

      <UFormField
        label="Descripción"
        name="seoDescription"
        :description="`Resume qué viajes haces y para quién. Se recomiendan entre ${SEO_DESCRIPTION_MIN_RECOMMENDED} y ${SEO_DESCRIPTION_MAX_LENGTH} caracteres.`"
        :hint="seoDescriptionCounter"
      >
        <UTextarea
          v-model="seoDescriptionInput"
          :placeholder="fallbackDescription"
          :maxlength="SEO_DESCRIPTION_MAX_LENGTH"
          :rows="3"
          autoresize
          class="w-full"
        />
      </UFormField>

      <UAlert
        v-if="isDescriptionShort"
        :description="`Con menos de ${SEO_DESCRIPTION_MIN_RECOMMENDED} caracteres, Google suele reemplazar la descripción por otro texto de la página.`"
        color="warning"
        variant="subtle"
        icon="i-lucide-triangle-alert"
      />
    </UPageCard>

    <UPageCard
      title="Vista previa"
      description="Aproximada: cada buscador o red social lo presenta a su manera."
      variant="subtle"
    >
      <AgencySeoPreview v-bind="preview" />
    </UPageCard>

    <div class="flex justify-end">
      <UButton
        type="submit"
        icon="i-lucide-save"
        :loading="saving"
      >
        Guardar SEO
      </UButton>
    </div>
  </UForm>
</template>
