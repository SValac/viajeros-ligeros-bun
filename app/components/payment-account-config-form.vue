<script setup lang="ts">
import type { DiscountType, TravelerAccountConfig, TravelerType } from '~/types/payment';

const props = defineProps<{
  travelerId: string;
  travelId: string;
  travelBasePrice: number;
  config?: TravelerAccountConfig;
}>();

const emit = defineEmits<{
  submit: [config: TravelerAccountConfig];
  cancel: [];
}>();

const travelerType = ref<TravelerType>(props.config?.travelerType ?? 'adult');
const childPrice = ref<number | null>(props.config?.childPrice ?? null);
const discount = ref<number>(props.config?.discount ?? 0);
const discountType = ref<DiscountType>(props.config?.discountType ?? 'fixed');

const travelerTypeOptions = [
  { label: 'Adulto', value: 'adult' },
  { label: 'Niño', value: 'child' },
];

const discountTypeOptions = [
  { label: 'Monto fijo', value: 'fixed' },
  { label: 'Porcentaje (%)', value: 'percentage' },
];

const appliedPrice = computed(() => {
  if (travelerType.value === 'child' && childPrice.value != null) {
    return childPrice.value;
  }
  return props.travelBasePrice;
});

const finalCost = computed(() => {
  const base = appliedPrice.value;
  if (discount.value > 0) {
    return discountType.value === 'percentage'
      ? base * (1 - discount.value / 100)
      : base - discount.value;
  }
  return base;
});

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
}

function handleSubmit() {
  const config: TravelerAccountConfig = {
    travelId: props.travelId,
    travelerId: props.travelerId,
    travelerType: travelerType.value,
    childPrice: travelerType.value === 'child' && childPrice.value != null ? childPrice.value : undefined,
    discount: discount.value || 0,
    discountType: discount.value > 0 ? discountType.value : 'fixed',
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

    <div v-if="travelerType === 'child'">
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Precio para niño
        <span class="text-xs text-gray-400 ml-1">(base: {{ formatCurrency(travelBasePrice) }})</span>
      </label>
      <UInput
        v-model.number="childPrice"
        type="number"
        :min="0"
        step="0.01"
        placeholder="0.00"
      />
    </div>

    <div class="p-3 bg-elevated rounded-lg text-sm">
      <div class="flex justify-between text-muted mb-1">
        <span>Precio aplicado:</span>
        <span>{{ formatCurrency(appliedPrice) }}</span>
      </div>
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Descuento <span class="text-gray-400">(opcional)</span>
      </label>
      <div class="flex gap-2">
        <UInput
          v-model.number="discount"
          type="number"
          :min="0"
          step="0.01"
          placeholder="0"
          class="flex-1"
        />
        <USelect
          v-model="discountType"
          :items="discountTypeOptions"
          value-key="value"
          label-key="label"
          :disabled="discount <= 0"
          class="w-40"
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
