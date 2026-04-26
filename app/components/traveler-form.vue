<script setup lang="ts">
import type { FormSubmitEvent } from '#ui/types';

import { z } from 'zod';

import type { Travel, TravelBus } from '~/types/travel';
import type { Traveler, TravelerFormData } from '~/types/traveler';

type Props = {
  traveler?: Traveler | null;
  initialValues?: Partial<TravelerFormData> | null;
  availableTravels: Travel[];
  availableBuses?: TravelBus[];
  availableTravelers: Traveler[];
  lockedTravelId?: string;
};

const {
  traveler = null,
  initialValues = null,
  availableTravels,
  availableBuses = [],
  availableTravelers,
  lockedTravelId,
} = defineProps<Props>();
const emit = defineEmits<{
  submit: [data: TravelerFormData];
  cancel: [];
}>();
const travelsStore = useTravelsStore();
const providerStore = useProviderStore();

// Estado inicial del formulario
const state = ref({
  firstName: traveler?.firstName ?? initialValues?.firstName ?? '',
  lastName: traveler?.lastName ?? initialValues?.lastName ?? '',
  phone: traveler?.phone ?? initialValues?.phone ?? '',
  travelId: traveler?.travelId ?? initialValues?.travelId ?? lockedTravelId ?? '',
  travelBusId: traveler?.travelBusId ?? initialValues?.travelBusId ?? '',
  seat: traveler?.seat ?? initialValues?.seat ?? (undefined as unknown as number),
  boardingPoint: traveler?.boardingPoint ?? initialValues?.boardingPoint ?? '',
  isRepresentative: traveler?.isRepresentative ?? initialValues?.isRepresentative ?? false,
  representativeId: traveler?.representativeId ?? initialValues?.representativeId ?? undefined,
});

// Camión seleccionado — fuente de verdad para el máximo de asientos
const selectedBusForSeat = computed(() =>
  availableBuses.find(b => b.id === state.value.travelBusId),
);
const maxSeats = computed(() => selectedBusForSeat.value?.seatCount ?? 1);

// Schema reactivo al máximo de asientos del camión seleccionado
const schema = computed(() =>
  z.object({
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

    seat: z.coerce
      .number({ error: 'El asiento debe ser un número' })
      .int('El asiento debe ser un número entero')
      .min(1, 'El asiento mínimo es 1')
      .max(maxSeats.value, `Máximo ${maxSeats.value} asientos en este camión`),

    boardingPoint: z.string()
      .min(2, 'Mínimo 2 caracteres')
      .max(150, 'Máximo 150 caracteres'),

    isRepresentative: z.boolean(),

    representativeId: z.string().optional(),
  }),
);

type Schema = {
  firstName: string;
  lastName: string;
  phone: string;
  travelId: string;
  travelBusId: string;
  seat: number;
  boardingPoint: string;
  isRepresentative: boolean;
  representativeId?: string;
};

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
  const buses = lockedTravelId
    ? availableBuses
    : (selectedTravel.value?.buses ?? []);

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

// Cuando cambia el viaje, resetear el camión, asiento y representante
watch(() => state.value.travelId, () => {
  state.value.travelBusId = '';
  state.value.seat = undefined as unknown as number;
  state.value.representativeId = undefined;
});

// Cuando cambia el camión, resetear el asiento y el representante
watch(() => state.value.travelBusId, () => {
  state.value.seat = undefined as unknown as number;
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
          v-model.number="state.seat"
          type="number"
          :min="1"
          :max="maxSeats"
          :disabled="!state.travelBusId"
          :placeholder="state.travelBusId ? `1 – ${maxSeats}` : 'Selecciona un camión'"
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
