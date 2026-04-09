<script setup lang="ts">
import { z } from 'zod';
import type { CotizacionProveedor, CotizacionProveedorFormData, TipoDivisionCosto } from '~/types/cotizacion';

type Props = {
  cotizacionId: string;
  proveedorCotizacion?: CotizacionProveedor | null;
};

const { cotizacionId, proveedorCotizacion = null } = defineProps<Props>();

const emit = defineEmits<{
  submit: [data: CotizacionProveedorFormData];
  cancel: [];
}>();

const schema = z.object({
  providerId: z.string().min(1, 'Selecciona un proveedor'),
  descripcionServicio: z.string().min(3, 'Mínimo 3 caracteres').max(200, 'Máximo 200 caracteres'),
  costoTotal: z.number({ message: 'Ingresa un costo válido' }).positive('El costo debe ser mayor a 0'),
  metodoPago: z.enum(['cash', 'transfer']),
  tipoDivision: z.enum(['minimo', 'total']),
  observaciones: z.string().max(500, 'Máximo 500 caracteres').optional(),
  confirmado: z.boolean(),
});

type FormSchema = z.output<typeof schema>;

const metodoPagoOptions = [
  { label: 'Efectivo', value: 'cash' },
  { label: 'Transferencia', value: 'transfer' },
];

const tipoDivisionOptions: { label: string; value: TipoDivisionCosto }[] = [
  { label: 'Asientos mínimos objetivo', value: 'minimo' },
  { label: 'Capacidad total del bus', value: 'total' },
];

const state = reactive<Partial<FormSchema>>({
  providerId: proveedorCotizacion?.providerId ?? undefined,
  descripcionServicio: proveedorCotizacion?.descripcionServicio ?? '',
  costoTotal: proveedorCotizacion?.costoTotal ?? undefined,
  metodoPago: proveedorCotizacion?.metodoPago ?? 'cash',
  tipoDivision: proveedorCotizacion?.tipoDivision ?? 'minimo',
  observaciones: proveedorCotizacion?.observaciones ?? '',
  confirmado: proveedorCotizacion?.confirmado ?? false,
});

function onSubmit() {
  const result = schema.safeParse(state);
  if (!result.success) return;

  const data: CotizacionProveedorFormData = {
    ...result.data,
    cotizacionId,
    ...(proveedorCotizacion?.id ? { id: proveedorCotizacion.id } : {}),
  };

  emit('submit', data);
}
</script>

<template>
  <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
    <!-- Proveedor -->
    <UFormField label="Proveedor" name="providerId" required>
      <ProviderSelector v-model="state.providerId" />
    </UFormField>

    <!-- Descripción del Servicio -->
    <UFormField label="Descripción del Servicio" name="descripcionServicio" required>
      <UInput
        v-model="state.descripcionServicio"
        placeholder="Ej. Servicio de transporte Ciudad de México - Puebla"
        class="w-full"
      />
    </UFormField>

    <!-- Costo Total -->
    <UFormField label="Costo Total" name="costoTotal" required>
      <UInput
        v-model.number="state.costoTotal"
        type="number"
        placeholder="0.00"
        class="w-full"
      />
    </UFormField>

    <!-- Dividir entre -->
    <UFormField label="Dividir entre" name="tipoDivision" required>
      <USelect
        v-model="state.tipoDivision"
        :items="tipoDivisionOptions"
        class="w-full"
      />
    </UFormField>

    <!-- Método de Pago -->
    <UFormField label="Método de Pago" name="metodoPago" required>
      <USelect
        v-model="state.metodoPago"
        :items="metodoPagoOptions"
        class="w-full"
      />
    </UFormField>

    <!-- Observaciones -->
    <UFormField label="Observaciones" name="observaciones">
      <UTextarea
        v-model="state.observaciones"
        placeholder="Notas adicionales sobre este servicio..."
        :rows="3"
        class="w-full"
      />
    </UFormField>

    <!-- Confirmado -->
    <UFormField name="confirmado">
      <UCheckbox
        v-model="state.confirmado"
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
