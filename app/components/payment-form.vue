<script setup lang="ts">
import type { PaymentFormData, PaymentType } from '~/types/payment';

const props = defineProps<{
  payment?: { id: string; amount: number; paymentDate: string; paymentType: PaymentType; notes?: string } | null;
  travelerId: string;
  travelId: string;
  maxAmount: number;
}>();

const emit = defineEmits<{
  submit: [data: PaymentFormData];
  cancel: [];
}>();

const amount = ref<number | null>(props.payment?.amount ?? null);
const paymentDate = ref(props.payment?.paymentDate ?? new Date().toISOString().split('T')[0]);
const paymentType = ref<PaymentType>(props.payment?.paymentType ?? 'cash');
const notes = ref(props.payment?.notes ?? '');

const paymentTypeOptions = [
  { label: 'Efectivo', value: 'cash' },
  { label: 'Transferencia', value: 'transfer' },
];

const amountError = computed(() => {
  if (amount.value === null)
    return '';
  if (amount.value <= 0)
    return 'El monto debe ser mayor a 0';
  if (amount.value > props.maxAmount)
    return `No puede superar el saldo pendiente (${formatCurrency(props.maxAmount)})`;
  return '';
});

const isValid = computed(() =>
  amount.value !== null
  && amount.value > 0
  && amount.value <= props.maxAmount
  && (paymentDate.value?.length ?? 0) > 0
  && paymentType.value !== undefined,
);

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
}

function handleSubmit() {
  if (!isValid.value || amount.value === null)
    return;

  const data: PaymentFormData = {
    travelId: props.travelId,
    travelerId: props.travelerId,
    amount: amount.value,
    paymentDate: paymentDate.value ?? '',
    paymentType: paymentType.value,
    notes: notes.value || undefined,
  };

  if (props.payment?.id) {
    data.id = props.payment.id;
  }

  emit('submit', data);
}
</script>

<template>
  <div class="space-y-4">
    <div>
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Monto
        <span class="text-xs text-gray-400 ml-1">(Saldo pendiente: {{ formatCurrency(maxAmount) }})</span>
      </label>
      <UInput
        v-model.number="amount"
        type="number"
        :min="0.01"
        :max="maxAmount"
        placeholder="0.00"
        step="0.01"
      />
      <p v-if="amountError" class="text-xs text-error mt-1">
        {{ amountError }}
      </p>
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Fecha de pago
      </label>
      <UInput
        v-model="paymentDate"
        type="date"
      />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Tipo de pago
      </label>
      <USelect
        v-model="paymentType"
        :items="paymentTypeOptions"
        value-key="value"
        label-key="label"
        placeholder="Selecciona tipo"
      />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Notas <span class="text-gray-400">(opcional)</span>
      </label>
      <UTextarea
        v-model="notes"
        placeholder="Referencia de transferencia, observaciones..."
        :rows="2"
      />
    </div>

    <div class="flex justify-end gap-2 pt-2">
      <UButton
        variant="ghost"
        color="neutral"
        @click="emit('cancel')"
      >
        Cancelar
      </UButton>
      <UButton :disabled="!isValid" @click="handleSubmit">
        {{ payment ? 'Guardar cambios' : 'Registrar pago' }}
      </UButton>
    </div>
  </div>
</template>
