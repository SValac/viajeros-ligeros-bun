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
    personCount: z.number({ message: 'Ingresa un número válido' })
      .int('Debe ser un número entero')
      .positive('Debe ser mayor a 0'),
  }),
]);

type FormState = {
  providerId?: string;
  serviceDescription: string;
  costType: ProviderCostType;
  totalCost?: number;
  unitCost?: number;
  personCount?: number;
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
  personCount: proveedorCotizacion?.personCount ?? undefined,
  paymentMethod: proveedorCotizacion?.paymentMethod ?? 'cash',
  splitType: proveedorCotizacion?.splitType ?? 'minimum',
  remarks: proveedorCotizacion?.remarks ?? '',
  confirmed: proveedorCotizacion?.confirmed ?? false,
});

// Proxies sanitizados: filtran caracteres inválidos mientras el usuario escribe
const serviceDescriptionInput = useSanitizedModel(() => state.serviceDescription ?? '', v => state.serviceDescription = v, sanitizeText);
const remarksInput = useSanitizedModel(() => state.remarks ?? '', v => state.remarks = v, sanitizeText);

// Personas por defecto: las mismas entre las que se reparte el costo ("Dividir entre").
const divisorPersonas = computed(() => cotizacionStore.getDivisorCosto(quotationId, state.splitType));

const personasHelp = computed(() => {
  const origen = state.splitType === 'total' ? 'Asientos vendibles' : 'Asientos mínimos objetivo';
  return `${origen}: ${divisorPersonas.value}`;
});

// Un número de personas distinto al divisor lo puso el usuario a mano y ya no se prellena.
const personCountTouched = shallowRef(
  proveedorCotizacion?.costType === 'per_person' && proveedorCotizacion.personCount !== divisorPersonas.value,
);

watch(
  [() => state.costType, divisorPersonas],
  ([costType, divisor]) => {
    if (costType === 'per_person' && !personCountTouched.value)
      state.personCount = divisor > 0 ? divisor : undefined;
  },
  { immediate: true },
);

const costoTotalCalculado = computed(() => {
  if (!isValidAmount(state.unitCost) || !isValidAmount(state.personCount))
    return null;
  return calculateProviderTotalCost(state.unitCost, state.personCount);
});

// Al pasar de "por persona" a "total" el total arranca con lo que ya se calculó.
watch(() => state.costType, (costType) => {
  if (costType === 'total' && costoTotalCalculado.value !== null)
    state.totalCost = costoTotalCalculado.value;
});

function isValidAmount(value: unknown): value is number {
  return typeof value === 'number' && value > 0;
}

function onSubmit() {
  const result = schema.safeParse(state);
  if (!result.success)
    return;

  const form = result.data;
  const cost: Pick<QuotationProviderFormData, 'costType' | 'totalCost' | 'unitCost' | 'personCount'> = form.costType === 'per_person'
    ? {
        costType: 'per_person',
        unitCost: form.unitCost,
        personCount: form.personCount,
        totalCost: calculateProviderTotalCost(form.unitCost, form.personCount),
      }
    : {
        costType: 'total',
        unitCost: undefined,
        personCount: undefined,
        totalCost: form.totalCost,
      };

  const data: QuotationProviderFormData = {
    providerId: form.providerId,
    serviceDescription: form.serviceDescription,
    paymentMethod: form.paymentMethod,
    splitType: form.splitType,
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
    <div v-else class="space-y-2">
      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField
          label="Costo por persona"
          name="unitCost"
          required
        >
          <MoneyInput v-model="state.unitCost" />
        </UFormField>

        <UFormField
          label="Número de personas"
          name="personCount"
          :help="personasHelp"
          required
        >
          <UInput
            v-model.number="state.personCount"
            type="number"
            min="1"
            step="1"
            placeholder="0"
            class="w-full"
            @update:model-value="personCountTouched = true"
          />
        </UFormField>
      </div>

      <p class="text-sm text-muted">
        Costo total:
        <span class="font-medium text-default">
          {{ costoTotalCalculado === null ? '—' : formatCurrency(costoTotalCalculado) }}
        </span>
        <span v-if="costoTotalCalculado !== null">
          ({{ formatCurrency(state.unitCost ?? 0) }} × {{ state.personCount }} personas)
        </span>
      </p>
    </div>

    <!-- Dividir entre -->
    <UFormField
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
