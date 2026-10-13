<script setup lang="ts">
import { useQuotationRoute } from '~/composables/quotation/use-quotation-route';

definePageMeta({
  name: 'quotation-detail',
});

const paymentStore = usePaymentStore();

const { travelId, quotation } = useQuotationRoute();

// Renderizada por app/pages/quotations/[id].vue solo cuando la cotización existe.
const loadedQuotation = computed(() => quotation.value!);
const travelersCollected = computed(() =>
  paymentStore.getTravelCashSummary(travelId.value).totalCollected,
);

onMounted(async () => {
  await paymentStore.fetchByTravel(travelId.value);
});
</script>

<template>
  <!-- Los parámetros tienen su propia pestaña (parameters.vue) -->
  <QuotationFinancialSummary
    :quotation-id="loadedQuotation.id"
    :travelers-collected="travelersCollected"
  />
</template>
