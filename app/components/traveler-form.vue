<script setup lang="ts">
import type { FormSubmitEvent } from '#ui/types';

import { z } from 'zod';

import type { Travel } from '~/types/travel';
import type { Traveler, TravelerFormData } from '~/types/traveler';

type Props = {
  traveler?: Traveler | null;
  availableTravels: Travel[];
  availableTravelers: Traveler[];
  lockedTravelId?: string;
};

const { traveler = null, availableTravels, availableTravelers, lockedTravelId } = defineProps<Props>();
const emit = defineEmits<{
  submit: [data: TravelerFormData];
  cancel: [];
}>();
const travelsStore = useTravelsStore();
const providerStore = useProviderStore();

// Schema de validación
const schema = z.object({
  firstName: z.string()
    .min(2, 'Mínimo 2 caracteres')
    .max(100, 'Máximo 100 caracteres'),

  lastName: z.string()
    .min(2, 'Mínimo 2 caracteres')
    .max(100, 'Máximo 100 caracteres'),

  phone: z.string()
    .min(7, 'Mínimo 7 caracteres')
    .max(20, 'Máximo 20 caracteres'),

  travelId: z.string().min(1, 'El viaje es requerido'),

  travelBusId: z.string().min(1, 'El camión es requerido'),

  seat: z.string().min(1, 'El asiento es requerido').max(10, 'Máximo 10 caracteres'),

  boardingPoint: z.string()
    .min(2, 'Mínimo 2 caracteres')
    .max(150, 'Máximo 150 caracteres'),

  isRepresentative: z.boolean(),

  representativeId: z.string().optional(),
});

type Schema = z.output<typeof schema>;

// Estado inicial del formulario
const state = ref<Schema>({
  firstName: traveler?.firstName ?? '',
  lastName: traveler?.lastName ?? '',
  phone: traveler?.phone ?? '',
  travelId: traveler?.travelId ?? lockedTravelId ?? '',
  travelBusId: traveler?.travelBusId ?? '',
  seat: traveler?.seat ?? '',
  boardingPoint: traveler?.boardingPoint ?? '',
  isRepresentative: traveler?.isRepresentative ?? false,
  representativeId: traveler?.representativeId ?? undefined,
});

// Opciones de viajes para USelect
const travelOptions = computed(() =>
  availableTravels.map(t => ({
    value: t.id,
    label: `${t.destination} (${t.startDate})`,
  })),
);

// Viaje seleccionado — fuente de verdad para los buses (FK a travel_buses.id)
const selectedTravel = computed(() =>
  state.value.travelId ? travelsStore.getTravelById(state.value.travelId) : undefined,
);

// Opciones de camiones: vienen de travel.buses (id de travel_buses)
const busOptions = computed(() => {
  const buses = selectedTravel.value?.buses ?? [];
  return buses.map((b) => {
    const agencia = providerStore.getProviderById(b.providerId)?.name;
    const busName = [b.brand, b.model].filter(Boolean).join(' ').trim() || 'Camión';
    const label = agencia ? `${agencia} — ${busName}` : busName;
    return { value: b.id, label };
  });
});

// Opciones de representante: viajeros del mismo viaje y camión, excluyendo al propio viajero
const representanteOptions = computed(() => {
  if (!state.value.travelId || !state.value.travelBusId)
    return [];
  return availableTravelers
    .filter(t =>
      t.travelId === state.value.travelId
      && t.travelBusId === state.value.travelBusId
      && t.isRepresentative === true
      && t.id !== traveler?.id,
    )
    .map(t => ({
      value: t.id,
      label: `${t.firstName} ${t.lastName}`,
    }));
});

// Cuando cambia el viaje, resetear el camión y el representante
watch(() => state.value.travelId, () => {
  state.value.travelBusId = '';
  state.value.representativeId = undefined;
});

// Cuando cambia el camión, resetear el representante
watch(() => state.value.travelBusId, () => {
  state.value.representativeId = undefined;
});

// Cuando isRepresentative cambia a true, limpiar representativeId
watch(() => state.value.isRepresentative, (isRep) => {
  if (isRep) {
    state.value.representativeId = undefined;
  }
});

const isSubmitting = shallowRef(false);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  isSubmitting.value = true;
  try {
    const formData: TravelerFormData = {
      ...event.data,
      representativeId: event.data.isRepresentative ? undefined : (event.data.representativeId || undefined),
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
        name="firstName"
        required
      >
        <UInput
          v-model="state.firstName"
          placeholder="Juan"
        />
      </UFormField>

      <UFormField
        label="Apellido"
        name="lastName"
        required
      >
        <UInput
          v-model="state.lastName"
          placeholder="Pérez"
        />
      </UFormField>
    </div>

    <UFormField
      label="Teléfono"
      name="phone"
      required
    >
      <UInput
        v-model="state.phone"
        type="tel"
        placeholder="+52 55 1234 5678"
      />
    </UFormField>

    <!-- Viaje y Camión -->
    <USeparator label="Asignación al viaje" />

    <UFormField
      v-if="!lockedTravelId"
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
        name="seat"
        required
      >
        <UInput
          v-model="state.seat"
          placeholder="12A"
        />
      </UFormField>

      <UFormField
        label="Punto de Abordaje"
        name="boardingPoint"
        required
      >
        <UInput
          v-model="state.boardingPoint"
          placeholder="Terminal Central del Norte"
        />
      </UFormField>
    </div>

    <!-- Representante de grupo -->
    <USeparator label="Representación" />

    <UFormField name="isRepresentative">
      <UCheckbox
        v-model="state.isRepresentative"
        label="Es representante de grupo"
      />
    </UFormField>

    <!-- Selector de representante (solo si NO es representante) -->
    <UFormField
      v-if="!state.isRepresentative"
      label="Representante del grupo"
      name="representativeId"
      description="Viajero del mismo viaje y camión que actúa como representante"
    >
      <USelect
        v-model="state.representativeId"
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
