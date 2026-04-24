<script setup lang="ts">
import type { FormSubmitEvent } from '#ui/types';

import { z } from 'zod';

import type { Coordinator, CoordinatorFormData } from '~/types/coordinator';

type Props = {
  coordinator?: Coordinator | null;
};

const { coordinator = null } = defineProps<Props>();

const emit = defineEmits<{
  submit: [data: CoordinatorFormData];
  cancel: [];
}>();

const schema = z.object({
  name: z.string()
    .min(2, 'Mínimo 2 caracteres')
    .max(100, 'Máximo 100 caracteres'),

  age: z.number({ error: 'Ingresa una edad válida' })
    .int('Debe ser un número entero')
    .min(18, 'Mínimo 18 años')
    .max(99, 'Máximo 99 años'),

  phone: z.string()
    .min(7, 'Mínimo 7 caracteres')
    .max(20, 'Máximo 20 caracteres'),

  email: z.string()
    .email('Email inválido')
    .max(150, 'Máximo 150 caracteres'),

  notes: z.string().max(500, 'Máximo 500 caracteres').optional(),
});

type Schema = z.output<typeof schema>;

const state = ref<Schema>({
  name: coordinator?.name ?? '',
  age: coordinator?.age ?? ('' as unknown as number),
  phone: coordinator?.phone ?? '',
  email: coordinator?.email ?? '',
  notes: coordinator?.notes ?? '',
});

const isSubmitting = shallowRef(false);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  isSubmitting.value = true;
  try {
    const formData: CoordinatorFormData = {
      ...event.data,
      notes: event.data.notes || undefined,
      id: coordinator?.id,
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
    <div class="grid grid-cols-2 gap-4">
      <UFormField
        label="Nombre"
        name="name"
        required
        class="col-span-2"
      >
        <UInput
          v-model="state.name"
          placeholder="Ana García"
        />
      </UFormField>

      <UFormField
        label="Edad"
        name="age"
        required
      >
        <UInput
          v-model.number="state.age"
          type="number"
          placeholder="30"
          :min="18"
          :max="99"
        />
      </UFormField>

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
    </div>

    <UFormField
      label="Email"
      name="email"
      required
    >
      <UInput
        v-model="state.email"
        type="email"
        placeholder="coordinador@ejemplo.com"
      />
    </UFormField>

    <UFormField
      label="Notas"
      name="notes"
    >
      <UTextarea
        v-model="state.notes"
        placeholder="Información adicional sobre el coordinador..."
        :rows="3"
      />
    </UFormField>

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
        {{ coordinator ? 'Actualizar' : 'Agregar' }} Coordinador
      </UButton>
    </div>
  </UForm>
</template>
