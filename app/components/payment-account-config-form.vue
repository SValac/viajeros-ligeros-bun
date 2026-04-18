<script setup lang="ts">
import type { CotizacionPrecioPublico } from '~/types/cotizacion';
import type { DiscountType, TravelerAccountConfig, TravelerType } from '~/types/payment';

const props = defineProps<{
  travelerId: string;
  travelId: string;
  travelBasePrice: number;
  preciosPublicos: CotizacionPrecioPublico[];
  config?: TravelerAccountConfig;
}>();

const emit = defineEmits<{
  submit: [config: TravelerAccountConfig];
  cancel: [];
}>();

const travelerType = ref<TravelerType>(props.config?.travelerType ?? 'adult');
const selectedPrecioPublicoId = ref<string | undefined>(
  props.config?.precioPublicoId ?? undefined,
);
const discount = ref<number>(props.config?.discount ?? 0);
const discountType = ref<DiscountType>(props.config?.discountType ?? 'fixed');

const travelerTypeOptions = [
  { label: 'Adulto', value: 'adult' },
  { label: 'Niño', value: 'child' },
];

const precioPublicoOptions = computed(() =>
  props.preciosPublicos.map(p => ({
    label: `${p.tipo} — ${formatCurrency(p.precioPorPersona)}`,
    value: p.id,
  })),
);

const selectedPrecio = computed(() =>
  props.preciosPublicos.find(p => p.id === selectedPrecioPublicoId.value),
);

const discountTypeOptions = [
  { label: 'Monto fijo', value: 'fixed' },
  { label: 'Porcentaje (%)', value: 'percentage' },
];

const appliedPrice = computed(() => selectedPrecio.value?.precioPorPersona ?? 0);

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
    precioPublicoId: selectedPrecio.value?.id,
    precioPublicoMonto: selectedPrecio.value?.precioPorPersona,
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
