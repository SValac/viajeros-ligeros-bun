<script setup lang="ts">
import type { FormSubmitEvent } from '#ui/types';

import { z } from 'zod';

import type { TravelService } from '~/types/travel';

import { businessNameSchema, sanitizeBusinessName, sanitizeText, textSchema } from '~/utils/form-validation';

// Props
type Props = {
  service?: TravelService | null;
};

const { service = null } = defineProps<Props>();

// Emits
const emit = defineEmits<{
  submit: [service: Omit<TravelService, 'id'>];
  cancel: [];
}>();

// Zod validation schema
const schema = z.object({
  name: businessNameSchema({ min: 3, max: 100 }),
  description: textSchema({ max: 300 })
    .optional()
    .or(z.literal('')),
  included: z.boolean(),
});

type Schema = z.output<typeof schema>;

// Initial form state
const initialState = computed((): Schema => {
  if (service) {
    return {
      name: service.name,
      description: service.description || '',
      included: service.included,
    };
  }

  return {
    name: '',
    description: '',
    included: true, // Checked as included by default
  };
});

const state = ref<Schema>({ ...initialState.value });

// Sanitized proxies: filter out invalid characters while the user types
const nameInput = useSanitizedModel(() => state.value.name, v => state.value.name = v, sanitizeBusinessName);
const descriptionInput = useSanitizedModel(() => state.value.description ?? '', v => state.value.description = v, sanitizeText);

// Handlers
function onSubmit(event: FormSubmitEvent<Schema>) {
  const serviceData: Omit<TravelService, 'id'> = {
    name: event.data.name,
    description: event.data.description || undefined,
    included: event.data.included,
  };

  emit('submit', serviceData);
}

function onCancel() {
  emit('cancel');
}
</script>

<template>
  <UForm
    :schema="schema"
    :state="state"
    class="space-y-4"
    @submit="onSubmit"
  >
    <!-- Service name -->
    <UFormField
      label="Nombre del servicio"
      name="name"
      required
    >
      <UInput
        v-model="nameInput"
        placeholder="Vuelos ida y vuelta"
        icon="i-lucide-package"
      />
    </UFormField>

    <!-- Description (optional) -->
    <UFormField
      label="Descripción"
      name="description"
      description="Opcional - Detalles adicionales del servicio"
    >
      <UTextarea
        v-model="descriptionInput"
        placeholder="Incluye equipaje de 23kg, asientos preferenciales..."
        :rows="3"
      />
    </UFormField>

    <!-- Included in the package -->
    <UFormField
      label="Estado"
      name="included"
    >
      <UCheckbox
        v-model="state.included"
        label="Este servicio está incluido en el paquete"
      />
    </UFormField>

    <!-- Action buttons -->
    <FormActions
      :submit-label="service ? 'Actualizar servicio' : 'Registrar servicio'"
      @cancel="onCancel"
    />
  </UForm>
</template>
