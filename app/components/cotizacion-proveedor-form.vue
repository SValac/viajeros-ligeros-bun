<script setup lang="ts">
import { z } from 'zod';

import type { PaymentType } from '~/types/payment';
import type { CostSplitType, ProviderCostType, QuotationProvider, QuotationProviderFormData } from '~/types/quotation';

import { calculateProviderTotalCost } from '~/composables/quotation/use-quotation-domain';
import { formatCurrency } from '~/utils/currency';
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

const cotizacionStore = useCotizacionStore();

const costSchema = z.number({ message: 'Ingresa un costo válido' }).positive('El costo debe ser mayor a 0');

const baseSchema = z.object({
  providerId: z.string({ message: 'Selecciona un proveedor' }).min(1, 'Selecciona un proveedor'),
  serviceDescription: textSchema({ min: 3, max: 200 }),
  paymentMethod: z.enum(['cash', 'transfer']),
  splitType: z.enum(['minimum', 'total']),
  remarks: textSchema({ max: 500 }).optional(),
  confirmed: z.boolean(),
});

// Cada tipo de costo valida solo sus campos; los del otro tipo se descartan.
const schema = z.discriminatedUnion('costType', [
  baseSchema.extend({
    costType: z.literal('total'),
    totalCost: costSchema,
  }),
  baseSchema.extend({
    costType: z.literal('per_person'),
    unitCost: costSchema,
    coordinatorsCourtesy: z.boolean(),
  }),
]);

type FormState = {
  providerId?: string;
  serviceDescription: string;
  costType: ProviderCostType;
  totalCost?: number;
  unitCost?: number;
  coordinatorsCourtesy: boolean;
  paymentMethod: PaymentType;
  splitType: CostSplitType;
  remarks: string;
  confirmed: boolean;
};

const metodoPagoOptions = [
  { label: 'Efectivo', value: 'cash' },
  { label: 'Transferencia', value: 'transfer' },
];

const tipoDivisionOptions: { label: string; value: CostSplitType }[] = [
  { label: 'Asientos mínimos objetivo', value: 'minimum' },
  { label: 'Asientos vendibles', value: 'total' },
];

const tipoCostoOptions: { label: string; value: ProviderCostType }[] = [
  { label: 'Costo total', value: 'total' },
  { label: 'Costo por persona', value: 'per_person' },
];

const state = reactive<FormState>({
  providerId: proveedorCotizacion?.providerId ?? undefined,
  serviceDescription: proveedorCotizacion?.serviceDescription ?? '',
  costType: proveedorCotizacion?.costType ?? 'total',
  totalCost: proveedorCotizacion?.totalCost ?? undefined,
  unitCost: proveedorCotizacion?.unitCost ?? undefined,
  coordinatorsCourtesy: proveedorCotizacion?.coordinatorsCourtesy ?? false,
  paymentMethod: proveedorCotizacion?.paymentMethod ?? 'cash',
  splitType: proveedorCotizacion?.splitType ?? 'minimum',
  remarks: proveedorCotizacion?.remarks ?? '',
  confirmed: proveedorCotizacion?.confirmed ?? false,
});

// Proxies sanitizados: filtran caracteres inválidos mientras el usuario escribe
const serviceDescriptionInput = useSanitizedModel(() => state.serviceDescription ?? '', v => state.serviceDescription = v, sanitizeText);
const remarksInput = useSanitizedModel(() => state.remarks ?? '', v => state.remarks = v, sanitizeText);

// Entre cuántas personas se reparte un costo total ("Dividir entre").
const divisorPersonas = computed(() => cotizacionStore.getDivisorCosto(quotationId, state.splitType));

// Un servicio por persona suma su costo directo al asiento; su total de referencia es el
// costo × asientos vendibles (lo que costaría con el autobús lleno).
const asientosVendibles = computed(() => cotizacionStore.getAsientosVendibles(quotationId));

// Al pasar de "por persona" a "total" el total arranca con el de referencia.
watch(() => state.costType, (costType) => {
  if (costType === 'total' && isValidAmount(state.unitCost))
    state.totalCost = calculateProviderTotalCost(state.unitCost, asientosVendibles.value);
});

function isValidAmount(value: unknown): value is number {
  return typeof value === 'number' && value > 0;
}

function onSubmit() {
  const result = schema.safeParse(state);
  if (!result.success)
    return;

  const form = result.data;
  // Por persona no se reparte: splitType queda en 'total' solo porque la columna lo exige.
  const cost: Pick<QuotationProviderFormData, 'costType' | 'totalCost' | 'unitCost' | 'coordinatorsCourtesy' | 'splitType'> = form.costType === 'per_person'
    ? {
        costType: 'per_person',
        unitCost: form.unitCost,
        totalCost: calculateProviderTotalCost(form.unitCost, asientosVendibles.value),
        coordinatorsCourtesy: form.coordinatorsCourtesy,
        splitType: 'total',
      }
    : {
        costType: 'total',
        unitCost: undefined,
        totalCost: form.totalCost,
        coordinatorsCourtesy: false,
        splitType: form.splitType,
      };

  const data: QuotationProviderFormData = {
    providerId: form.providerId,
    serviceDescription: form.serviceDescription,
    paymentMethod: form.paymentMethod,
    remarks: form.remarks,
    confirmed: form.confirmed,
    ...cost,
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
      name="serviceDescription"
      required
    >
      <UInput
        v-model="serviceDescriptionInput"
        placeholder="Ej. Servicio de transporte Ciudad de México - Puebla"
        class="w-full"
      />
    </UFormField>

    <!-- Tipo de costo -->
    <UFormField
      label="Tipo de costo"
      name="costType"
      required
    >
      <URadioGroup
        v-model="state.costType"
        :items="tipoCostoOptions"
        orientation="horizontal"
        class="py-1.5"
      />
    </UFormField>

    <!-- Costo Total -->
    <UFormField
      v-if="state.costType === 'total'"
      label="Costo Total"
      name="totalCost"
      required
    >
      <MoneyInput v-model="state.totalCost" />
    </UFormField>

    <!-- Costo por persona -->
    <div v-else class="space-y-3">
      <UFormField
        label="Costo por persona"
        name="unitCost"
        required
      >
        <MoneyInput v-model="state.unitCost" />
      </UFormField>

      <UAlert
        icon="i-lucide-info"
        color="info"
        variant="subtle"
        :description="`Se suma ${formatCurrency(state.unitCost ?? 0)} al precio de cada asiento. Al proveedor se le paga por cada viajero que toma el servicio; todos lo toman salvo los que desmarques en la pestaña Servicios por persona del viaje.`"
      />

      <UFormField name="coordinatorsCourtesy">
        <USwitch
          v-model="state.coordinatorsCourtesy"
          label="Cortesía para coordinadores"
          description="El proveedor no cobra a los coordinadores, así que no cuentan para el pago."
        />
      </UFormField>
    </div>

    <!-- Dividir entre: solo un costo total se reparte -->
    <UFormField
      v-if="state.costType === 'total'"
      label="Dividir entre"
      name="splitType"
      :help="`Entre ${divisorPersonas} personas`"
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
      name="paymentMethod"
      required
    >
      <USelect
        v-model="state.paymentMethod"
        :items="metodoPagoOptions"
        class="w-full"
      />
    </UFormField>

    <!-- Observaciones -->
    <UFormField label="Observaciones" name="remarks">
      <UTextarea
        v-model="remarksInput"
        placeholder="Notas adicionales sobre este servicio..."
        :rows="3"
        class="w-full"
      />
    </UFormField>

    <!-- Confirmado -->
    <UFormField name="confirmed">
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
