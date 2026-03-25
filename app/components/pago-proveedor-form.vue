<script setup lang="ts">
import { z } from 'zod';
import type { PagoProveedor, PagoProveedorFormData } from '~/types/cotizacion';

type Props = {
  cotizacionProveedorId: string;
  maxMonto: number;
  pago?: PagoProveedor | null;
};

const { cotizacionProveedorId, maxMonto, pago = null } = defineProps<Props>();

const emit = defineEmits<{
  submit: [data: PagoProveedorFormData];
  cancel: [];
}>();

const tipoPagoOptions = [
  { label: 'Efectivo', value: 'cash' },
  { label: 'Transferencia', value: 'transfer' },
];

const schema = computed(() =>
  z.object({
    monto: z
      .number({ message: 'Ingresa un monto válido' })
      .positive('El monto debe ser mayor a 0')
      .max(maxMonto, `El monto no puede superar $${maxMonto.toFixed(2)}`),
    fechaPago: z.string().min(1, 'Selecciona una fecha'),
    tipoPago: z.enum(['cash', 'transfer']),
    concepto: z.string().max(200, 'Máximo 200 caracteres').optional(),
    notas: z.string().max(500, 'Máximo 500 caracteres').optional(),
  }),
);

type FormSchema = {
  monto?: number;
  fechaPago: string;
  tipoPago: 'cash' | 'transfer';
  concepto?: string;
  notas?: string;
};

const state = reactive<FormSchema>({
  monto: pago?.monto ?? undefined,
  fechaPago: pago?.fechaPago ?? new Date().toISOString().split('T')[0]!,
  tipoPago: pago?.tipoPago ?? 'cash',
  concepto: pago?.concepto ?? '',
  notas: pago?.notas ?? '',
});

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);
}

function onSubmit() {
  const result = schema.value.safeParse(state);
  if (!result.success) return;

  const data: PagoProveedorFormData = {
    ...result.data,
    cotizacionProveedorId,
    ...(pago?.id ? { id: pago.id } : {}),
  };

  emit('submit', data);
}
</script>

<template>
  <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
    <!-- Monto -->
    <UFormField label="Monto" name="monto" required>
      <UInput
        v-model.number="state.monto"
        type="number"
        placeholder="0.00"
        class="w-full"
      />
      <template #hint>
        <span class="text-xs text-muted">
          Saldo pendiente: {{ formatCurrency(maxMonto) }}
        </span>
      </template>
    </UFormField>

    <!-- Fecha de Pago -->
    <UFormField label="Fecha de Pago" name="fechaPago" required>
      <UInput
        v-model="state.fechaPago"
        type="date"
        class="w-full"
      />
    </UFormField>

    <!-- Tipo de Pago -->
    <UFormField label="Tipo de Pago" name="tipoPago" required>
      <USelect
        v-model="state.tipoPago"
        :items="tipoPagoOptions"
        class="w-full"
      />
    </UFormField>

    <!-- Concepto -->
    <UFormField label="Concepto" name="concepto">
      <UInput
        v-model="state.concepto"
        placeholder="Ej. Anticipo, Liquidación..."
        class="w-full"
      />
    </UFormField>

    <!-- Notas -->
    <UFormField label="Notas" name="notas">
      <UTextarea
        v-model="state.notas"
        placeholder="Notas adicionales..."
        :rows="3"
        class="w-full"
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
        :label="pago ? 'Actualizar Pago' : 'Registrar Pago'"
      />
    </div>
  </UForm>
</template>
