<script setup lang="ts">
import { z } from 'zod';

import type { SupplierPaymentFields } from '~/types/quotation';

import { formatCurrency } from '~/utils/currency';
import { sanitizeText, textSchema } from '~/utils/form-validation';
import { todayISO } from '~/utils/format-date';
import { PAYMENT_TYPE_OPTIONS } from '~/utils/payment-type';

type Props = {
  maxAmount: number;
  payment?: SupplierPaymentFields | null;
};

const { maxAmount, payment = null } = defineProps<Props>();

const emit = defineEmits<{
  submit: [data: SupplierPaymentFields];
  cancel: [];
}>();

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
  paymentDate: payment?.paymentDate ?? todayISO(),
  paymentType: payment?.paymentType ?? 'cash',
  concept: payment?.concept ?? '',
  notes: payment?.notes ?? '',
});

// Sanitized proxies: filter out invalid characters while the user types
const conceptInput = useSanitizedModel(() => state.concept ?? '', v => state.concept = v, sanitizeText);
const notesInput = useSanitizedModel(() => state.notes ?? '', v => state.notes = v, sanitizeText);

function onSubmit() {
  const result = schema.value.safeParse(state);
  if (!result.success)
    return;

  emit('submit', result.data);
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
      name="amount"
      required
    >
      <MoneyInput v-model="state.amount" />
      <template #hint>
        <span class="text-xs text-muted">Saldo pendiente: {{ formatCurrency(maxAmount) }}</span>
      </template>
    </UFormField>

    <UFormField
      label="Fecha de Pago"
      name="paymentDate"
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
      name="paymentType"
      required
    >
      <USelect
        v-model="state.paymentType"
        :items="PAYMENT_TYPE_OPTIONS"
        class="w-full"
      />
    </UFormField>

    <UFormField label="Concepto" name="concept">
      <UInput
        v-model="conceptInput"
        placeholder="Ej. Anticipo, Liquidación..."
        class="w-full"
      />
    </UFormField>

    <UFormField label="Notas" name="notes">
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
