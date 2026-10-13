<script setup lang="ts">
import { useQuotationRoute } from '~/composables/quotation/use-quotation-route';

definePageMeta({
  name: 'quotation-accommodation',
});

const { quotation, readonly } = useQuotationRoute();

// Rendered by app/pages/quotations/[id].vue only when the quotation exists.
const quotationId = computed(() => quotation.value!.id);

const isAddAccommodationModalOpen = shallowRef(false);
</script>

<template>
  <div>
    <QuotationAccommodationSection
      :quotation-id="quotationId"
      :readonly="readonly"
      @add="isAddAccommodationModalOpen = true"
    />

    <QuotationAccommodationForm
      :open="isAddAccommodationModalOpen"
      :quotation-id="quotationId"
      @update:open="(v) => isAddAccommodationModalOpen = v"
    />
  </div>
</template>
