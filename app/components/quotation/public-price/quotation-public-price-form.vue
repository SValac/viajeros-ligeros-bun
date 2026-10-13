<script setup lang="ts">
import { z } from 'zod';

import type { QuotationPublicPrice, QuotationPublicPriceFormData, QuotationPublicPriceTemplate } from '~/types/quotation';

import { businessNameSchema, sanitizeBusinessName, sanitizeText, textSchema } from '~/utils/form-validation';

type Props = {
  quotationId: string;
  price?: QuotationPublicPrice | null;
  template?: QuotationPublicPriceTemplate | null;
};

const { quotationId, price = null, template = null } = defineProps<Props>();

const emit = defineEmits<{
  submit: [data: QuotationPublicPriceFormData];
  cancel: [];
}>();

const AGE_GROUPS = ['Todos', 'Adultos', 'Niños'] as const;

const ageGroupOptions = AGE_GROUPS.map(group => ({ label: group, value: group }));

const schema = z.object({
  priceType: businessNameSchema({ min: 1, max: 100 }),
  // Texto libre, igual que los "Detalles adicionales" del tipo de habitación con los que se precarga
  description: textSchema({ min: 1, max: 500 }),
  pricePerPerson: z.number({ message: 'Ingresa el precio' }).positive('Debe ser mayor a 0'),
  roomType: businessNameSchema({ max: 100 }).optional().or(z.literal('')),
  ageGroup: z.enum(AGE_GROUPS, { message: 'Selecciona un grupo etario' }),
  notes: textSchema({ max: 500 }).optional(),
});

type FormSchema = z.output<typeof schema>;

// Al editar manda el precio; al agregar, la plantilla (si la hay) y si no, valores vacíos
const initial = price ?? template;

const state = reactive<Partial<FormSchema>>({
  priceType: initial?.priceType ?? '',
  description: initial?.description ?? '',
  pricePerPerson: initial?.pricePerPerson ?? 0,
  roomType: initial?.roomType ?? '',
  ageGroup: (initial?.ageGroup as FormSchema['ageGroup'] | undefined) ?? 'Todos',
  notes: initial?.notes ?? '',
});

// Read-only: comes from the reference price used as template and is kept when editing.
// Hand-written prices have none. The web groups prices into tabs by it.
const maxOccupancy = initial?.maxOccupancy;
const occupancyLabel = maxOccupancy
  ? `${maxOccupancy} persona${maxOccupancy === 1 ? '' : 's'}`
  : 'Sin ocupación (no se creó desde un precio de referencia)';

// Proxies sanitizados: filtran caracteres inválidos mientras el usuario escribe
const priceTypeInput = useSanitizedModel(() => state.priceType ?? '', v => state.priceType = v, sanitizeBusinessName);
const descriptionInput = useSanitizedModel(() => state.description ?? '', v => state.description = v, sanitizeText);
const roomTypeInput = useSanitizedModel(() => state.roomType ?? '', v => state.roomType = v, sanitizeBusinessName);
const notesInput = useSanitizedModel(() => state.notes ?? '', v => state.notes = v, sanitizeText);

function onSubmit() {
  const result = schema.safeParse(state);
  if (!result.success)
    return;

  emit('submit', {
    ...result.data,
    maxOccupancy,
    quotationId,
    ...(price ? { id: price.id } : {}),
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
      <MoneyInput v-model="state.pricePerPerson" />
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
        :items="ageGroupOptions"
        orientation="horizontal"
        class="py-1.5"
      />
    </UFormField>

    <!-- Ocupación (solo lectura) -->
    <UFormField
      label="Ocupación"
      help="Se toma del precio de referencia y no se puede editar."
      class="sm:col-span-2"
    >
      <p class="text-sm py-1.5">
        {{ occupancyLabel }}
      </p>
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
        :label="price ? 'Actualizar' : 'Agregar Precio'"
      />
    </div>
  </UForm>
</template>
