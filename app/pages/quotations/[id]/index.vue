<script setup lang="ts">
import { useQuotationRoute } from '~/composables/quotation/use-quotation-route';

definePageMeta({
  name: 'quotation-detail',
});

const paymentStore = usePaymentStore();

const { travelId, quotation } = useQuotationRoute();

// Renderizada por app/pages/quotations/[id].vue solo cuando la cotización existe.
const cotizacion = computed(() => quotation.value!);
const acumuladoViajeros = computed(() =>
  paymentStore.getTravelCashSummary(travelId.value).totalCollected,
);

onMounted(async () => {
  await paymentStore.fetchByTravel(travelId.value);
});
</script>

<template>
  <!-- Los parámetros tienen su propia pestaña (parameters.vue) -->
  <CotizacionResumenFinanciero
    :quotation-id="cotizacion.id"
    :acumulado-viajeros="acumuladoViajeros"
  />
</template>
