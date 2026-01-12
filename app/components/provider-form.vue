<script setup lang="ts">
import type { FormSubmitEvent } from '#ui/types';

import { z } from 'zod';

import type { Provider, ProviderFormData } from '~/types/provider';

type Props = {
  provider?: Provider | null;
};

const props = defineProps<Props>();

const emit = defineEmits<{
  submit: [data: ProviderFormData];
  cancel: [];
}>();

// Schema de validación
const schema = z.object({
  nombre: z.string()
    .min(3, 'Mínimo 3 caracteres')
    .max(100, 'Máximo 100 caracteres'),

  categoria: z.enum([
    'guias',
    'transporte',
    'hospedaje',
    'operadores-autobus',
    'comidas',
    'otros',
  ]),

  descripcion: z.string()
    .max(500, 'Máximo 500 caracteres')
    .optional()
    .or(z.literal('')),

  ubicacion: z.object({
    ciudad: z.string()
      .min(1, 'La ciudad es requerida')
      .max(100, 'Máximo 100 caracteres'),

    estado: z.string()
      .min(1, 'El estado/provincia es requerido')
      .max(100, 'Máximo 100 caracteres'),

    pais: z.string()
      .min(1, 'El país es requerido')
      .max(100, 'Máximo 100 caracteres'),
  }),

  contacto: z.object({
    nombre: z.string()
      .max(100, 'Máximo 100 caracteres')
      .optional()
      .or(z.literal('')),

    telefono: z.string()
      .max(20, 'Máximo 20 caracteres')
      .optional()
      .or(z.literal('')),

    email: z.string()
      .email('Email inválido')
      .optional()
      .or(z.literal('')),

    notas: z.string()
      .max(300, 'Máximo 300 caracteres')
      .optional()
      .or(z.literal('')),
  }),

  activo: z.boolean(),
});

type Schema = z.output<typeof schema>;

// Estado inicial del formulario
const state = ref<Schema>({
  nombre: props.provider?.nombre || '',
  categoria: props.provider?.categoria || 'otros',
  descripcion: props.provider?.descripcion || '',
  ubicacion: {
    ciudad: props.provider?.ubicacion?.ciudad || '',
    estado: props.provider?.ubicacion?.estado || '',
    pais: props.provider?.ubicacion?.pais || '',
  },
  contacto: {
    nombre: props.provider?.contacto?.nombre || '',
    telefono: props.provider?.contacto?.telefono || '',
    email: props.provider?.contacto?.email || '',
    notas: props.provider?.contacto?.notas || '',
  },
  activo: props.provider?.activo ?? true,
});

// Opciones de categoría con iconos
const categoriaOptions = [
  { label: 'Guías', value: 'guias', icon: 'i-lucide-user-search' },
  { label: 'Transporte', value: 'transporte', icon: 'i-lucide-car' },
  { label: 'Hospedaje', value: 'hospedaje', icon: 'i-lucide-hotel' },
  { label: 'Operadores de Autobús', value: 'operadores-autobus', icon: 'i-lucide-bus' },
  { label: 'Comidas', value: 'comidas', icon: 'i-lucide-utensils' },
  { label: 'Otros', value: 'otros', icon: 'i-lucide-package' },
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
      name="nombre"
      required
    >
      <UInput
        v-model="state.nombre"
        placeholder="Ejemplo: Transportes del Norte"
      />
    </UFormField>

    <UFormField
      label="Categoría"
      name="categoria"
      required
    >
      <USelect
        v-model="state.categoria"
        :options="categoriaOptions"
        placeholder="Seleccionar categoría"
      />
    </UFormField>

    <UFormField
      label="Descripción"
      name="descripcion"
    >
      <UTextarea
        v-model="state.descripcion"
        :rows="3"
        placeholder="Descripción detallada del proveedor y sus servicios"
      />
    </UFormField>

    <!-- Ubicación -->
    <USeparator label="Ubicación" />

    <div class="grid grid-cols-3 gap-4">
      <UFormField
        label="Ciudad"
        name="ubicacion.ciudad"
        required
      >
        <UInput
          v-model="state.ubicacion.ciudad"
          placeholder="Ciudad de México"
        />
      </UFormField>

      <UFormField
        label="Estado/Provincia"
        name="ubicacion.estado"
        required
      >
        <UInput
          v-model="state.ubicacion.estado"
          placeholder="CDMX"
        />
      </UFormField>

      <UFormField
        label="País"
        name="ubicacion.pais"
        required
      >
        <UInput
          v-model="state.ubicacion.pais"
          placeholder="México"
        />
      </UFormField>
    </div>

    <!-- Información de Contacto -->
    <USeparator label="Información de Contacto" />

    <UFormField
      label="Nombre de Contacto"
      name="contacto.nombre"
    >
      <UInput
        v-model="state.contacto.nombre"
        placeholder="Nombre de la persona de contacto"
      />
    </UFormField>

    <div class="grid grid-cols-2 gap-4">
      <UFormField
        label="Teléfono"
        name="contacto.telefono"
      >
        <UInput
          v-model="state.contacto.telefono"
          type="tel"
          placeholder="+52 55 1234 5678"
        />
      </UFormField>

      <UFormField
        label="Email"
        name="contacto.email"
      >
        <UInput
          v-model="state.contacto.email"
          type="email"
          placeholder="contacto@ejemplo.com"
        />
      </UFormField>
    </div>

    <UFormField
      label="Notas de Contacto"
      name="contacto.notas"
    >
      <UTextarea
        v-model="state.contacto.notas"
        :rows="2"
        placeholder="Horarios, preferencias de contacto, etc."
      />
    </UFormField>

    <!-- Estado -->
    <USeparator label="Estado" />

    <UFormField
      name="activo"
    >
      <UCheckbox
        v-model="state.activo"
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
