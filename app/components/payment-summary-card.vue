<script setup lang="ts">
import type { TravelerPaymentSummary } from '~/types/payment';

defineProps<{
  summary: TravelerPaymentSummary;
  travelerName: string;
}>();

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
}

type BadgeColor = 'warning' | 'info' | 'success';

const statusConfig: Record<string, { color: BadgeColor; label: string }> = {
  pending: { color: 'warning', label: 'Pendiente' },
  partial: { color: 'info', label: 'Abono parcial' },
  paid: { color: 'success', label: 'Pagado' },
};
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div class="font-semibold">
          {{ travelerName }}
        </div>
        <UBadge
          :color="statusConfig[summary.status]?.color ?? 'neutral'"
          variant="subtle"
        >
          {{ statusConfig[summary.status]?.label ?? summary.status }}
        </UBadge>
      </div>
    </template>

    <div class="space-y-2 text-sm">
      <div class="flex justify-between text-muted">
        <span>Tipo de viajero</span>
        <span class="capitalize">{{ summary.travelerType === 'adult' ? 'Adulto' : 'Niño' }}</span>
      </div>

      <div class="flex justify-between text-muted">
        <span>Precio base</span>
        <span>{{ formatCurrency(summary.totalCost) }}</span>
      </div>

      <div v-if="summary.travelerType === 'child' || summary.appliedPrice !== summary.totalCost" class="flex justify-between text-muted">
        <span>Precio aplicado</span>
        <span>{{ formatCurrency(summary.appliedPrice) }}</span>
      </div>

      <div v-if="summary.discount > 0" class="flex justify-between text-success">
        <span>
          Descuento
          <span v-if="summary.discountType === 'percentage'" class="text-xs">({{ summary.discount }}%)</span>
        </span>
        <span>
          - {{ summary.discountType === 'percentage'
            ? formatCurrency(summary.appliedPrice * summary.discount / 100)
            : formatCurrency(summary.discount) }}
        </span>
      </div>

      <div class="flex justify-between font-medium border-t border-default pt-2">
        <span>Costo final</span>
        <span>{{ formatCurrency(summary.finalCost) }}</span>
      </div>

      <div class="flex justify-between text-muted">
        <span>Total abonado</span>
        <span class="text-success">{{ formatCurrency(summary.totalPaid) }}</span>
      </div>

      <div class="flex justify-between font-semibold" :class="summary.balance > 0 ? 'text-error' : 'text-success'">
        <span>Saldo pendiente</span>
        <span>{{ formatCurrency(summary.balance) }}</span>
      </div>
    </div>
  </UCard>
</template>
