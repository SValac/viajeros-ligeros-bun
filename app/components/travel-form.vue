<script setup lang="ts">
import type { FormSubmitEvent } from '#ui/types';

import { z } from 'zod';

import type { Travel, TravelFormData } from '~/types/travel';

// Props
type Props = {
  travel?: Travel | null;
};

const { travel = null } = defineProps<Props>();

// Emits
const emit = defineEmits<{
  submit: [data: TravelFormData];
  cancel: [];
}>();

// Schema de validación Zod
const schema = z.object({
  destino: z.string().min(3, 'Mínimo 3 caracteres').max(100, 'Máximo 100 caracteres'),
  cliente: z.string().min(3, 'Mínimo 3 caracteres').max(100, 'Máximo 100 caracteres'),
  fechaInicio: z.string().min(1, 'Fecha requerida'),
  fechaFin: z.string().min(1, 'Fecha requerida'),
  precio: z.number().min(0, 'Precio debe ser positivo').max(999999, 'Precio máximo: 999,999'),
  descripcion: z.string().min(10, 'Mínimo 10 caracteres').max(1000, 'Máximo 1000 caracteres'),
  imagenUrl: z.string().url('URL inválida').optional().or(z.literal('')),
  estado: z.enum(['pendiente', 'confirmado', 'en-curso', 'completado', 'cancelado']),
  notasInternas: z.string().max(500, 'Máximo 500 caracteres').optional(),
}).refine(
  data => new Date(data.fechaFin) >= new Date(data.fechaInicio),
  { message: 'Fecha fin debe ser mayor o igual a fecha inicio', path: ['fechaFin'] },
);

type Schema = z.output<typeof schema>;

// Estado inicial del formulario
const initialState = computed((): Schema => {
  if (travel) {
    return {
      destino: travel.destino,
      cliente: travel.cliente,
      fechaInicio: travel.fechaInicio,
      fechaFin: travel.fechaFin,
      precio: travel.precio,
      descripcion: travel.descripcion,
      imagenUrl: travel.imagenUrl || '',
      estado: travel.estado,
      notasInternas: travel.notasInternas || '',
    };
  }

  return {
    destino: '',
    cliente: '',
    fechaInicio: '',
    fechaFin: '',
    precio: 0,
    descripcion: '',
    imagenUrl: '',
    estado: 'pendiente',
    notasInternas: '',
  };
});

const state = ref<Schema>({ ...initialState.value });

// Opciones de estado para el select
const estadoOptions = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'confirmado', label: 'Confirmado' },
  { value: 'en-curso', label: 'En Curso' },
  { value: 'completado', label: 'Completado' },
  { value: 'cancelado', label: 'Cancelado' },
];

// Handlers
const isSubmitting = ref(false);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  isSubmitting.value = true;

  try {
    const formData: TravelFormData = {
      ...event.data,
      itinerario: travel?.itinerario || [],
      servicios: travel?.servicios || [],
    };

    emit('submit', formData);
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
    <!-- Destino -->
    <UFormGroup
      label="Destino"
      name="destino"
      required
    >
      <UInput
        v-model="state.destino"
        placeholder="París, Francia"
        icon="i-lucide-map-pin"
      />
    </UFormGroup>

    <!-- Cliente -->
    <UFormGroup
      label="Cliente"
      name="cliente"
      required
    >
      <UInput
        v-model="state.cliente"
        placeholder="Nombre completo del cliente"
        icon="i-lucide-user"
      />
    </UFormGroup>

    <!-- Fechas (Grid 2 columnas) -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <UFormGroup
        label="Fecha Inicio"
        name="fechaInicio"
        required
      >
        <UInput
          v-model="state.fechaInicio"
          type="date"
          icon="i-lucide-calendar"
        />
      </UFormGroup>

      <UFormGroup
        label="Fecha Fin"
        name="fechaFin"
        required
      >
        <UInput
          v-model="state.fechaFin"
          type="date"
          icon="i-lucide-calendar"
        />
      </UFormGroup>
    </div>

    <!-- Precio y Estado (Grid 2 columnas) -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <UFormGroup
        label="Precio (EUR)"
        name="precio"
        required
      >
        <UInput
          v-model.number="state.precio"
          type="number"
          min="0"
          step="0.01"
          icon="i-lucide-euro"
          placeholder="0.00"
        />
      </UFormGroup>

      <UFormGroup
        label="Estado"
        name="estado"
        required
      >
        <USelect
          v-model="state.estado"
          :options="estadoOptions"
          icon="i-lucide-status"
        />
      </UFormGroup>
    </div>

    <!-- Descripción -->
    <UFormGroup
      label="Descripción"
      name="descripcion"
      required
    >
      <UTextarea
        v-model="state.descripcion"
        placeholder="Describe el viaje, actividades incluidas, etc."
        :rows="3"
      />
    </UFormGroup>

    <!-- URL Imagen -->
    <UFormGroup
      label="URL de Imagen"
      name="imagenUrl"
    >
      <UInput
        v-model="state.imagenUrl"
        type="url"
        placeholder="https://example.com/image.jpg"
        icon="i-lucide-image"
      />
    </UFormGroup>

    <!-- Notas Internas -->
    <UFormGroup
      label="Notas Internas"
      name="notasInternas"
      description="Información privada solo para el equipo"
    >
      <UTextarea
        v-model="state.notasInternas"
        placeholder="Preferencias del cliente, observaciones especiales..."
        :rows="2"
      />
    </UFormGroup>

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
        {{ travel ? 'Actualizar' : 'Crear' }} Viaje
      </UButton>
    </div>
  </UForm>
</template>
