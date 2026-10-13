<script setup lang="ts">
import { useQuotationRoute } from '~/composables/quotation/use-quotation-route';

definePageMeta({
  name: 'quotation-prices',
});

const { quotation, readonly } = useQuotationRoute();

// Rendered by app/pages/quotations/[id].vue only when the quotation exists.
const quotationId = computed(() => quotation.value!.id);
</script>

<template>
  <QuotationPublicPriceSection
    :quotation-id="quotationId"
    :readonly="readonly"
  />
</template>
