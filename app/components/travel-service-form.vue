<script setup lang="ts">
import type { FormSubmitEvent } from '#ui/types';

import { z } from 'zod';

import type { TravelService } from '~/types/travel';

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
  nombre: z.string()
    .min(3, 'Mínimo 3 caracteres')
    .max(100, 'Máximo 100 caracteres'),
  descripcion: z.string()
    .max(300, 'Máximo 300 caracteres')
    .optional()
    .or(z.literal('')),
  incluido: z.boolean(),
});

type Schema = z.output<typeof schema>;

// Estado inicial del formulario
const initialState = computed((): Schema => {
  if (service) {
    return {
      nombre: service.nombre,
      descripcion: service.descripcion || '',
      incluido: service.incluido,
    };
  }

  return {
    nombre: '',
    descripcion: '',
    incluido: true, // Por defecto marcado como incluido
  };
});

const state = ref<Schema>({ ...initialState.value });

// Handlers
const isSubmitting = ref(false);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  isSubmitting.value = true;

  try {
    const serviceData: Omit<TravelService, 'id'> = {
      nombre: event.data.nombre,
      descripcion: event.data.descripcion || undefined,
      incluido: event.data.incluido,
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
        v-model="state.nombre"
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
        v-model="state.descripcion"
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
        v-model="state.incluido"
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
