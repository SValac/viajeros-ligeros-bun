<script setup lang="ts">
import { z } from 'zod';

import type { CostSplitType, QuotationProvider, QuotationProviderFormData } from '~/types/quotation';

import { sanitizeText, textSchema } from '~/utils/form-validation';

type Props = {
  quotationId: string;
  proveedorCotizacion?: QuotationProvider | null;
};

const { quotationId, proveedorCotizacion = null } = defineProps<Props>();

const emit = defineEmits<{
  submit: [data: QuotationProviderFormData];
  cancel: [];
}>();

const schema = z.object({
  providerId: z.string().min(1, 'Selecciona un proveedor'),
  serviceDescription: textSchema({ min: 3, max: 200 }),
  totalCost: z.number({ message: 'Ingresa un costo válido' }).positive('El costo debe ser mayor a 0'),
  paymentMethod: z.enum(['cash', 'transfer']),
  splitType: z.enum(['minimum', 'total']),
  remarks: textSchema({ max: 500 }).optional(),
  confirmed: z.boolean(),
});

type FormSchema = z.output<typeof schema>;

const metodoPagoOptions = [
  { label: 'Efectivo', value: 'cash' },
  { label: 'Transferencia', value: 'transfer' },
];

const tipoDivisionOptions: { label: string; value: CostSplitType }[] = [
  { label: 'Asientos mínimos objetivo', value: 'minimum' },
  { label: 'Capacidad total del bus', value: 'total' },
];

const state = reactive<Partial<FormSchema>>({
  providerId: proveedorCotizacion?.providerId ?? undefined,
  serviceDescription: proveedorCotizacion?.serviceDescription ?? '',
  totalCost: proveedorCotizacion?.totalCost ?? undefined,
  paymentMethod: proveedorCotizacion?.paymentMethod ?? 'cash',
  splitType: proveedorCotizacion?.splitType ?? 'minimum',
  remarks: proveedorCotizacion?.remarks ?? '',
  confirmed: proveedorCotizacion?.confirmed ?? false,
});

// Proxies sanitizados: filtran caracteres inválidos mientras el usuario escribe
const serviceDescriptionInput = useSanitizedModel(() => state.serviceDescription ?? '', v => state.serviceDescription = v, sanitizeText);
const remarksInput = useSanitizedModel(() => state.remarks ?? '', v => state.remarks = v, sanitizeText);

function onSubmit() {
  const result = schema.safeParse(state);
  if (!result.success)
    return;

  const data: QuotationProviderFormData = {
    ...result.data,
    quotationId,
    ...(proveedorCotizacion?.id ? { id: proveedorCotizacion.id } : {}),
  };

  emit('submit', data);
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
      <ProviderSelector
        v-model="state.providerId"
        :exclude-categories="['accommodation', 'bus_agencies']"
      />
    </UFormField>

    <!-- Descripción del Servicio -->
    <UFormField
      label="Descripción del Servicio"
      name="descripcionServicio"
      required
    >
      <UInput
        v-model="serviceDescriptionInput"
        placeholder="Ej. Servicio de transporte Ciudad de México - Puebla"
        class="w-full"
      />
    </UFormField>

    <!-- Costo Total -->
    <UFormField
      label="Costo Total"
      name="costoTotal"
      required
    >
      <UInput
        v-model.number="state.totalCost"
        type="number"
        placeholder="0.00"
        class="w-full"
      />
    </UFormField>

    <!-- Dividir entre -->
    <UFormField
      label="Dividir entre"
      name="tipoDivision"
      required
    >
      <USelect
        v-model="state.splitType"
        :items="tipoDivisionOptions"
        class="w-full"
      />
    </UFormField>

    <!-- Método de Pago -->
    <UFormField
      label="Método de Pago"
      name="metodoPago"
      required
    >
      <USelect
        v-model="state.paymentMethod"
        :items="metodoPagoOptions"
        class="w-full"
      />
    </UFormField>

    <!-- Observaciones -->
    <UFormField label="Observaciones" name="observaciones">
      <UTextarea
        v-model="remarksInput"
        placeholder="Notas adicionales sobre este servicio..."
        :rows="3"
        class="w-full"
      />
    </UFormField>

    <!-- Confirmado -->
    <UFormField name="confirmado">
      <UCheckbox
        v-model="state.confirmed"
        label="Servicio confirmado por el proveedor"
      />
    </UFormField>

    <!-- Acciones -->
    <div class="flex justify-end gap-3 pt-2">
      <UButton
        type="button"
        variant="ghost"
        color="neutral"
        label="Cancelar"
        @click="emit('cancel')"
      />
      <UButton
        type="submit"
        :label="proveedorCotizacion ? 'Actualizar' : 'Agregar Proveedor'"
      />
    </div>
  </UForm>
</template>
