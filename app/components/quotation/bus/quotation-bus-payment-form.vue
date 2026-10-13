<script setup lang="ts">
import { z } from 'zod';

import type { BusPayment, BusPaymentFormData } from '~/types/quotation';

import { formatCurrency } from '~/utils/currency';
import { sanitizeText, textSchema } from '~/utils/form-validation';

type Props = {
  quotationBusId: string;
  maxAmount: number;
  payment?: BusPayment | null;
};

const { quotationBusId, maxAmount, payment = null } = defineProps<Props>();

const emit = defineEmits<{
  submit: [data: BusPaymentFormData];
  cancel: [];
}>();

const paymentTypeOptions = [
  { label: 'Efectivo', value: 'cash' },
  { label: 'Transferencia', value: 'transfer' },
];

const schema = computed(() =>
  z.object({
    amount: z
      .number({ message: 'Ingresa un monto válido' })
      .positive('El monto debe ser mayor a 0')
      .max(maxAmount, `El monto no puede superar ${formatCurrency(maxAmount)}`),
    paymentDate: z.string().min(1, 'Selecciona una fecha'),
    paymentType: z.enum(['cash', 'transfer']),
    concept: textSchema({ max: 200 }).optional(),
    notes: textSchema({ max: 500 }).optional(),
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
  amount: payment?.amount ?? undefined,
  paymentDate: payment?.paymentDate ?? new Date().toISOString().split('T')[0]!,
  paymentType: payment?.paymentType ?? 'cash',
  concept: payment?.concept ?? '',
  notes: payment?.notes ?? '',
});

// Proxies sanitizados: filtran caracteres inválidos mientras el usuario escribe
const conceptInput = useSanitizedModel(() => state.concept ?? '', v => state.concept = v, sanitizeText);
const notesInput = useSanitizedModel(() => state.notes ?? '', v => state.notes = v, sanitizeText);

function onSubmit() {
  const result = schema.value.safeParse(state);
  if (!result.success)
    return;

  emit('submit', {
    ...result.data,
    quotationBusId,
    ...(payment?.id ? { id: payment.id } : {}),
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
      <MoneyInput v-model="state.amount" />
      <template #hint>
        <span class="text-xs text-muted">Saldo pendiente: {{ formatCurrency(maxAmount) }}</span>
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
        :items="paymentTypeOptions"
        class="w-full"
      />
    </UFormField>

    <UFormField label="Concepto" name="concepto">
      <UInput
        v-model="conceptInput"
        placeholder="Ej. Anticipo, Liquidación..."
        class="w-full"
      />
    </UFormField>

    <UFormField label="Notas" name="notas">
      <UTextarea
        v-model="notesInput"
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
      <UButton type="submit" :label="payment ? 'Actualizar Pago' : 'Registrar Pago'" />
    </div>
  </UForm>
</template>
