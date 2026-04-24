<script setup lang="ts">
import type { AdjustmentItem, DiscountType, TravelerAccountConfig, TravelerType } from '~/types/payment';
import type { QuotationPublicPrice } from '~/types/quotation';

const props = defineProps<{
  travelerId: string;
  travelId: string;
  travelBasePrice: number;
  preciosPublicos: QuotationPublicPrice[];
  config?: TravelerAccountConfig;
}>();

const emit = defineEmits<{
  submit: [config: TravelerAccountConfig];
  cancel: [];
}>();

const travelerType = ref<TravelerType>(props.config?.travelerType ?? 'adult');
const selectedPrecioPublicoId = ref<string | undefined>(
  props.config?.publicPriceId ?? undefined,
);

const discounts = ref<AdjustmentItem[]>(
  props.config?.discounts ? props.config.discounts.map(d => ({ ...d })) : [],
);
const surcharges = ref<AdjustmentItem[]>(
  props.config?.surcharges ? props.config.surcharges.map(s => ({ ...s })) : [],
);

const travelerTypeOptions = [
  { label: 'Adulto', value: 'adult' },
  { label: 'Niño', value: 'child' },
];

const precioPublicoOptions = computed(() =>
  props.preciosPublicos.map(p => ({
    label: `${p.priceType} — ${formatCurrency(p.pricePerPerson)}`,
    value: p.id,
  })),
);

const selectedPrecio = computed(() =>
  props.preciosPublicos.find(p => p.id === selectedPrecioPublicoId.value),
);

const ajusteTypeOptions = [
  { label: 'Monto fijo', value: 'fixed' },
  { label: 'Porcentaje (%)', value: 'percentage' },
];

const appliedPrice = computed(() => selectedPrecio.value?.pricePerPerson ?? 0);

const finalCost = computed(() => {
  const base = appliedPrice.value;
  const totalDiscount = discounts.value.reduce((sum, d) => {
    return sum + (d.type === 'percentage' ? base * d.amount / 100 : d.amount);
  }, 0);
  const totalSurcharge = surcharges.value.reduce((sum, s) => {
    return sum + (s.type === 'percentage' ? base * s.amount / 100 : s.amount);
  }, 0);
  return Math.max(0, base - totalDiscount + totalSurcharge);
});

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
}

function addDiscount() {
  discounts.value.push({ amount: 0, type: 'fixed' as DiscountType, description: '' });
}

function removeDiscount(index: number) {
  discounts.value.splice(index, 1);
}

function addSurcharge() {
  surcharges.value.push({ amount: 0, type: 'fixed' as DiscountType, description: '' });
}

function removeSurcharge(index: number) {
  surcharges.value.splice(index, 1);
}

function handleSubmit() {
  const config: TravelerAccountConfig = {
    travelId: props.travelId,
    travelerId: props.travelerId,
    travelerType: travelerType.value,
    publicPriceId: selectedPrecio.value?.id,
    publicPriceAmount: selectedPrecio.value?.pricePerPerson,
    discounts: discounts.value
      .filter(d => d.amount > 0)
      .map(d => ({ amount: d.amount, type: d.type, description: d.description || undefined })),
    surcharges: surcharges.value
      .filter(s => s.amount > 0)
      .map(s => ({ amount: s.amount, type: s.type, description: s.description || undefined })),
  };
  emit('submit', config);
}
</script>

<template>
  <div class="space-y-4">
    <div>
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Tipo de viajero
      </label>
      <div class="flex gap-4">
        <label
          v-for="opt in travelerTypeOptions"
          :key="opt.value"
          class="flex items-center gap-2 cursor-pointer"
        >
          <input
            v-model="travelerType"
            type="radio"
            :value="opt.value"
            class="accent-primary-500"
          >
          <span class="text-sm">{{ opt.label }}</span>
        </label>
      </div>
    </div>

    <div v-if="preciosPublicos.length === 0">
      <UAlert
        color="warning"
        title="No hay precios al público configurados en la cotización de este viaje."
      />
    </div>

    <div v-else>
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Precio al público
      </label>
      <USelect
        v-model="selectedPrecioPublicoId"
        :items="precioPublicoOptions"
        value-key="value"
        label-key="label"
        placeholder="Selecciona un precio..."
      />
    </div>

    <div class="p-3 bg-elevated rounded-lg text-sm">
      <div class="flex justify-between text-muted mb-1">
        <span>Precio aplicado:</span>
        <span>{{ formatCurrency(appliedPrice) }}</span>
      </div>
    </div>

    <div>
      <div class="flex items-center justify-between mb-1">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Descuentos <span class="text-gray-400">(opcional)</span>
        </label>
        <UButton
          size="xs"
          variant="ghost"
          icon="i-lucide-plus"
          @click="addDiscount"
        >
          Agregar
        </UButton>
      </div>
      <div
        v-for="(item, index) in discounts"
        :key="index"
        class="flex gap-2 mb-2"
      >
        <UInput
          v-model.number="item.amount"
          type="number"
          :min="0"
          step="0.01"
          placeholder="0"
          class="flex-1"
        />
        <USelect
          v-model="item.type"
          :items="ajusteTypeOptions"
          value-key="value"
          label-key="label"
          class="w-40"
        />
        <UInput
          v-model="item.description"
          placeholder="Motivo..."
          class="flex-1"
        />
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          @click="removeDiscount(index)"
        />
      </div>
    </div>

    <div>
      <div class="flex items-center justify-between mb-1">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Incrementos <span class="text-gray-400">(opcional)</span>
        </label>
        <UButton
          size="xs"
          variant="ghost"
          icon="i-lucide-plus"
          @click="addSurcharge"
        >
          Agregar
        </UButton>
      </div>
      <div
        v-for="(item, index) in surcharges"
        :key="index"
        class="flex gap-2 mb-2"
      >
        <UInput
          v-model.number="item.amount"
          type="number"
          :min="0"
          step="0.01"
          placeholder="0"
          class="flex-1"
        />
        <USelect
          v-model="item.type"
          :items="ajusteTypeOptions"
          value-key="value"
          label-key="label"
          class="w-40"
        />
        <UInput
          v-model="item.description"
          placeholder="Motivo..."
          class="flex-1"
        />
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          @click="removeSurcharge(index)"
        />
      </div>
    </div>

    <div class="p-3 bg-elevated rounded-lg text-sm border border-default">
      <div class="flex justify-between font-semibold">
        <span>Costo final:</span>
        <span class="text-primary">{{ formatCurrency(Math.max(0, finalCost)) }}</span>
      </div>
    </div>

    <div class="flex justify-end gap-2 pt-2">
      <UButton
        variant="ghost"
        color="neutral"
        @click="emit('cancel')"
      >
        Cancelar
      </UButton>
      <UButton @click="handleSubmit">
        Guardar configuración
      </UButton>
    </div>
  </div>
</template>
