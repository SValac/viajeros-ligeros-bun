<script setup lang="ts">
import type { FormSubmitEvent } from '#ui/types';

import { z } from 'zod';

import type { Provider, ProviderCategory, ProviderFormData } from '~/types/provider';

type Props = {
  provider?: Provider | null;
  fixedCategoria?: ProviderCategory;
};

const props = defineProps<Props>();

const emit = defineEmits<{
  submit: [data: ProviderFormData];
  cancel: [];
}>();

// Schema de validación
const schema = z.object({
  name: z.string()
    .min(3, 'Mínimo 3 caracteres')
    .max(100, 'Máximo 100 caracteres'),

  category: z.enum([
    'guides',
    'transportation',
    'accommodation',
    'bus_agencies',
    'food_services',
    'other',
  ]),

  description: z.string()
    .max(500, 'Máximo 500 caracteres')
    .optional()
    .or(z.literal('')),

  location: z.object({
    city: z.string()
      .min(1, 'La ciudad es requerida')
      .max(100, 'Máximo 100 caracteres'),

    state: z.string()
      .min(1, 'El estado/provincia es requerido')
      .max(100, 'Máximo 100 caracteres'),

    country: z.string()
      .min(1, 'El país es requerido')
      .max(100, 'Máximo 100 caracteres'),
  }),

  contact: z.object({
    name: z.string()
      .max(100, 'Máximo 100 caracteres')
      .optional()
      .or(z.literal('')),

    phone: z.string()
      .max(20, 'Máximo 20 caracteres')
      .optional()
      .or(z.literal('')),

    email: z.string()
      .email('Email inválido')
      .optional()
      .or(z.literal('')),

    notes: z.string()
      .max(300, 'Máximo 300 caracteres')
      .optional()
      .or(z.literal('')),
  }),

  active: z.boolean(),
});

type Schema = z.output<typeof schema>;

// Estado inicial del formulario
const state = ref<Schema>({
  name: props.provider?.name || '',
  category: props.provider?.category || props.fixedCategoria || 'other',
  description: props.provider?.description || '',
  location: {
    city: props.provider?.location?.city || '',
    state: props.provider?.location?.state || '',
    country: props.provider?.location?.country || 'México',
  },
  contact: {
    name: props.provider?.contact?.name || '',
    phone: props.provider?.contact?.phone || '',
    email: props.provider?.contact?.email || '',
    notes: props.provider?.contact?.notes || '',
  },
  active: props.provider?.active ?? true,
});

// Opciones de categoría
const categoriaOptions = [
  { value: 'guides', label: 'Guías' },
  { value: 'transportation', label: 'Transporte' },
  { value: 'accommodation', label: 'Hospedaje' },
  { value: 'bus_agencies', label: 'Agencias de Autobús' },
  { value: 'food_services', label: 'Comidas' },
  { value: 'other', label: 'Otros' },
];

// Handlers
function onSubmit(event: FormSubmitEvent<Schema>) {
  const formData: ProviderFormData = {
    ...event.data,
    id: props.provider?.id,
  };
  emit('submit', formData);
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
    <!-- Información Básica -->
    <UFormField
      label="Nombre del Proveedor"
      name="name"
      required
    >
      <UInput
        v-model="state.name"
        placeholder="Ejemplo: Transportes del Norte"
      />
    </UFormField>

    <UFormField
      label="Categoría"
      name="category"
      required
    >
      <template v-if="fixedCategoria">
        <UBadge
          size="lg"
          variant="subtle"
          color="primary"
        >
          {{ categoriaOptions.find(o => o.value === fixedCategoria)?.label }}
        </UBadge>
      </template>
      <USelect
        v-else
        v-model="state.category"
        :items="categoriaOptions"
        placeholder="Seleccionar categoría"
      />
    </UFormField>

    <UFormField
      label="Descripción"
      name="description"
    >
      <UTextarea
        v-model="state.description"
        :rows="3"
        placeholder="Descripción detallada del proveedor y sus servicios"
      />
    </UFormField>

    <!-- Ubicación -->
    <USeparator label="Ubicación" />

    <div class="grid grid-cols-3 gap-4">
      <UFormField
        label="Ciudad"
        name="location.city"
        required
      >
        <UInput
          v-model="state.location.city"
          placeholder="Ciudad de México"
        />
      </UFormField>

      <UFormField
        label="Estado/Provincia"
        name="location.state"
        required
      >
        <UInput
          v-model="state.location.state"
          placeholder="CDMX"
        />
      </UFormField>

      <UFormField
        label="País"
        name="location.country"
        required
      >
        <UInput
          v-model="state.location.country"
          placeholder="México"
        />
      </UFormField>
    </div>

    <!-- Información de Contacto -->
    <USeparator label="Información de Contacto" />

    <UFormField
      label="Nombre de Contacto"
      name="contact.name"
    >
      <UInput
        v-model="state.contact.name"
        placeholder="Nombre de la persona de contacto"
      />
    </UFormField>

    <div class="grid grid-cols-2 gap-4">
      <UFormField
        label="Teléfono"
        name="contact.phone"
      >
        <UInput
          v-model="state.contact.phone"
          type="tel"
          placeholder="+52 55 1234 5678"
        />
      </UFormField>

      <UFormField
        label="Email"
        name="contact.email"
      >
        <UInput
          v-model="state.contact.email"
          type="email"
          placeholder="contacto@ejemplo.com"
        />
      </UFormField>
    </div>

    <UFormField
      label="Notas de Contacto"
      name="contact.notes"
    >
      <UTextarea
        v-model="state.contact.notes"
        :rows="2"
        placeholder="Horarios, preferencias de contacto, etc."
      />
    </UFormField>

    <!-- Estado -->
    <USeparator label="Estado" />

    <UFormField
      name="active"
    >
      <UCheckbox
        v-model="state.active"
        label="Proveedor activo"
      />
    </UFormField>

    <!-- Botones -->
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
      >
        {{ provider ? 'Actualizar' : 'Crear' }} Proveedor
      </UButton>
    </div>
  </UForm>
</template>
