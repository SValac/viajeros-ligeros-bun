<script setup lang="ts">
import type { PriceAdjustmentKind, PriceAdjustmentMode, ProviderPriceAdjustmentDraft } from '~/types/quotation';

import { calculateAdjustedUnitCost, getPriceAdjustmentError } from '~/composables/quotation/use-quotation-domain';
import { formatCurrency } from '~/utils/currency';
import { sanitizeText } from '~/utils/form-validation';

// Lista editable de ajustes de precio de un servicio por persona (Niño -10%, Adulto mayor
// -$50...). Solo cambian lo que se le paga al proveedor; el asiento usa el precio base.

type Props = {
  unitCost?: number;
};

const { unitCost = 0 } = defineProps<Props>();

const ajustes = defineModel<ProviderPriceAdjustmentDraft[]>({ required: true });

const kindOptions: { label: string; value: PriceAdjustmentKind }[] = [
  { label: 'Descuento', value: 'discount' },
  { label: 'Aumento', value: 'surcharge' },
];

const modeOptions: { label: string; value: PriceAdjustmentMode }[] = [
  { label: '%', value: 'percent' },
  { label: '$', value: 'amount' },
];

function update(index: number, patch: Partial<ProviderPriceAdjustmentDraft>) {
  ajustes.value = ajustes.value.map((a, i) => (i === index ? { ...a, ...patch } : a));
}

function add() {
  ajustes.value = [...ajustes.value, { label: '', kind: 'discount', mode: 'percent', value: 0 }];
}

function remove(index: number) {
  ajustes.value = ajustes.value.filter((_, i) => i !== index);
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between gap-2">
      <div>
        <p class="text-sm font-medium">
          Precios por tipo de persona
        </p>
        <p class="text-xs text-muted">
          Ej. "Niños" -10% o "Adulto mayor" -$50. En el viaje eliges cuál paga cada viajero.
        </p>
      </div>
      <UButton
        icon="i-lucide-plus"
        label="Agregar"
        size="sm"
        variant="outline"
        color="neutral"
        @click="add"
      />
    </div>

    <div
      v-for="(ajuste, index) in ajustes"
      :key="ajuste.id ?? `new-${index}`"
      class="rounded-md border border-default p-3 space-y-2"
    >
      <div class="grid gap-2 sm:grid-cols-[minmax(0,1fr)_8rem_4.5rem_7rem_auto] items-start">
        <UInput
          :model-value="ajuste.label"
          placeholder="Motivo (ej. Niños)"
          :maxlength="60"
          aria-label="Motivo"
          class="w-full"
          @update:model-value="v => update(index, { label: sanitizeText(String(v)) })"
        />
        <USelect
          :model-value="ajuste.kind"
          :items="kindOptions"
          aria-label="Tipo"
          class="w-full"
          @update:model-value="v => update(index, { kind: v as PriceAdjustmentKind })"
        />
        <USelect
          :model-value="ajuste.mode"
          :items="modeOptions"
          aria-label="En porcentaje o cantidad"
          class="w-full"
          @update:model-value="v => update(index, { mode: v as PriceAdjustmentMode })"
        />
        <UInput
          :model-value="ajuste.value || undefined"
          type="number"
          min="0"
          step="0.01"
          placeholder="0"
          aria-label="Valor"
          class="w-full"
          @update:model-value="v => update(index, { value: Number(v) || 0 })"
        />
        <UButton
          icon="i-lucide-trash-2"
          color="error"
          variant="ghost"
          :aria-label="`Quitar ${ajuste.label || 'ajuste'}`"
          @click="remove(index)"
        />
      </div>
      <p v-if="getPriceAdjustmentError(ajuste)" class="text-xs text-error">
        {{ getPriceAdjustmentError(ajuste) }}
      </p>
      <p v-else class="text-xs text-muted">
        Pagan {{ formatCurrency(calculateAdjustedUnitCost(unitCost, ajuste)) }} por persona en vez de {{ formatCurrency(unitCost) }}
      </p>
    </div>
  </div>
</template>
