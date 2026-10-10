<script setup lang="ts">
import { useQuotationRoute } from '~/composables/quotation/use-quotation-route';

definePageMeta({
  name: 'quotation-parameters',
});

const { quotation, readonly } = useQuotationRoute();

// Renderizada por app/pages/quotations/[id].vue solo cuando la cotización existe.
const cotizacion = computed(() => quotation.value!);
</script>

<template>
  <!-- Editables solo en borrador; confirmada se ven de solo lectura -->
  <QuotationParametersCard
    :quotation="cotizacion"
    :readonly="readonly"
  />
</template>
