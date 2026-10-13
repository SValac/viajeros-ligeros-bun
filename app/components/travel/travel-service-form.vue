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

// Schema de validación Zod
const schema = z.object({
  name: businessNameSchema({ min: 3, max: 100 }),
  description: textSchema({ max: 300 })
    .optional()
    .or(z.literal('')),
  included: z.boolean(),
});

type Schema = z.output<typeof schema>;

// Estado inicial del formulario
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
    included: true, // Por defecto marcado como incluido
  };
});

const state = ref<Schema>({ ...initialState.value });

// Proxies sanitizados: filtran caracteres inválidos mientras el usuario escribe
const nameInput = useSanitizedModel(() => state.value.name, v => state.value.name = v, sanitizeBusinessName);
const descriptionInput = useSanitizedModel(() => state.value.description ?? '', v => state.value.description = v, sanitizeText);

// Handlers
const isSubmitting = ref(false);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  isSubmitting.value = true;

  try {
    const serviceData: Omit<TravelService, 'id'> = {
      name: event.data.name,
      description: event.data.description || undefined,
      included: event.data.included,
    };

    emit('submit', serviceData);
  }
  finally {
    isSubmitting.value = false;
  }
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
    <!-- Nombre del servicio -->
    <UFormField
      label="Nombre del servicio"
      name="nombre"
      required
    >
      <UInput
        v-model="nameInput"
        placeholder="Vuelos ida y vuelta"
        icon="i-lucide-package"
      />
    </UFormField>

    <!-- Descripción (opcional) -->
    <UFormField
      label="Descripción"
      name="descripcion"
      description="Opcional - Detalles adicionales del servicio"
    >
      <UTextarea
        v-model="descriptionInput"
        placeholder="Incluye equipaje de 23kg, asientos preferenciales..."
        :rows="3"
      />
    </UFormField>

    <!-- Incluido en el paquete -->
    <UFormField
      label="Estado"
      name="incluido"
    >
      <UCheckbox
        v-model="state.included"
        label="Este servicio está incluido en el paquete"
      />
    </UFormField>

    <!-- Botones de acción -->
    <div class="flex justify-end gap-3 pt-4">
      <UButton
        type="button"
        color="neutral"
        variant="outline"
        @click="onCancel"
      >
        Cancelar
      </UButton>
      <UButton
        type="submit"
        color="primary"
        :loading="isSubmitting"
      >
        {{ service ? 'Actualizar' : 'Agregar' }} Servicio
      </UButton>
    </div>
  </UForm>
</template>
