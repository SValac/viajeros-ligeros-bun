<script setup lang="ts">
import { useTravelPayments } from '~/composables/payments/use-travel-payments';
import { useQuotationRoute } from '~/composables/quotation/use-quotation-route';

definePageMeta({
  name: 'quotation-detail',
});

const paymentStore = usePaymentStore();

const { travelId, quotation } = useQuotationRoute();

// Rendered by app/pages/quotations/[id].vue only when the quotation exists.
const loadedQuotation = computed(() => quotation.value!);
const { loadState: paymentsLoad } = useTravelPayments(travelId);
// `undefined` (a skeleton) until the payments arrive; if they fail, the $0 stays with its toast
const travelersCollected = computed(() => (paymentsLoad.isLoaded || paymentsLoad.loadError
  ? paymentStore.getTravelCashSummary(travelId.value).totalCollected
  : undefined));
</script>

<template>
  <!-- Parameters have their own tab (parameters.vue) -->
  <QuotationFinancialSummary
    :quotation-id="loadedQuotation.id"
    :travelers-collected="travelersCollected"
  />
</template>
