<script setup lang="ts">
import { z } from 'zod';

import type { BusPayment, BusPaymentFormData } from '~/types/quotation';

type Props = {
  quotationBusId: string;
  maxMonto: number;
  pago?: BusPayment | null;
};

const { quotationBusId, maxMonto, pago = null } = defineProps<Props>();

const emit = defineEmits<{
  submit: [data: BusPaymentFormData];
  cancel: [];
}>();

const tipoPagoOptions = [
  { label: 'Efectivo', value: 'cash' },
  { label: 'Transferencia', value: 'transfer' },
];

const schema = computed(() =>
  z.object({
    amount: z
      .number({ message: 'Ingresa un monto válido' })
      .positive('El monto debe ser mayor a 0')
      .max(maxMonto, `El monto no puede superar $${maxMonto.toFixed(2)}`),
    paymentDate: z.string().min(1, 'Selecciona una fecha'),
    paymentType: z.enum(['cash', 'transfer']),
    concept: z.string().max(200).optional(),
    notes: z.string().max(500).optional(),
  }),
);

type FormSchema = {
  amount?: number;
  paymentDate: string;
  paymentType: 'cash' | 'transfer';
  concept?: string;
  notes?: string;
};

const state = reactive<FormSchema>({
  amount: pago?.amount ?? undefined,
  paymentDate: pago?.paymentDate ?? new Date().toISOString().split('T')[0]!,
  paymentType: pago?.paymentType ?? 'cash',
  concept: pago?.concept ?? '',
  notes: pago?.notes ?? '',
});

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
}

function onSubmit() {
  const result = schema.value.safeParse(state);
  if (!result.success)
    return;

  emit('submit', {
    ...result.data,
    quotationBusId,
    ...(pago?.id ? { id: pago.id } : {}),
  });
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
      label="Monto"
      name="monto"
      required
    >
      <UInput
        v-model.number="state.amount"
        type="number"
        placeholder="0.00"
        class="w-full"
      />
      <template #hint>
        <span class="text-xs text-muted">Saldo pendiente: {{ formatCurrency(maxMonto) }}</span>
      </template>
    </UFormField>

    <UFormField
      label="Fecha de Pago"
      name="fechaPago"
      required
    >
      <UInput
        v-model="state.paymentDate"
        type="date"
        class="w-full"
      />
    </UFormField>

    <UFormField
      label="Tipo de Pago"
      name="tipoPago"
      required
    >
      <USelect
        v-model="state.paymentType"
        :items="tipoPagoOptions"
        class="w-full"
      />
    </UFormField>

    <UFormField label="Concepto" name="concepto">
      <UInput
        v-model="state.concept"
        placeholder="Ej. Anticipo, Liquidación..."
        class="w-full"
      />
    </UFormField>

    <UFormField label="Notas" name="notas">
      <UTextarea
        v-model="state.notes"
        placeholder="Notas adicionales..."
        :rows="3"
        class="w-full"
      />
    </UFormField>

    <div class="flex justify-end gap-3 pt-2">
      <UButton
        type="button"
        variant="ghost"
        color="neutral"
        label="Cancelar"
        @click="emit('cancel')"
      />
      <UButton type="submit" :label="pago ? 'Actualizar Pago' : 'Registrar Pago'" />
    </div>
  </UForm>
</template>
