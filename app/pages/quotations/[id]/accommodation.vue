<script setup lang="ts">
import { useQuotationRoute } from '~/composables/quotation/use-quotation-route';

definePageMeta({
  name: 'quotation-accommodation',
});

const { quotation, readonly } = useQuotationRoute();

// Renderizada por app/pages/quotations/[id].vue solo cuando la cotización existe.
const quotationId = computed(() => quotation.value!.id);

const isAgregarHospedajeModalOpen = shallowRef(false);
</script>

<template>
  <div>
    <QuotationAccommodationSection
      :quotation-id="quotationId"
      :readonly="readonly"
      @agregar-hospedaje="isAgregarHospedajeModalOpen = true"
    />

    <QuotationAccommodationForm
      :open="isAgregarHospedajeModalOpen"
      :quotation-id="quotationId"
      @update:open="(v) => isAgregarHospedajeModalOpen = v"
    />
  </div>
</template>
