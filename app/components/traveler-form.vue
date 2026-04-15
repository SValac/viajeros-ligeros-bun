<script setup lang="ts">
import type { FormSubmitEvent } from '#ui/types';

import { z } from 'zod';

import type { Travel } from '~/types/travel';
import type { Traveler, TravelerFormData } from '~/types/traveler';

type Props = {
  traveler?: Traveler | null;
  availableTravels: Travel[];
  availableTravelers: Traveler[];
};

const { traveler = null, availableTravels, availableTravelers } = defineProps<Props>();

const emit = defineEmits<{
  submit: [data: TravelerFormData];
  cancel: [];
}>();

// Schema de validación
const schema = z.object({
  nombre: z.string()
    .min(2, 'Mínimo 2 caracteres')
    .max(100, 'Máximo 100 caracteres'),

  apellido: z.string()
    .min(2, 'Mínimo 2 caracteres')
    .max(100, 'Máximo 100 caracteres'),

  telefono: z.string()
    .min(7, 'Mínimo 7 caracteres')
    .max(20, 'Máximo 20 caracteres'),

  travelId: z.string().min(1, 'El viaje es requerido'),

  travelBusId: z.string().min(1, 'El camión es requerido'),

  asiento: z.string().min(1, 'El asiento es requerido').max(10, 'Máximo 10 caracteres'),

  puntoAbordaje: z.string()
    .min(2, 'Mínimo 2 caracteres')
    .max(150, 'Máximo 150 caracteres'),

  esRepresentante: z.boolean(),

  representanteId: z.string().optional(),
});

type Schema = z.output<typeof schema>;

// Estado inicial del formulario
const state = ref<Schema>({
  nombre: traveler?.nombre ?? '',
  apellido: traveler?.apellido ?? '',
  telefono: traveler?.telefono ?? '',
  travelId: traveler?.travelId ?? '',
  travelBusId: traveler?.travelBusId ?? '',
  asiento: traveler?.asiento ?? '',
  puntoAbordaje: traveler?.puntoAbordaje ?? '',
  esRepresentante: traveler?.esRepresentante ?? false,
  representanteId: traveler?.representanteId ?? undefined,
});

// Opciones de viajes para USelect
const travelOptions = computed(() =>
  availableTravels.map(t => ({
    value: t.id,
    label: `${t.destino} (${t.fechaInicio})`,
  })),
);

// Viaje actualmente seleccionado (para acceder a sus autobuses)
const selectedTravel = computed(() =>
  availableTravels.find(t => t.id === state.value.travelId) ?? null,
);

// Opciones de camiones filtradas por el viaje seleccionado
const busOptions = computed(() => {
  if (!selectedTravel.value)
    return [];
  return selectedTravel.value.autobuses.map(b => ({
    value: b.id,
    label: [b.marca, b.modelo, b.año].filter(Boolean).join(' ') || `Camión ${b.id.slice(-4)}`,
  }));
});

// Opciones de representante: viajeros del mismo viaje y camión, excluyendo al propio viajero
const representanteOptions = computed(() => {
  if (!state.value.travelId || !state.value.travelBusId)
    return [];
  return availableTravelers
    .filter(t =>
      t.travelId === state.value.travelId
      && t.travelBusId === state.value.travelBusId
      && t.esRepresentante === true
      && t.id !== traveler?.id,
    )
    .map(t => ({
      value: t.id,
      label: `${t.nombre} ${t.apellido}`,
    }));
});

// Cuando cambia el viaje, resetear el camión y el representante
watch(() => state.value.travelId, () => {
  state.value.travelBusId = '';
  state.value.representanteId = undefined;
});

// Cuando cambia el camión, resetear el representante
watch(() => state.value.travelBusId, () => {
  state.value.representanteId = undefined;
});

// Cuando esRepresentante cambia a true, limpiar representanteId
watch(() => state.value.esRepresentante, (esRep) => {
  if (esRep) {
    state.value.representanteId = undefined;
  }
});

const isSubmitting = shallowRef(false);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  isSubmitting.value = true;
  try {
    const formData: TravelerFormData = {
      ...event.data,
      representanteId: event.data.esRepresentante ? undefined : (event.data.representanteId || undefined),
      id: traveler?.id,
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
    <!-- Datos personales -->
    <div class="grid grid-cols-2 gap-4">
      <UFormField
        label="Nombre"
        name="nombre"
        required
      >
        <UInput
          v-model="state.nombre"
          placeholder="Juan"
        />
      </UFormField>

      <UFormField
        label="Apellido"
        name="apellido"
        required
      >
        <UInput
          v-model="state.apellido"
          placeholder="Pérez"
        />
      </UFormField>
    </div>

    <UFormField
      label="Teléfono"
      name="telefono"
      required
    >
      <UInput
        v-model="state.telefono"
        type="tel"
        placeholder="+52 55 1234 5678"
      />
    </UFormField>

    <!-- Viaje y Camión -->
    <USeparator label="Asignación al viaje" />

    <UFormField
      label="Viaje"
      name="travelId"
      required
    >
      <USelect
        v-model="state.travelId"
        :items="travelOptions"
        :placeholder="travelOptions.length ? 'Seleccionar viaje' : 'No hay viajes disponibles'"
        :disabled="travelOptions.length === 0"
      />
    </UFormField>

    <UFormField
      label="Camión"
      name="travelBusId"
      required
    >
      <USelect
        v-model="state.travelBusId"
        :items="busOptions"
        :placeholder="state.travelId ? (busOptions.length ? 'Seleccionar camión' : 'Sin camiones en este viaje') : 'Selecciona un viaje primero'"
        :disabled="!state.travelId || busOptions.length === 0"
      />
    </UFormField>

    <!-- Asiento y Punto de Abordaje -->
    <div class="grid grid-cols-2 gap-4">
      <UFormField
        label="Asiento"
        name="asiento"
        required
      >
        <UInput
          v-model="state.asiento"
          placeholder="12A"
        />
      </UFormField>

      <UFormField
        label="Punto de Abordaje"
        name="puntoAbordaje"
        required
      >
        <UInput
          v-model="state.puntoAbordaje"
          placeholder="Terminal Central del Norte"
        />
      </UFormField>
    </div>

    <!-- Representante de grupo -->
    <USeparator label="Representación" />

    <UFormField name="esRepresentante">
      <UCheckbox
        v-model="state.esRepresentante"
        label="Es representante de grupo"
      />
    </UFormField>

    <!-- Selector de representante (solo si NO es representante) -->
    <UFormField
      v-if="!state.esRepresentante"
      label="Representante del grupo"
      name="representanteId"
      description="Viajero del mismo viaje y camión que actúa como representante"
    >
      <USelect
        v-model="state.representanteId"
        :items="representanteOptions"
        :placeholder="representanteOptions.length ? 'Seleccionar representante' : 'No hay representantes disponibles en este camión'"
        :disabled="!state.travelBusId || representanteOptions.length === 0"
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
        :loading="isSubmitting"
      >
        {{ traveler ? 'Actualizar' : 'Agregar' }} Viajero
      </UButton>
    </div>
  </UForm>
</template>
