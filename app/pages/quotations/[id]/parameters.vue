<script setup lang="ts">
import { useQuotationRoute } from '~/composables/quotation/use-quotation-route';

definePageMeta({
  name: 'quotation-parameters',
});

const { quotation, readonly } = useQuotationRoute();

// Rendered by app/pages/quotations/[id].vue only when the quotation exists.
const loadedQuotation = computed(() => quotation.value!);
</script>

<template>
  <!-- Editable only in draft; once confirmed they're shown read-only -->
  <QuotationParametersCard
    :quotation="loadedQuotation"
    :readonly="readonly"
  />
</template>
