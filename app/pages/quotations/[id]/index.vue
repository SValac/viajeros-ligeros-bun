<script setup lang="ts">
import { useQuotationRoute } from '~/composables/quotation/use-quotation-route';

definePageMeta({
  name: 'quotation-detail',
});

const paymentStore = usePaymentStore();

const { travelId, quotation, readonly } = useQuotationRoute();

// Renderizada por app/pages/quotations/[id].vue solo cuando la cotización existe.
const cotizacion = computed(() => quotation.value!);
const acumuladoViajeros = computed(() =>
  paymentStore.getTravelCashSummary(travelId.value).totalCollected,
);
</script>

<template>
  <div class="space-y-6">
    <CotizacionResumenFinanciero
      :quotation-id="cotizacion.id"
      :acumulado-viajeros="acumuladoViajeros"
    />

    <!-- Parámetros editables (solo borrador) -->
    <QuotationParametersCard
      v-if="!readonly"
      :quotation="cotizacion"
    />
  </div>
</template>
