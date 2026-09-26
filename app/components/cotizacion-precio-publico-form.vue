<script setup lang="ts">
import { z } from 'zod';

import type { QuotationPublicPrice, QuotationPublicPriceFormData, QuotationPublicPriceTemplate } from '~/types/quotation';

import { businessNameSchema, sanitizeBusinessName, sanitizeText, textSchema } from '~/utils/form-validation';

type Props = {
  quotationId: string;
  precio?: QuotationPublicPrice | null;
  plantilla?: QuotationPublicPriceTemplate | null;
};

const { quotationId, precio = null, plantilla = null } = defineProps<Props>();

const emit = defineEmits<{
  submit: [data: QuotationPublicPriceFormData];
  cancel: [];
}>();

const GRUPOS_ETARIOS = ['Todos', 'Adultos', 'Niños'] as const;

const grupoEtarioOptions = GRUPOS_ETARIOS.map(grupo => ({ label: grupo, value: grupo }));

const schema = z.object({
  priceType: businessNameSchema({ min: 1, max: 100 }),
  description: businessNameSchema({ min: 1, max: 200 }),
  pricePerPerson: z.number({ message: 'Ingresa el precio' }).positive('Debe ser mayor a 0'),
  roomType: businessNameSchema({ max: 100 }).optional().or(z.literal('')),
  ageGroup: z.enum(GRUPOS_ETARIOS, { message: 'Selecciona un grupo etario' }),
  notes: textSchema({ max: 500 }).optional(),
});

type FormSchema = z.output<typeof schema>;

// Al editar manda el precio; al agregar, la plantilla (si la hay) y si no, valores vacíos
const inicial = precio ?? plantilla;

const state = reactive<Partial<FormSchema>>({
  priceType: inicial?.priceType ?? '',
  description: precio?.description ?? '',
  pricePerPerson: inicial?.pricePerPerson ?? 0,
  roomType: inicial?.roomType ?? '',
  ageGroup: (inicial?.ageGroup as FormSchema['ageGroup'] | undefined) ?? 'Todos',
  notes: inicial?.notes ?? '',
});

// Proxies sanitizados: filtran caracteres inválidos mientras el usuario escribe
const priceTypeInput = useSanitizedModel(() => state.priceType ?? '', v => state.priceType = v, sanitizeBusinessName);
const descriptionInput = useSanitizedModel(() => state.description ?? '', v => state.description = v, sanitizeBusinessName);
const roomTypeInput = useSanitizedModel(() => state.roomType ?? '', v => state.roomType = v, sanitizeBusinessName);
const notesInput = useSanitizedModel(() => state.notes ?? '', v => state.notes = v, sanitizeText);

function onSubmit() {
  const result = schema.safeParse(state);
  if (!result.success)
    return;

  emit('submit', {
    ...result.data,
    quotationId,
    ...(precio ? { id: precio.id } : {}),
  });
}
</script>

<template>
  <UForm
    :schema="schema"
    :state="state"
    class="grid grid-cols-1 sm:grid-cols-2 gap-4"
    @submit="onSubmit"
  >
    <!-- Nombre o etiqueta -->
    <UFormField
      label="Nombre o etiqueta"
      name="priceType"
      required
    >
      <UInput
        v-model="priceTypeInput"
        placeholder="Ej: Habitación doble, Niños 4-10 años"
        class="w-full"
      />
    </UFormField>

    <!-- Precio por Persona -->
    <UFormField
      label="Precio por Persona"
      name="pricePerPerson"
      required
    >
      <UInput
        v-model.number="state.pricePerPerson"
        type="number"
        step="0.01"
        min="0"
        placeholder="Ej: 2550"
        class="w-full"
      />
    </UFormField>

    <!-- Tipo Habitación (opcional) -->
    <UFormField label="Tipo Habitación (opcional)" name="roomType">
      <UInput
        v-model="roomTypeInput"
        placeholder="Ej: Sencilla, Doble"
        class="w-full"
      />
    </UFormField>

    <!-- Grupo Etario -->
    <UFormField
      label="Grupo Etario"
      name="ageGroup"
      required
    >
      <URadioGroup
        v-model="state.ageGroup"
        :items="grupoEtarioOptions"
        orientation="horizontal"
        class="py-1.5"
      />
    </UFormField>

    <!-- Descripción -->
    <UFormField
      label="Descripción"
      name="description"
      required
      class="sm:col-span-2"
    >
      <UTextarea
        v-model="descriptionInput"
        placeholder="Ej: Incluye transporte y hospedaje en habitación doble"
        :rows="2"
        autoresize
        class="w-full"
      />
    </UFormField>

    <!-- Notas -->
    <UFormField
      label="Notas (opcional)"
      name="notes"
      class="sm:col-span-2"
    >
      <UTextarea
        v-model="notesInput"
        placeholder="Observaciones adicionales..."
        :rows="2"
        autoresize
        class="w-full"
      />
    </UFormField>

    <!-- Acciones -->
    <div class="flex justify-end gap-3 pt-2 sm:col-span-2">
      <UButton
        type="button"
        variant="ghost"
        color="neutral"
        label="Cancelar"
        @click="emit('cancel')"
      />
      <UButton
        type="submit"
        :label="precio ? 'Actualizar' : 'Agregar Precio'"
      />
    </div>
  </UForm>
</template>
