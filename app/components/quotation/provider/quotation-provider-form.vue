<script setup lang="ts">
import { z } from 'zod';

import type { PaymentType } from '~/types/payment';
import type { CostSplitType, ProviderCostType, ProviderPriceAdjustmentDraft, QuotationProvider, QuotationProviderFormData } from '~/types/quotation';

import { calculateProviderTotalCost, getPriceAdjustmentError } from '~/composables/quotation/use-quotation-domain';
import { useTravelCoordinatorCount } from '~/composables/travels/use-travel-coordinator-count';
import { formatCurrency } from '~/utils/currency';
import { sanitizeText, textSchema } from '~/utils/form-validation';
import { PAYMENT_TYPE_OPTIONS } from '~/utils/payment-type';
import { COST_SPLIT_OPTIONS, COST_TYPE_OPTIONS } from '~/utils/quotation-labels';

type Props = {
  quotationId: string;
  quotationProvider?: QuotationProvider | null;
};

const { quotationId, quotationProvider = null } = defineProps<Props>();

const emit = defineEmits<{
  /** `adjustments` only applies to a per-person service; for a total cost it's empty. */
  submit: [data: QuotationProviderFormData, adjustments: ProviderPriceAdjustmentDraft[]];
  cancel: [];
}>();

const quotationStore = useQuotationStore();
const travelId = computed(() => quotationStore.quotations.find(c => c.id === quotationId)?.travelId);
const coordinatorCount = useTravelCoordinatorCount(travelId);

const costSchema = z.number({ message: 'Ingresa un costo válido' }).positive('El costo debe ser mayor a 0');

const baseSchema = z.object({
  providerId: z.string({ message: 'Selecciona un proveedor' }).min(1, 'Selecciona un proveedor'),
  serviceDescription: textSchema({ min: 3, max: 200 }),
  paymentMethod: z.enum(['cash', 'transfer']),
  splitType: z.enum(['minimum', 'total']),
  remarks: textSchema({ max: 500 }).optional(),
  confirmed: z.boolean(),
});

// Each cost type validates only its own fields; the other type's are discarded.
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

const state = reactive<FormState>({
  providerId: quotationProvider?.providerId ?? undefined,
  serviceDescription: quotationProvider?.serviceDescription ?? '',
  costType: quotationProvider?.costType ?? 'total',
  totalCost: quotationProvider?.totalCost ?? undefined,
  unitCost: quotationProvider?.unitCost ?? undefined,
  coordinatorsCourtesy: quotationProvider?.coordinatorsCourtesy ?? false,
  paymentMethod: quotationProvider?.paymentMethod ?? 'cash',
  splitType: quotationProvider?.splitType ?? 'minimum',
  remarks: quotationProvider?.remarks ?? '',
  confirmed: quotationProvider?.confirmed ?? false,
});

// Price adjustments by type of person (editable copy; saved on submit).
const adjustments = ref<ProviderPriceAdjustmentDraft[]>(
  quotationProvider
    ? quotationStore.getAdjustmentsByProvider(quotationProvider.id).map(({ id, label, kind, mode, value }) => ({ id, label, kind, mode, value }))
    : [],
);
const invalidAdjustments = computed(() => adjustments.value.some(a => getPriceAdjustmentError(a) !== null));

// Sanitized proxies: filter out invalid characters while the user types
const serviceDescriptionInput = useSanitizedModel(() => state.serviceDescription ?? '', v => state.serviceDescription = v, sanitizeText);
const remarksInput = useSanitizedModel(() => state.remarks ?? '', v => state.remarks = v, sanitizeText);

// How many people a total cost is split among ("Dividir entre").
const personDivisor = computed(() => quotationStore.getCostDivisor(quotationId, state.splitType, coordinatorCount.value));

// A per-person service adds its cost straight to the seat; its reference total is
// cost × sellable seats (what it would cost with a full bus).
const sellableSeats = computed(() => quotationStore.getSellableSeats(quotationId, coordinatorCount.value));

// When switching from "per person" to "total", the total starts from the reference one.
watch(() => state.costType, (costType) => {
  if (costType === 'total' && isValidAmount(state.unitCost))
    state.totalCost = calculateProviderTotalCost(state.unitCost, sellableSeats.value);
});

function isValidAmount(value: unknown): value is number {
  return typeof value === 'number' && value > 0;
}

function onSubmit() {
  const result = schema.safeParse(state);
  if (!result.success)
    return;
  if (state.costType === 'per_person' && invalidAdjustments.value)
    return;

  const form = result.data;
  // Per person isn't split: splitType stays 'total' only because the column requires it.
  const cost: Pick<QuotationProviderFormData, 'costType' | 'totalCost' | 'unitCost' | 'coordinatorsCourtesy' | 'splitType'> = form.costType === 'per_person'
    ? {
        costType: 'per_person',
        unitCost: form.unitCost,
        totalCost: calculateProviderTotalCost(form.unitCost, sellableSeats.value),
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
    ...(quotationProvider?.id ? { id: quotationProvider.id } : {}),
  };

  emit('submit', data, form.costType === 'per_person' ? adjustments.value : []);
}
</script>

<template>
  <UForm
    :schema="schema"
    :state="state"
    class="space-y-4"
    @submit="onSubmit"
  >
    <!-- Provider -->
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

    <!-- Service Description -->
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

    <!-- Cost type -->
    <UFormField
      label="Tipo de costo"
      name="costType"
      required
    >
      <URadioGroup
        v-model="state.costType"
        :items="COST_TYPE_OPTIONS"
        orientation="horizontal"
        class="py-1.5"
      />
    </UFormField>

    <!-- Total Cost -->
    <UFormField
      v-if="state.costType === 'total'"
      label="Costo Total"
      name="totalCost"
      required
    >
      <MoneyInput v-model="state.totalCost" />
    </UFormField>

    <!-- Cost per person -->
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

      <QuotationProviderAdjustmentsEditor v-model="adjustments" :unit-cost="state.unitCost" />
    </div>

    <!-- Split among: only a total cost is split -->
    <UFormField
      v-if="state.costType === 'total'"
      label="Dividir entre"
      name="splitType"
      :help="`Entre ${personDivisor} personas`"
      required
    >
      <USelect
        v-model="state.splitType"
        :items="COST_SPLIT_OPTIONS"
        class="w-full"
      />
    </UFormField>

    <!-- Payment Method -->
    <UFormField
      label="Método de Pago"
      name="paymentMethod"
      required
    >
      <USelect
        v-model="state.paymentMethod"
        :items="PAYMENT_TYPE_OPTIONS"
        class="w-full"
      />
    </UFormField>

    <!-- Remarks -->
    <UFormField label="Observaciones" name="remarks">
      <UTextarea
        v-model="remarksInput"
        placeholder="Notas adicionales sobre este servicio..."
        :rows="3"
        class="w-full"
      />
    </UFormField>

    <!-- Confirmed -->
    <UFormField name="confirmed">
      <UCheckbox
        v-model="state.confirmed"
        label="Servicio confirmado por el proveedor"
      />
    </UFormField>

    <!-- Actions -->
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
        :disabled="state.costType === 'per_person' && invalidAdjustments"
        :label="quotationProvider ? 'Actualizar' : 'Agregar Proveedor'"
      />
    </div>
  </UForm>
</template>
