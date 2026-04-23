<script setup lang="ts">
import type { TravelerPaymentSummary } from '~/types/payment';

defineProps<{
  summary: TravelerPaymentSummary;
  travelerName: string;
}>();

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
}

function formatAjusteAmount(item: { amount: number; type: 'fixed' | 'percentage' }, appliedPrice: number) {
  return item.type === 'percentage'
    ? formatCurrency(appliedPrice * item.amount / 100)
    : formatCurrency(item.amount);
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

      <div
        v-for="(item, index) in summary.discounts"
        :key="`discount-${index}`"
        class="flex justify-between text-success"
      >
        <span>
          Descuento
          <span v-if="item.type === 'percentage'" class="text-xs">({{ item.amount }}%)</span>
          <span v-if="item.description" class="block text-xs text-muted font-normal">{{ item.description }}</span>
        </span>
        <span>- {{ formatAjusteAmount(item, summary.appliedPrice) }}</span>
      </div>

      <div
        v-for="(item, index) in summary.surcharges"
        :key="`surcharge-${index}`"
        class="flex justify-between text-warning"
      >
        <span>
          Incremento
          <span v-if="item.type === 'percentage'" class="text-xs">({{ item.amount }}%)</span>
          <span v-if="item.description" class="block text-xs text-muted font-normal">{{ item.description }}</span>
        </span>
        <span>+ {{ formatAjusteAmount(item, summary.appliedPrice) }}</span>
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
