<script setup lang="ts">
import { useQuotationRoute } from '~/composables/quotation/use-quotation-route';

definePageMeta({
  name: 'quotation-services',
});

const { quotation, readonly } = useQuotationRoute();

// Renderizada por app/pages/quotations/[id].vue solo cuando la cotización existe.
const quotationId = computed(() => quotation.value!.id);
</script>

<template>
  <CotizacionProveedoresSection
    :quotation-id="quotationId"
    :readonly="readonly"
  />
</template>
