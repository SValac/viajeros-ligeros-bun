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
  marca: z.string().max(50, 'Máximo 50 caracteres').optional().or(z.literal('')),
  modelo: z.string().max(50, 'Máximo 50 caracteres').optional().or(z.literal('')),
  año: z.coerce.number()
    .int()
    .min(1950, 'Año mínimo 1950')
    .max(currentYear + 1, `Año máximo ${currentYear + 1}`)
    .optional()
    .or(z.literal('' as unknown as number)),
  cantidadAsientos: z.coerce.number()
    .int()
    .min(1, 'Mínimo 1 asiento')
    .max(100, 'Máximo 100 asientos'),
  precioRenta: z.coerce.number()
    .min(0, 'El precio no puede ser negativo'),
  activo: z.boolean(),
});

type Schema = z.output<typeof schema>;

const state = ref<Schema>({
  marca: props.bus?.marca || '',
  modelo: props.bus?.modelo || '',
  año: props.bus?.año ?? undefined,
  cantidadAsientos: props.bus?.cantidadAsientos || 1,
  precioRenta: props.bus?.precioRenta || 0,
  activo: props.bus?.activo ?? true,
});

function onSubmit(event: FormSubmitEvent<Schema>) {
  const formData: BusFormData = {
    marca: event.data.marca || undefined,
    modelo: event.data.modelo || undefined,
    año: event.data.año || undefined,
    cantidadAsientos: event.data.cantidadAsientos,
    precioRenta: event.data.precioRenta,
    activo: event.data.activo,
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
    </div>

    <!-- Año, Asientos, Precio -->
    <div class="grid grid-cols-3 gap-4">
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

    <!-- Estado -->
    <USeparator label="Estado" />

    <UFormField name="activo">
      <UCheckbox
        v-model="state.activo"
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
