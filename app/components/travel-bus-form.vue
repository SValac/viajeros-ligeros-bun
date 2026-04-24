<script setup lang="ts">
import type { FormSubmitEvent } from '#ui/types';

import { z } from 'zod';

import type { TravelBus } from '~/types/travel';

type Props = {
  travelBus?: TravelBus | null;
};

const { travelBus = null } = defineProps<Props>();

const emit = defineEmits<{
  submit: [data: Omit<TravelBus, 'id'>];
  cancel: [];
}>();

const providerStore = useProviderStore();
const busStore = useBusStore();

const currentYear = new Date().getFullYear();

const schema = z.object({
  providerId: z.string().min(1, 'El proveedor es requerido'),
  busId: z.string().optional(),
  brand: z.string().max(60).optional().or(z.literal('')),
  model: z.string().max(60).optional().or(z.literal('')),
  year: z.coerce.number().int().min(1950).max(currentYear + 1).optional().or(z.literal('' as unknown as number)),
  seatCount: z.coerce.number().int().min(1, 'Mínimo 1 asiento').max(100, 'Máximo 100 asientos'),
  rentalPrice: z.coerce.number().min(0, 'El precio no puede ser negativo'),
  operator1Name: z.string().min(2, 'El nombre es requerido').max(100),
  operator1Phone: z.string().min(7, 'El teléfono es requerido').max(20),
  operator2Name: z.string().max(100).optional().or(z.literal('')),
  operator2Phone: z.string().max(20).optional().or(z.literal('')),
});

type Schema = z.output<typeof schema>;

const state = ref<Schema>({
  providerId: travelBus?.providerId ?? '',
  busId: travelBus?.busId,
  brand: travelBus?.brand ?? '',
  model: travelBus?.model ?? '',
  year: travelBus?.year,
  seatCount: travelBus?.seatCount ?? 1,
  rentalPrice: travelBus?.rentalPrice ?? 0,
  operator1Name: travelBus?.operator1Name ?? '',
  operator1Phone: travelBus?.operator1Phone ?? '',
  operator2Name: travelBus?.operator2Name ?? '',
  operator2Phone: travelBus?.operator2Phone ?? '',
});

// Derived: providers of category agencias-autobus (active)
const providerOptions = computed(() =>
  providerStore.getProvidersByCategory('bus_agencies').map(p => ({
    value: p.id,
    label: p.name,
  })),
);

// Derived: buses filtered by selected provider (active only)
const busOptions = computed(() => {
  if (!state.value.providerId)
    return [];
  return busStore.getBusesByProvider(state.value.providerId).map(b => ({
    value: b.id,
    label: [b.brand, b.model, b.year].filter(Boolean).join(' ') || `Unidad ${b.id.slice(-4)}`,
  }));
});

// Side effect: when provider changes, clear bus selection and vehicle fields
watch(() => state.value.providerId, () => {
  state.value.busId = undefined;
  state.value.brand = '';
  state.value.model = '';
  state.value.year = undefined;
});

// Side effect: when a catalog bus is selected, prefill vehicle fields
watch(() => state.value.busId, (newBusId) => {
  if (!newBusId)
    return;
  const bus = busStore.getBusById(newBusId);
  if (bus) {
    state.value.brand = bus.brand ?? '';
    state.value.model = bus.model ?? '';
    state.value.year = bus.year;
    state.value.seatCount = bus.seatCount;
    state.value.rentalPrice = bus.rentalPrice;
  }
});

const isSubmitting = shallowRef(false);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  isSubmitting.value = true;
  try {
    const busData: Omit<TravelBus, 'id'> = {
      providerId: event.data.providerId,
      busId: event.data.busId || undefined,
      brand: event.data.brand || undefined,
      model: event.data.model || undefined,
      year: event.data.year || undefined,
      seatCount: event.data.seatCount,
      rentalPrice: event.data.rentalPrice,
      operator1Name: event.data.operator1Name,
      operator1Phone: event.data.operator1Phone,
      operator2Name: event.data.operator2Name || undefined,
      operator2Phone: event.data.operator2Phone || undefined,
    };
    emit('submit', busData);
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
    <!-- Proveedor -->
    <UFormField
      label="Proveedor"
      name="providerId"
      required
    >
      <USelect
        v-model="state.providerId"
        :items="providerOptions"
        placeholder="Seleccionar agencia de autobús"
      />
    </UFormField>

    <!-- Unidad del catálogo (opcional, solo visible si hay proveedor) -->
    <UFormField
      v-if="state.providerId"
      label="Unidad del catálogo"
      name="busId"
      description="Opcional — selecciona una unidad registrada para pre-llenar los campos"
    >
      <USelect
        v-model="state.busId"
        :items="busOptions"
        :placeholder="busOptions.length ? 'Seleccionar unidad' : 'No hay unidades registradas para este proveedor'"
        :disabled="busOptions.length === 0"
      />
    </UFormField>

    <!-- Vehículo: Marca, Modelo, Año -->
    <div class="grid grid-cols-3 gap-4">
      <UFormField
        label="Marca"
        name="marca"
      >
        <UInput
          v-model="state.brand"
          placeholder="Mercedes-Benz"
        />
      </UFormField>

      <UFormField
        label="Modelo"
        name="modelo"
      >
        <UInput
          v-model="state.model"
          placeholder="Sprinter 516"
        />
      </UFormField>

      <UFormField
        label="Año"
        name="año"
      >
        <UInput
          v-model="state.year"
          type="number"
          placeholder="2022"
        />
      </UFormField>
    </div>

    <!-- Asientos y Precio -->
    <div class="grid grid-cols-2 gap-4">
      <UFormField
        label="Cantidad de asientos"
        name="cantidadAsientos"
        required
      >
        <UInput
          v-model="state.seatCount"
          type="number"
          placeholder="40"
        />
      </UFormField>

      <UFormField
        label="Precio de renta"
        name="precioRenta"
        required
      >
        <UInput
          v-model="state.rentalPrice"
          type="number"
          placeholder="5000"
        />
      </UFormField>
    </div>

    <!-- Operadores -->
    <USeparator label="Operadores" />

    <div class="grid grid-cols-2 gap-4">
      <UFormField
        label="Operador 1 — Nombre"
        name="operador1Nombre"
        required
      >
        <UInput
          v-model="state.operator1Name"
          placeholder="Juan Pérez"
        />
      </UFormField>

      <UFormField
        label="Operador 1 — Teléfono"
        name="operador1Telefono"
        required
      >
        <UInput
          v-model="state.operator1Phone"
          type="tel"
          placeholder="+52 55 1234 5678"
        />
      </UFormField>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <UFormField
        label="Operador 2 — Nombre"
        name="operador2Nombre"
      >
        <UInput
          v-model="state.operator2Name"
          placeholder="María López"
        />
      </UFormField>

      <UFormField
        label="Operador 2 — Teléfono"
        name="operador2Telefono"
      >
        <UInput
          v-model="state.operator2Phone"
          type="tel"
          placeholder="+52 55 8765 4321"
        />
      </UFormField>
    </div>

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
        {{ travelBus ? 'Actualizar' : 'Agregar' }} Autobús
      </UButton>
    </div>
  </UForm>
</template>
