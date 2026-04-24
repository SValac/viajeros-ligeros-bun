<script setup lang="ts">
import type { FormSubmitEvent } from '#ui/types';

import { z } from 'zod';

import type { Bus, BusFormData } from '~/types/bus';

type Props = {
  bus?: Bus | null;
  providerId: string;
};

const props = defineProps<Props>();

const emit = defineEmits<{
  submit: [data: BusFormData];
  cancel: [];
}>();

const currentYear = new Date().getFullYear();

const schema = z.object({
  brand: z.string().max(50, 'Máximo 50 caracteres').optional().or(z.literal('')),
  model: z.string().max(50, 'Máximo 50 caracteres').optional().or(z.literal('')),
  year: z.coerce.number()
    .int()
    .min(1950, 'Año mínimo 1950')
    .max(currentYear + 1, `Año máximo ${currentYear + 1}`)
    .optional()
    .or(z.literal('' as unknown as number)),
  seatCount: z.coerce.number()
    .int()
    .min(1, 'Mínimo 1 asiento')
    .max(100, 'Máximo 100 asientos'),
  rentalPrice: z.coerce.number()
    .min(0, 'El precio no puede ser negativo'),
  active: z.boolean(),
});

type Schema = z.output<typeof schema>;

const state = ref<Schema>({
  brand: props.bus?.brand || '',
  model: props.bus?.model || '',
  year: props.bus?.year ?? undefined,
  seatCount: props.bus?.seatCount || 1,
  rentalPrice: props.bus?.rentalPrice || 0,
  active: props.bus?.active ?? true,
});

function onSubmit(event: FormSubmitEvent<Schema>) {
  const formData: BusFormData = {
    brand: event.data.brand || undefined,
    model: event.data.model || undefined,
    year: event.data.year || undefined,
    seatCount: event.data.seatCount,
    rentalPrice: event.data.rentalPrice,
    active: event.data.active,
    providerId: props.providerId,
    id: props.bus?.id,
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
    <!-- Marca y Modelo -->
    <div class="grid grid-cols-2 gap-4">
      <UFormField
        label="Marca"
        name="brand"
      >
        <UInput
          v-model="state.brand"
          placeholder="Mercedes-Benz"
        />
      </UFormField>

      <UFormField
        label="Modelo"
        name="model"
      >
        <UInput
          v-model="state.model"
          placeholder="Sprinter 516"
        />
      </UFormField>
    </div>

    <!-- Año, Asientos, Precio -->
    <div class="grid grid-cols-3 gap-4">
      <UFormField
        label="Año"
        name="year"
      >
        <UInput
          v-model="state.year"
          type="number"
          placeholder="2022"
        />
      </UFormField>

      <UFormField
        label="Cantidad de asientos"
        name="seatCount"
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
        name="rentalPrice"
        required
      >
        <UInput
          v-model="state.rentalPrice"
          type="number"
          placeholder="5000"
        />
      </UFormField>
    </div>

    <!-- Estado -->
    <USeparator label="Estado" />

    <UFormField name="active">
      <UCheckbox
        v-model="state.active"
        label="Unidad activa"
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
        {{ bus ? 'Actualizar' : 'Registrar' }} Unidad
      </UButton>
    </div>
  </UForm>
</template>
