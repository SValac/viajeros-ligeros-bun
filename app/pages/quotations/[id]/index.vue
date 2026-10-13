<script setup lang="ts">
import { useQuotationRoute } from '~/composables/quotation/use-quotation-route';

definePageMeta({
  name: 'quotation-detail',
});

const paymentStore = usePaymentStore();

const { travelId, quotation } = useQuotationRoute();

// Rendered by app/pages/quotations/[id].vue only when the quotation exists.
const loadedQuotation = computed(() => quotation.value!);
const travelersCollected = computed(() =>
  paymentStore.getTravelCashSummary(travelId.value).totalCollected,
);

onMounted(async () => {
  await paymentStore.fetchByTravel(travelId.value);
});
</script>

<template>
  <!-- Parameters have their own tab (parameters.vue) -->
  <QuotationFinancialSummary
    :quotation-id="loadedQuotation.id"
    :travelers-collected="travelersCollected"
  />
</template>
