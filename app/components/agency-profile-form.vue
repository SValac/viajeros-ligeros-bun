<script setup lang="ts">
import type { FormSubmitEvent } from '#ui/types';

import { z } from 'zod';

import type { AgencyProfile, AgencyProfileFormData, CountryState } from '~/types/agency-profile';

import { isValidLocalPhone, mapProfileToForm } from '~/composables/agency-profile/use-agency-profile-domain';
import { businessNameSchema, sanitizeBusinessName, sanitizePhone } from '~/utils/form-validation';

type Props = {
  profile: AgencyProfile | null;
  states: CountryState[];
  saving?: boolean;
};

const { profile, states, saving = false } = defineProps<Props>();

const emit = defineEmits<{
  submit: [data: AgencyProfileFormData];
}>();

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
});

type Schema = z.output<typeof schema>;

// Initialized once: the page mounts this form only after the profile has loaded.
// No re-sync on profile changes, so a logo upload never wipes unsaved edits.
const initialForm = mapProfileToForm(profile);
const state = ref<Schema>({ ...initialForm, phone: initialForm.phone ?? '' });

const companyNameInput = useSanitizedModel(() => state.value.companyName, v => state.value.companyName = v, sanitizeBusinessName);
const phoneInput = useSanitizedModel(() => state.value.phone, v => state.value.phone = v, sanitizePhone);

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
      title="Contacto"
      description="Se muestra como botón de WhatsApp en tus viajes."
      variant="subtle"
    >
      <UFormField
        label="Teléfono"
        name="phone"
        description="10 dígitos, sin lada internacional (+52 se agrega sola)."
      >
        <UInput
          v-model="phoneInput"
          type="tel"
          placeholder="33 1234 5678"
          icon="i-lucide-phone"
          class="w-full"
        />
      </UFormField>
    </UPageCard>

    <UPageCard
      title="Marca"
      description="Colores de tu agencia en las tarjetas de viaje de la web. Sin color, la web usa el suyo."
      variant="subtle"
    >
      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField label="Color principal" name="primaryColor">
          <AgencyColorInput v-model="state.primaryColor" />
        </UFormField>
        <UFormField label="Color secundario" name="secondaryColor">
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
