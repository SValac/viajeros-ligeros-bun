<script setup lang="ts">
import { z } from 'zod';

import type { QuotationPublicPrice, QuotationPublicPriceFormData, QuotationPublicPriceTemplate } from '~/types/quotation';

import { businessNameSchema, sanitizeBusinessName, sanitizeText, textSchema } from '~/utils/form-validation';
import { pluralize } from '~/utils/pluralize';

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
  // Free text, like the room type's "Detalles adicionales" it's prefilled with
  description: textSchema({ min: 1, max: 500 }),
  pricePerPerson: z.number({ message: 'Ingresa el precio' }).positive('Debe ser mayor a 0'),
  roomType: businessNameSchema({ max: 100 }).optional().or(z.literal('')),
  ageGroup: z.enum(AGE_GROUPS, { message: 'Selecciona un grupo etario' }),
  notes: textSchema({ max: 500 }).optional(),
});

type FormSchema = z.output<typeof schema>;

// When editing, the price wins; when adding, the template (if any), otherwise empty values
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
  ? pluralize(maxOccupancy, 'persona')
  : 'Sin ocupación (no se creó desde un precio de referencia)';

// Sanitized proxies: filter out invalid characters while the user types
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
    <!-- Name or label -->
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

    <!-- Price per Person -->
    <UFormField
      label="Precio por Persona"
      name="pricePerPerson"
      required
    >
      <MoneyInput v-model="state.pricePerPerson" />
    </UFormField>

    <!-- Room Type (optional) -->
    <UFormField label="Tipo Habitación (opcional)" name="roomType">
      <UInput
        v-model="roomTypeInput"
        placeholder="Ej: Sencilla, Doble"
        class="w-full"
      />
    </UFormField>

    <!-- Age Group -->
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

    <!-- Occupancy (read-only) -->
    <UFormField
      label="Ocupación"
      help="Se toma del precio de referencia y no se puede editar."
      class="sm:col-span-2"
    >
      <p class="text-sm py-1.5">
        {{ occupancyLabel }}
      </p>
    </UFormField>

    <!-- Description -->
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

    <!-- Notes -->
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

    <!-- Actions -->
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
