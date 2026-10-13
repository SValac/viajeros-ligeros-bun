<script setup lang="ts">
import type { FormSubmitEvent } from '#ui/types';

import { z } from 'zod';

type BusOption = {
  value: string;
  label: string;
  seatCount: number;
  /** Seats already taken in this bus, by anyone else. */
  takenSeats: number[];
};

type Props = {
  buses: BusOption[];
  initialBusId?: string;
  initialSeat?: number | null;
};

const { buses, initialBusId, initialSeat } = defineProps<Props>();
const emit = defineEmits<{
  submit: [data: { travelBusId: string; seat: number }];
  cancel: [];
}>();

const state = ref({
  travelBusId: initialBusId ?? buses[0]?.value ?? '',
  seat: initialSeat ?? (undefined as unknown as number),
});

const selectedBus = computed(() => buses.find(b => b.value === state.value.travelBusId));
const maxSeats = computed(() => selectedBus.value?.seatCount ?? 1);
const takenSeats = computed(() => new Set(selectedBus.value?.takenSeats ?? []));

const schema = computed(() =>
  z.object({
    travelBusId: z.string().min(1, 'El camión es requerido'),
    seat: z.coerce
      .number({ error: 'El asiento debe ser un número' })
      .int('El asiento debe ser un número entero')
      .min(1, 'El asiento mínimo es 1')
      .max(maxSeats.value, `Máximo ${maxSeats.value} asientos en este camión`)
      .refine(seat => !takenSeats.value.has(seat), 'Ese asiento ya está ocupado'),
  }),
);

type Schema = { travelBusId: string; seat: number };

watch(() => state.value.travelBusId, (busId, previous) => {
  if (previous !== undefined && busId !== previous)
    state.value.seat = undefined as unknown as number;
});

function onSubmit(event: FormSubmitEvent<Schema>) {
  emit('submit', { travelBusId: event.data.travelBusId, seat: event.data.seat });
}
</script>

<template>
  <UForm
    :schema="schema"
    :state="state"
    class="space-y-4"
    @submit="onSubmit"
  >
    <UFormField
      label="Camión"
      name="travelBusId"
      required
    >
      <USelect
        v-model="state.travelBusId"
        :items="buses"
        :placeholder="buses.length ? 'Seleccionar camión' : 'Sin camiones en este viaje'"
        :disabled="buses.length === 0"
        class="w-full"
      />
    </UFormField>

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
        class="w-full"
      />
    </UFormField>

    <div class="flex justify-end gap-3 pt-2">
      <UButton
        type="button"
        color="neutral"
        variant="outline"
        label="Cancelar"
        @click="emit('cancel')"
      />
      <UButton type="submit" label="Asignar asiento" />
    </div>
  </UForm>
</template>
