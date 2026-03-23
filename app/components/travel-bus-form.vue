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
  marca: z.string().max(60).optional().or(z.literal('')),
  modelo: z.string().max(60).optional().or(z.literal('')),
  año: z.coerce.number().int().min(1950).max(currentYear + 1).optional().or(z.literal('' as unknown as number)),
  cantidadAsientos: z.coerce.number().int().min(1, 'Mínimo 1 asiento').max(100, 'Máximo 100 asientos'),
  precioRenta: z.coerce.number().min(0, 'El precio no puede ser negativo'),
  operador1Nombre: z.string().min(2, 'El nombre es requerido').max(100),
  operador1Telefono: z.string().min(7, 'El teléfono es requerido').max(20),
  operador2Nombre: z.string().max(100).optional().or(z.literal('')),
  operador2Telefono: z.string().max(20).optional().or(z.literal('')),
});

type Schema = z.output<typeof schema>;

const state = ref<Schema>({
  providerId: travelBus?.providerId ?? '',
  busId: travelBus?.busId,
  marca: travelBus?.marca ?? '',
  modelo: travelBus?.modelo ?? '',
  año: travelBus?.año,
  cantidadAsientos: travelBus?.cantidadAsientos ?? 1,
  precioRenta: travelBus?.precioRenta ?? 0,
  operador1Nombre: travelBus?.operador1Nombre ?? '',
  operador1Telefono: travelBus?.operador1Telefono ?? '',
  operador2Nombre: travelBus?.operador2Nombre ?? '',
  operador2Telefono: travelBus?.operador2Telefono ?? '',
});

// Derived: providers of category agencias-autobus (active)
const providerOptions = computed(() =>
  providerStore.getProvidersByCategory('agencias-autobus').map(p => ({
    value: p.id,
    label: p.nombre,
  })),
);

// Derived: buses filtered by selected provider (active only)
const busOptions = computed(() => {
  if (!state.value.providerId)
    return [];
  return busStore.getBusesByProvider(state.value.providerId).map(b => ({
    value: b.id,
    label: [b.marca, b.modelo, b.año].filter(Boolean).join(' ') || `Unidad ${b.id.slice(-4)}`,
  }));
});

// Side effect: when provider changes, clear bus selection and vehicle fields
watch(() => state.value.providerId, () => {
  state.value.busId = undefined;
  state.value.marca = '';
  state.value.modelo = '';
  state.value.año = undefined;
});

// Side effect: when a catalog bus is selected, prefill vehicle fields
watch(() => state.value.busId, (newBusId) => {
  if (!newBusId)
    return;
  const bus = busStore.getBusById(newBusId);
  if (bus) {
    state.value.marca = bus.marca ?? '';
    state.value.modelo = bus.modelo ?? '';
    state.value.año = bus.año;
    state.value.cantidadAsientos = bus.cantidadAsientos;
    state.value.precioRenta = bus.precioRenta;
  }
});

const isSubmitting = shallowRef(false);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  isSubmitting.value = true;
  try {
    const busData: Omit<TravelBus, 'id'> = {
      providerId: event.data.providerId,
      busId: event.data.busId || undefined,
      marca: event.data.marca || undefined,
      modelo: event.data.modelo || undefined,
      año: event.data.año || undefined,
      cantidadAsientos: event.data.cantidadAsientos,
      precioRenta: event.data.precioRenta,
      operador1Nombre: event.data.operador1Nombre,
      operador1Telefono: event.data.operador1Telefono,
      operador2Nombre: event.data.operador2Nombre || undefined,
      operador2Telefono: event.data.operador2Telefono || undefined,
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
          v-model="state.marca"
          placeholder="Mercedes-Benz"
        />
      </UFormField>

      <UFormField
        label="Modelo"
        name="modelo"
      >
        <UInput
          v-model="state.modelo"
          placeholder="Sprinter 516"
        />
      </UFormField>

      <UFormField
        label="Año"
        name="año"
      >
        <UInput
          v-model="state.año"
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
          v-model="state.cantidadAsientos"
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
          v-model="state.precioRenta"
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
          v-model="state.operador1Nombre"
          placeholder="Juan Pérez"
        />
      </UFormField>

      <UFormField
        label="Operador 1 — Teléfono"
        name="operador1Telefono"
        required
      >
        <UInput
          v-model="state.operador1Telefono"
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
          v-model="state.operador2Nombre"
          placeholder="María López"
        />
      </UFormField>

      <UFormField
        label="Operador 2 — Teléfono"
        name="operador2Telefono"
      >
        <UInput
          v-model="state.operador2Telefono"
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
