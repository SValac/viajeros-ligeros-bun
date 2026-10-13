<script setup lang="ts">
import { z } from 'zod';

import type { CostSplitType, ProviderCostType, QuotationExpense, QuotationExpenseFormData } from '~/types/quotation';

import { calculateProviderTotalCost } from '~/composables/quotation/use-quotation-domain';
import { useTravelCoordinatorCount } from '~/composables/travels/use-travel-coordinator-count';
import { formatCurrency } from '~/utils/currency';
import { sanitizeText, textSchema } from '~/utils/form-validation';

type Props = {
  quotationId: string;
  expense?: QuotationExpense | null;
};

const { quotationId, expense = null } = defineProps<Props>();

const emit = defineEmits<{
  submit: [data: QuotationExpenseFormData];
  cancel: [];
}>();

const quotationStore = useQuotationStore();
const travelId = computed(() => quotationStore.quotations.find(c => c.id === quotationId)?.travelId);
const coordinatorCount = useTravelCoordinatorCount(travelId);

// Usual suggestions; the ones the agency already used are added, and the user can type another.
const BASE_CATEGORIES = ['Publicidad', 'Viáticos', 'Comisiones', 'Box lunch', 'Otro'];

const costSchema = z.number({ message: 'Ingresa un costo válido' }).positive('El costo debe ser mayor a 0');

const baseSchema = z.object({
  category: textSchema({ min: 1, max: 40 }),
  description: textSchema({ max: 200 }).optional(),
  splitType: z.enum(['minimum', 'total']),
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
    personCount: z.number({ message: 'Ingresa el número de personas' }).int('Debe ser un número entero').positive('Debe ser mayor a 0'),
  }),
]);

type FormState = {
  category?: string;
  description: string;
  costType: ProviderCostType;
  totalCost?: number;
  unitCost?: number;
  personCount?: number;
  splitType: CostSplitType;
};

const costTypeOptions: { label: string; value: ProviderCostType }[] = [
  { label: 'Costo total', value: 'total' },
  { label: 'Costo por persona', value: 'per_person' },
];

const splitTypeOptions: { label: string; value: CostSplitType }[] = [
  { label: 'Asientos mínimos objetivo', value: 'minimum' },
  { label: 'Asientos vendibles', value: 'total' },
];

const state = reactive<FormState>({
  category: expense?.category,
  description: expense?.description ?? '',
  costType: expense?.costType ?? 'total',
  totalCost: expense?.totalCost,
  unitCost: expense?.unitCost,
  personCount: expense?.personCount,
  splitType: expense?.splitType ?? 'minimum',
});

onMounted(() => quotationStore.fetchExpenseCategories());

const categoryOptions = computed(() => {
  const extra = [...quotationStore.expenseCategories, state.category]
    .filter((c): c is string => !!c && !BASE_CATEGORIES.includes(c))
    .sort((a, b) => a.localeCompare(b, 'es'));
  return [...BASE_CATEGORIES, ...new Set(extra)];
});

function onCreateCategory(value: string) {
  const category = sanitizeText(value).trim();
  if (category)
    state.category = category;
}

const descriptionInput = useSanitizedModel(() => state.description ?? '', v => state.description = v, sanitizeText);

// How many people the expense is split among ("Dividir entre").
const personDivisor = computed(() => quotationStore.getCostDivisor(quotationId, state.splitType, coordinatorCount.value));

// People follow the divisor while the user doesn't change them by hand (in a new
// expense, or one saved with the divisor's people at the time).
const peopleEdited = shallowRef(expense?.personCount !== undefined && expense.personCount !== personDivisor.value);
watch(personDivisor, (divisor) => {
  if (!peopleEdited.value)
    state.personCount = divisor;
}, { immediate: true });

function onPersonCountInput(value: number | null | undefined) {
  state.personCount = value ?? undefined;
  peopleEdited.value = true;
}

function isValidAmount(value: unknown): value is number {
  return typeof value === 'number' && value > 0;
}

const totalPerPerson = computed(() =>
  isValidAmount(state.unitCost) && isValidAmount(state.personCount)
    ? calculateProviderTotalCost(state.unitCost, state.personCount)
    : 0,
);

// When switching from "per person" to "total", the total starts from the calculated one.
watch(() => state.costType, (costType) => {
  if (costType === 'total' && totalPerPerson.value > 0)
    state.totalCost = totalPerPerson.value;
});

const totalCost = computed(() => state.costType === 'per_person' ? totalPerPerson.value : (state.totalCost ?? 0));
const costPerSeat = computed(() => personDivisor.value > 0 ? totalCost.value / personDivisor.value : 0);

function onSubmit() {
  const result = schema.safeParse(state);
  if (!result.success)
    return;

  const form = result.data;
  const cost: Pick<QuotationExpenseFormData, 'costType' | 'totalCost' | 'unitCost' | 'personCount'> = form.costType === 'per_person'
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

  emit('submit', {
    quotationId,
    category: form.category,
    description: form.description || undefined,
    splitType: form.splitType,
    ...cost,
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
    <!-- Category -->
    <UFormField
      label="Categoría"
      name="category"
      help="Elige una o escribe una nueva"
      required
    >
      <USelectMenu
        v-model="state.category"
        :items="categoryOptions"
        create-item
        placeholder="Selecciona o escribe una categoría"
        class="w-full"
        @create="onCreateCategory"
      />
    </UFormField>

    <!-- Description -->
    <UFormField label="Descripción" name="description">
      <UInput
        v-model="descriptionInput"
        placeholder="Ej. Anuncios en Facebook, comisión de la vendedora"
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
        :items="costTypeOptions"
        orientation="horizontal"
        class="py-1.5"
      />
    </UFormField>

    <!-- Total cost -->
    <UFormField
      v-if="state.costType === 'total'"
      label="Costo total"
      name="totalCost"
      required
    >
      <MoneyInput v-model="state.totalCost" />
    </UFormField>

    <!-- Cost per person × people -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        help="Incluye a quien también lo recibe sin pagar asiento (coordinadores, choferes)"
        required
      >
        <UInputNumber
          :model-value="state.personCount"
          :min="1"
          class="w-full"
          @update:model-value="onPersonCountInput"
        />
      </UFormField>
    </div>

    <!-- Split among -->
    <UFormField
      label="Dividir entre"
      name="splitType"
      :help="`Entre ${personDivisor} personas`"
      required
    >
      <USelect
        v-model="state.splitType"
        :items="splitTypeOptions"
        class="w-full"
      />
    </UFormField>

    <UAlert
      v-if="totalCost > 0"
      icon="i-lucide-calculator"
      color="info"
      variant="subtle"
      :description="`Total ${formatCurrency(totalCost)}: suma ${formatCurrency(costPerSeat)} al precio de cada asiento.`"
    />

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
        :label="expense ? 'Actualizar' : 'Agregar gasto'"
      />
    </div>
  </UForm>
</template>
