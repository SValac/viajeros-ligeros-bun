<script setup lang="ts">
import type { FormSubmitEvent } from '#ui/types';

import { z } from 'zod';

import type { AgencyProfile, AgencyProfileFormData, CountryState } from '~/types/agency-profile';

import {
  ABOUT_MAX_LENGTH,
  CONTACT_EMAIL_MAX_LENGTH,
  FACEBOOK_URL_REGEX,
  INSTAGRAM_URL_REGEX,
  isValidLocalPhone,
  mapProfileToForm,
  SOCIAL_URL_MAX_LENGTH,
  TAGLINE_MAX_LENGTH,
} from '~/composables/agency-profile/use-agency-profile-domain';
import { businessNameSchema, sanitizeBusinessName, sanitizePhone, sanitizeText, textSchema } from '~/utils/form-validation';

type Props = {
  profile: AgencyProfile | null;
  states: CountryState[];
  saving?: boolean;
};

const { profile, states, saving = false } = defineProps<Props>();

const emit = defineEmits<{
  submit: [data: AgencyProfileFormData];
}>();

// Optional site fields: an empty string means "not set" (saved as NULL).
function optionalMatching(regex: RegExp, message: string) {
  return z.string()
    .trim()
    .max(SOCIAL_URL_MAX_LENGTH, `Máximo ${SOCIAL_URL_MAX_LENGTH} caracteres`)
    .refine(value => value === '' || regex.test(value), message);
}

// Company name is required (a travel cannot be published without it).
// State is optional to save, but the profile only counts as complete with one.
const schema = z.object({
  companyName: businessNameSchema({ min: 2, max: 100 }),
  countryCode: z.string().length(2),
  stateCode: z.string().nullable(),
  phone: z.string()
    .refine(isValidLocalPhone, 'El teléfono debe tener 10 dígitos'),
  primaryColor: z.string().nullable(),
  secondaryColor: z.string().nullable(),
  tagline: textSchema({ max: TAGLINE_MAX_LENGTH }),
  about: textSchema({ max: ABOUT_MAX_LENGTH }),
  contactEmail: z.string()
    .trim()
    .max(CONTACT_EMAIL_MAX_LENGTH, `Máximo ${CONTACT_EMAIL_MAX_LENGTH} caracteres`)
    .refine(value => value === '' || z.email().safeParse(value).success, 'Email inválido'),
  instagramUrl: optionalMatching(INSTAGRAM_URL_REGEX, 'Debe ser un enlace https://instagram.com/tu-cuenta'),
  facebookUrl: optionalMatching(FACEBOOK_URL_REGEX, 'Debe ser un enlace https://facebook.com/tu-pagina'),
});

type Schema = z.output<typeof schema>;

// Initialized once: the page mounts this form only after the profile has loaded.
// No re-sync on profile changes, so a logo upload never wipes unsaved edits.
const initialForm = mapProfileToForm(profile);
const state = ref<Schema>({ ...initialForm, phone: initialForm.phone ?? '' });

const companyNameInput = useSanitizedModel(() => state.value.companyName, v => state.value.companyName = v, sanitizeBusinessName);
const phoneInput = useSanitizedModel(() => state.value.phone, v => state.value.phone = v, sanitizePhone);
const taglineInput = useSanitizedModel(() => state.value.tagline, v => state.value.tagline = v, sanitizeText);
const aboutInput = useSanitizedModel(() => state.value.about, v => state.value.about = v, sanitizeText);

const taglineCounter = computed(() => `${state.value.tagline.length}/${TAGLINE_MAX_LENGTH}`);
const aboutCounter = computed(() => `${state.value.about.length}/${ABOUT_MAX_LENGTH}`);

// USelectMenu works with `string | undefined`; the form keeps `null` for "no state".
const stateCodeModel = computed({
  get: () => state.value.stateCode ?? undefined,
  set: (value: string | undefined) => {
    state.value.stateCode = value ?? null;
  },
});

const stateItems = computed(() => states.map(s => ({ value: s.code, label: s.name })));
const selectedStateName = computed(() => states.find(s => s.code === state.value.stateCode)?.name ?? null);

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
      title="Identidad"
      description="Cómo aparece tu agencia en la web pública."
      variant="subtle"
    >
      <UFormField
        label="Nombre de la empresa"
        name="companyName"
        required
      >
        <UInput
          v-model="companyNameInput"
          placeholder="Viajeros Ligeros"
          class="w-full"
        />
      </UFormField>
    </UPageCard>

    <UPageCard
      title="Ubicación"
      description="Los viajeros filtran los viajes por el estado de la agencia."
      variant="subtle"
    >
      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField label="País" name="countryCode">
          <UInput
            model-value="México"
            disabled
            class="w-full"
          />
        </UFormField>

        <UFormField label="Estado" name="stateCode">
          <USelectMenu
            v-model="stateCodeModel"
            :items="stateItems"
            value-key="value"
            placeholder="Selecciona un estado"
            :search-input="{ placeholder: 'Buscar estado...' }"
            class="w-full"
          />
        </UFormField>
      </div>
    </UPageCard>

    <UPageCard
      title="Presentación"
      description="Opcional. Textos que acompañan a tu agencia en tu sitio web."
      variant="subtle"
    >
      <UFormField
        label="Eslogan"
        name="tagline"
        description="Aparece en el pie de página de tu sitio."
        :hint="taglineCounter"
      >
        <UInput
          v-model="taglineInput"
          placeholder="Viaja ligero, viaja seguro"
          :maxlength="TAGLINE_MAX_LENGTH"
          class="w-full"
        />
      </UFormField>

      <UFormField
        label="Nosotros"
        name="about"
        description="Tu sitio muestra una página «Nosotros» solo si escribes algo aquí. Solo texto; deja una línea en blanco entre párrafos."
        :hint="aboutCounter"
      >
        <UTextarea
          v-model="aboutInput"
          :rows="6"
          autoresize
          :maxlength="ABOUT_MAX_LENGTH"
          placeholder="Cuéntales a los viajeros quiénes son y cómo viajan."
          class="w-full"
        />
      </UFormField>
    </UPageCard>

    <UPageCard
      title="Contacto"
      description="Cómo te encuentran los viajeros desde tu sitio web."
      variant="subtle"
    >
      <UFormField
        label="Teléfono"
        name="phone"
        description="Botón de WhatsApp en tus viajes. 10 dígitos, sin lada internacional (+52 se agrega sola)."
      >
        <UInput
          v-model="phoneInput"
          type="tel"
          placeholder="33 1234 5678"
          icon="i-lucide-phone"
          class="w-full"
        />
      </UFormField>

      <UFormField
        label="Correo de contacto"
        name="contactEmail"
        description="Opcional. Aparece en el pie de página de tu sitio."
      >
        <UInput
          v-model="state.contactEmail"
          type="email"
          placeholder="hola@tuagencia.mx"
          icon="i-lucide-mail"
          class="w-full"
        />
      </UFormField>

      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField
          label="Instagram"
          name="instagramUrl"
          description="Opcional. Ícono en el pie de página."
        >
          <UInput
            v-model="state.instagramUrl"
            type="url"
            placeholder="https://instagram.com/tuagencia"
            icon="i-simple-icons-instagram"
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Facebook"
          name="facebookUrl"
          description="Opcional. Ícono en el pie de página."
        >
          <UInput
            v-model="state.facebookUrl"
            type="url"
            placeholder="https://facebook.com/tuagencia"
            icon="i-simple-icons-facebook"
            class="w-full"
          />
        </UFormField>
      </div>
    </UPageCard>

    <UPageCard
      title="Marca"
      description="Colores de tu agencia en la web. Sin color, la web usa el suyo."
      variant="subtle"
    >
      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField
          label="Color principal"
          name="primaryColor"
          description="Acento principal de tu sitio y de tus tarjetas de viaje."
        >
          <AgencyColorInput v-model="state.primaryColor" />
        </UFormField>
        <UFormField
          label="Color secundario"
          name="secondaryColor"
          description="Títulos pequeños sobre cada sección (p. ej. «Viajes destacados»). Si no eliges uno, se usa el principal."
        >
          <AgencyColorInput v-model="state.secondaryColor" />
        </UFormField>
      </div>

      <AgencyBrandPreview
        :company-name="state.companyName"
        :state-name="selectedStateName"
        :logo-url="profile?.logoUrl ?? null"
        :primary-color="state.primaryColor"
        :secondary-color="state.secondaryColor"
      />
    </UPageCard>

    <div class="flex justify-end">
      <UButton
        type="submit"
        icon="i-lucide-save"
        :loading="saving"
      >
        Guardar perfil
      </UButton>
    </div>
  </UForm>
</template>
