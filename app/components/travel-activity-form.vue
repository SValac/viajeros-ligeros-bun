<script setup lang="ts">
import type { FormSubmitEvent } from '#ui/types';

import { z } from 'zod';

import type { TravelActivity } from '~/types/travel';

// Props
type Props = {
  activity?: TravelActivity | null;
  maxDia: number;
};

const { activity = null, maxDia } = defineProps<Props>();

// Emits
const emit = defineEmits<{
  submit: [activity: Omit<TravelActivity, 'id'>];
  cancel: [];
}>();

// Schema de validación Zod
const schema = z.object({
  day: z.number()
    .min(1, 'El día debe ser al menos 1')
    .max(maxDia, `El día no puede ser mayor a ${maxDia}`),
  title: z.string()
    .min(3, 'Mínimo 3 caracteres')
    .max(100, 'Máximo 100 caracteres'),
  description: z.string()
    .min(10, 'Mínimo 10 caracteres')
    .max(500, 'Máximo 500 caracteres'),
  time: z.string()
    .regex(/^([01]?\d|2[0-3]):[0-5]\d$/, 'Formato: HH:MM')
    .optional()
    .or(z.literal('')),
  location: z.string()
    .max(200, 'Máximo 200 caracteres')
    .optional()
    .or(z.literal('')),
});

type Schema = z.output<typeof schema>;

// Estado inicial del formulario
const initialState = computed((): Schema => {
  if (activity) {
    return {
      day: activity.day,
      title: activity.title,
      description: activity.description,
      time: activity.time || '',
      location: activity.location || '',
    };
  }

  return {
    day: 1,
    title: '',
    description: '',
    time: '',
    location: '',
  };
});

const state = ref<Schema>({ ...initialState.value });

// Handlers
const isSubmitting = ref(false);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  isSubmitting.value = true;

  try {
    const activityData: Omit<TravelActivity, 'id'> = {
      day: event.data.day,
      title: event.data.title,
      description: event.data.description,
      time: event.data.time || undefined,
      location: event.data.location || undefined,
    };

    emit('submit', activityData);
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
    <!-- Día -->
    <UFormField
      label="Día del itinerario"
      name="dia"
      required
      :description="`El viaje dura ${maxDia} día${maxDia !== 1 ? 's' : ''}`"
    >
      <UInput
        v-model.number="state.day"
        type="number"
        min="1"
        :max="maxDia"
        icon="i-lucide-calendar-days"
      />
    </UFormField>

    <!-- Título -->
    <UFormField
      label="Título de la actividad"
      name="titulo"
      required
    >
      <UInput
        v-model="state.title"
        placeholder="Visita a la Torre Eiffel"
        icon="i-lucide-map-pin"
      />
    </UFormField>

    <!-- Hora (opcional) -->
    <UFormField
      label="Hora"
      name="hora"
      description="Opcional - Formato 24 horas (HH:MM)"
    >
      <UInput
        v-model="state.time"
        type="time"
        icon="i-lucide-clock"
        placeholder="10:00"
      />
    </UFormField>

    <!-- Ubicación (opcional) -->
    <UFormField
      label="Ubicación"
      name="ubicacion"
      description="Opcional"
    >
      <UInput
        v-model="state.location"
        placeholder="Champ de Mars, París"
        icon="i-lucide-map"
      />
    </UFormField>

    <!-- Descripción -->
    <UFormField
      label="Descripción"
      name="descripcion"
      required
    >
      <UTextarea
        v-model="state.description"
        placeholder="Describe la actividad, qué se hará, qué incluye..."
        :rows="4"
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
        {{ activity ? 'Actualizar' : 'Agregar' }} Actividad
      </UButton>
    </div>
  </UForm>
</template>
