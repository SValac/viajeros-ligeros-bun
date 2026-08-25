<script setup lang="ts">
import type { FormSubmitEvent } from '#ui/types';

import { z } from 'zod';

import type { TravelActivity } from '~/types/travel';

import { businessNameSchema, sanitizeBusinessName, sanitizeText, textSchema } from '~/utils/form-validation';

// Props
type Props = {
  activity?: TravelActivity | null;
  maxDia: number;
};

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  submit: [activity: Omit<TravelActivity, 'id'>];
  cancel: [];
}>();

// Schema de validación Zod
function createSchema(maxDia: number) {
  return z.object({
    day: z.number()
      .min(1, 'El día debe ser al menos 1')
      .max(maxDia, `El día no puede ser mayor a ${maxDia}`),
    title: businessNameSchema({ min: 3, max: 100 }),
    description: textSchema({ min: 10, max: 500 }),
    time: z.string()
      .regex(/^([01]?\d|2[0-3]):[0-5]\d$/, 'Formato: HH:MM')
      .optional()
      .or(z.literal('')),
    location: textSchema({ max: 200 })
      .optional()
      .or(z.literal('')),
    mapLocation: z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      placeId: z.string().optional(),
      address: z.string().optional(),
    }).optional(),
  });
}

const schema = computed(() => createSchema(Math.max(1, props.maxDia)));

type Schema = z.output<ReturnType<typeof createSchema>>;

// Estado inicial del formulario
const initialState = computed((): Schema => {
  if (props.activity) {
    return {
      day: props.activity.day,
      title: props.activity.title,
      description: props.activity.description,
      time: props.activity.time || '',
      location: props.activity.location || '',
      mapLocation: props.activity.mapLocation,
    };
  }

  return {
    day: 1,
    title: '',
    description: '',
    time: '',
    location: '',
    mapLocation: undefined,
  };
});

const state = ref<Schema>({ ...initialState.value });

// Proxies sanitizados: filtran caracteres inválidos mientras el usuario escribe
const titleInput = useSanitizedModel(() => state.value.title, v => state.value.title = v, sanitizeBusinessName);
const descriptionInput = useSanitizedModel(() => state.value.description, v => state.value.description = v, sanitizeText);
const locationInput = useSanitizedModel(() => state.value.location ?? '', v => state.value.location = v, sanitizeText);

// Reset form when the activity prop changes (e.g., modal reused for a different activity)
watch(initialState, (next) => {
  state.value = { ...next };
});

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
      mapLocation: event.data.mapLocation,
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
      name="day"
      required
      :description="`El viaje dura ${props.maxDia} día${props.maxDia !== 1 ? 's' : ''}`"
    >
      <UInput
        v-model.number="state.day"
        type="number"
        min="1"
        :max="props.maxDia"
        icon="i-lucide-calendar-days"
      />
    </UFormField>

    <!-- Título -->
    <UFormField
      label="Título de la actividad"
      name="title"
      required
    >
      <UInput
        v-model="titleInput"
        placeholder="Visita a la Torre Eiffel"
        icon="i-lucide-map-pin"
      />
    </UFormField>

    <!-- Hora (opcional) -->
    <UFormField
      label="Hora"
      name="time"
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
      name="location"
      description="Opcional"
    >
      <UInput
        v-model="locationInput"
        placeholder="Champ de Mars, París"
        icon="i-lucide-map"
      />
    </UFormField>

    <!-- Ubicación en Mapa (opcional) -->
    <UFormField
      label="Ubicación precisa en mapa"
      description="Opcional - Búsqueda y marcador interactivo"
    >
      <MapLocationPicker
        v-model="state.mapLocation"
      />
    </UFormField>

    <!-- Descripción -->
    <UFormField
      label="Descripción"
      name="description"
      required
    >
      <UTextarea
        v-model="descriptionInput"
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
        {{ props.activity ? 'Actualizar' : 'Agregar' }} Actividad
      </UButton>
    </div>
  </UForm>
</template>
