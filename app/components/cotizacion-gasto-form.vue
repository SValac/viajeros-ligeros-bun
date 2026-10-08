<script setup lang="ts">
import { z } from 'zod';

import type { CostSplitType, ProviderCostType, QuotationExpense, QuotationExpenseFormData } from '~/types/quotation';

import { calculateProviderTotalCost } from '~/composables/quotation/use-quotation-domain';
import { formatCurrency } from '~/utils/currency';
import { sanitizeText, textSchema } from '~/utils/form-validation';

type Props = {
  quotationId: string;
  gasto?: QuotationExpense | null;
};

const { quotationId, gasto = null } = defineProps<Props>();

const emit = defineEmits<{
  submit: [data: QuotationExpenseFormData];
  cancel: [];
}>();

const cotizacionStore = useCotizacionStore();

// Sugerencias de siempre; se suman las que la agencia ya usó y el usuario puede escribir otra.
const CATEGORIAS_BASE = ['Publicidad', 'Viáticos', 'Comisiones', 'Box lunch', 'Otro'];

const costSchema = z.number({ message: 'Ingresa un costo válido' }).positive('El costo debe ser mayor a 0');

const baseSchema = z.object({
  category: textSchema({ min: 1, max: 40 }),
  description: textSchema({ max: 200 }).optional(),
  splitType: z.enum(['minimum', 'total']),
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

const tipoCostoOptions: { label: string; value: ProviderCostType }[] = [
  { label: 'Costo total', value: 'total' },
  { label: 'Costo por persona', value: 'per_person' },
];

const tipoDivisionOptions: { label: string; value: CostSplitType }[] = [
  { label: 'Asientos mínimos objetivo', value: 'minimum' },
  { label: 'Asientos vendibles', value: 'total' },
];

const state = reactive<FormState>({
  category: gasto?.category,
  description: gasto?.description ?? '',
  costType: gasto?.costType ?? 'total',
  totalCost: gasto?.totalCost,
  unitCost: gasto?.unitCost,
  personCount: gasto?.personCount,
  splitType: gasto?.splitType ?? 'minimum',
});

onMounted(() => cotizacionStore.fetchCategoriasGasto());

const categoriaOptions = computed(() => {
  const extra = [...cotizacionStore.categoriasGasto, state.category]
    .filter((c): c is string => !!c && !CATEGORIAS_BASE.includes(c))
    .sort((a, b) => a.localeCompare(b, 'es'));
  return [...CATEGORIAS_BASE, ...new Set(extra)];
});

function onCreateCategoria(value: string) {
  const category = sanitizeText(value).trim();
  if (category)
    state.category = category;
}

const descriptionInput = useSanitizedModel(() => state.description ?? '', v => state.description = v, sanitizeText);

// Entre cuántas personas se reparte el gasto ("Dividir entre").
const divisorPersonas = computed(() => cotizacionStore.getDivisorCosto(quotationId, state.splitType));

// Las personas siguen al divisor mientras el usuario no las cambie a mano (en un gasto
// nuevo, o uno guardado con las personas del divisor de entonces).
const personasTocadas = shallowRef(gasto?.personCount !== undefined && gasto.personCount !== divisorPersonas.value);
watch(divisorPersonas, (divisor) => {
  if (!personasTocadas.value)
    state.personCount = divisor;
}, { immediate: true });

function onPersonCountInput(value: number | null | undefined) {
  state.personCount = value ?? undefined;
  personasTocadas.value = true;
}

function isValidAmount(value: unknown): value is number {
  return typeof value === 'number' && value > 0;
}

const totalPorPersona = computed(() =>
  isValidAmount(state.unitCost) && isValidAmount(state.personCount)
    ? calculateProviderTotalCost(state.unitCost, state.personCount)
    : 0,
);

// Al pasar de "por persona" a "total" el total arranca con el calculado.
watch(() => state.costType, (costType) => {
  if (costType === 'total' && totalPorPersona.value > 0)
    state.totalCost = totalPorPersona.value;
});

const costoTotal = computed(() => state.costType === 'per_person' ? totalPorPersona.value : (state.totalCost ?? 0));
const costoPorAsiento = computed(() => divisorPersonas.value > 0 ? costoTotal.value / divisorPersonas.value : 0);

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
    <!-- Categoría -->
    <UFormField
      label="Categoría"
      name="category"
      help="Elige una o escribe una nueva"
      required
    >
      <USelectMenu
        v-model="state.category"
        :items="categoriaOptions"
        create-item
        placeholder="Selecciona o escribe una categoría"
        class="w-full"
        @create="onCreateCategoria"
      />
    </UFormField>

    <!-- Descripción -->
    <UFormField label="Descripción" name="description">
      <UInput
        v-model="descriptionInput"
        placeholder="Ej. Anuncios en Facebook, comisión de la vendedora"
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

    <!-- Costo total -->
    <UFormField
      v-if="state.costType === 'total'"
      label="Costo total"
      name="totalCost"
      required
    >
      <MoneyInput v-model="state.totalCost" />
    </UFormField>

    <!-- Costo por persona × personas -->
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

    <UAlert
      v-if="costoTotal > 0"
      icon="i-lucide-calculator"
      color="info"
      variant="subtle"
      :description="`Total ${formatCurrency(costoTotal)}: suma ${formatCurrency(costoPorAsiento)} al precio de cada asiento.`"
    />

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
        :label="gasto ? 'Actualizar' : 'Agregar gasto'"
      />
    </div>
  </UForm>
</template>
