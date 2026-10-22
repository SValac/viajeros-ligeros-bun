<script setup lang="ts">
import type { FormSubmitEvent } from '#ui/types';

import { z } from 'zod';

import type { TravelActivity } from '~/types/travel';

import { businessNameSchema, sanitizeBusinessName, sanitizeText, textSchema } from '~/utils/form-validation';
import { pluralize } from '~/utils/pluralize';

// Props
type Props = {
  activity?: TravelActivity | null;
  maxDay: number;
  // The parent is saving the submitted data
  loading?: boolean;
};

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  submit: [activity: Omit<TravelActivity, 'id'>];
  cancel: [];
}>();

// Zod validation schema
function createSchema(maxDay: number) {
  return z.object({
    day: z.number()
      .min(1, 'El día debe ser al menos 1')
      .max(maxDay, `El día no puede ser mayor a ${maxDay}`),
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

const schema = computed(() => createSchema(Math.max(1, props.maxDay)));

type Schema = z.output<ReturnType<typeof createSchema>>;

// Initial form state
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

// Sanitized proxies: filter out invalid characters while the user types
const titleInput = useSanitizedModel(() => state.value.title, v => state.value.title = v, sanitizeBusinessName);
const descriptionInput = useSanitizedModel(() => state.value.description, v => state.value.description = v, sanitizeText);
const locationInput = useSanitizedModel(() => state.value.location ?? '', v => state.value.location = v, sanitizeText);

// Reset form when the activity prop changes (e.g., modal reused for a different activity)
watch(initialState, (next) => {
  state.value = { ...next };
});

// Handlers
function onSubmit(event: FormSubmitEvent<Schema>) {
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
    <!-- Day -->
    <UFormField
      label="Día del itinerario"
      name="day"
      required
      :description="`El viaje dura ${pluralize(props.maxDay, 'día')}`"
    >
      <UInput
        v-model.number="state.day"
        type="number"
        min="1"
        :max="props.maxDay"
        icon="i-lucide-calendar-days"
      />
    </UFormField>

    <!-- Title -->
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

    <!-- Time (optional) -->
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

    <!-- Location (optional) -->
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

    <!-- Map location (optional) -->
    <UFormField
      label="Ubicación precisa en mapa"
      description="Opcional - Búsqueda y marcador interactivo"
    >
      <MapLocationPicker
        v-model="state.mapLocation"
      />
    </UFormField>

    <!-- Description -->
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

    <!-- Action buttons -->
    <FormActions
      :submit-label="props.activity ? 'Actualizar actividad' : 'Agregar actividad'"
      :loading="loading"
      @cancel="onCancel"
    />
  </UForm>
</template>
