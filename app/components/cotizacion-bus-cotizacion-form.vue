<script setup lang="ts">
import { z } from 'zod';

import type { CostSplitType, QuotationBus, QuotationBusFormData } from '~/types/quotation';

type Props = {
  bus: QuotationBus;
};

const { bus } = defineProps<Props>();

const emit = defineEmits<{
  submit: [data: Partial<QuotationBusFormData>];
  cancel: [];
}>();

const metodoPagoOptions = [
  { label: 'Efectivo', value: 'cash' },
  { label: 'Transferencia', value: 'transfer' },
];

const tipoDivisionOptions: { label: string; value: CostSplitType }[] = [
  { label: 'Asientos mínimos objetivo', value: 'minimum' },
  { label: 'Capacidad total del bus', value: 'total' },
];

const schema = z.object({
  totalCost: z.number({ message: 'Ingresa un costo válido' }).positive('El costo debe ser mayor a 0'),
  splitType: z.enum(['minimum', 'total']),
  paymentMethod: z.enum(['cash', 'transfer']),
  remarks: z.string().max(500).optional(),
  confirmed: z.boolean(),
});

type FormSchema = z.output<typeof schema>;

const state = reactive<Partial<FormSchema>>({
  totalCost: bus.totalCost ?? undefined,
  splitType: bus.splitType ?? 'minimum',
  paymentMethod: bus.paymentMethod ?? 'cash',
  remarks: bus.remarks ?? '',
  confirmed: bus.confirmed ?? false,
});

function onSubmit() {
  const result = schema.safeParse(state);
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
    <!-- Info de la unidad (readonly) -->
    <div class="bg-elevated/50 rounded-lg px-4 py-3 flex items-center gap-3">
      <span class="i-lucide-bus w-5 h-5 text-muted" />
      <div>
        <p class="font-medium text-sm">
          {{ bus.unitNumber }}
        </p>
        <p class="text-xs text-muted">
          {{ bus.capacity }} asientos
        </p>
      </div>
    </div>

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
        v-model="state.remarks"
        placeholder="Notas sobre el servicio de este autobús..."
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
      <UButton type="submit" label="Actualizar" />
    </div>
  </UForm>
</template>
