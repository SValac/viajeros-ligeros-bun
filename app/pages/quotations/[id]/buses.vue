<script setup lang="ts">
import { useQuotationRoute } from '~/composables/quotation/use-quotation-route';

definePageMeta({
  name: 'quotation-buses',
});

const quotationStore = useQuotationStore();

const { travelId, quotation, readonly } = useQuotationRoute();

// Rendered by app/pages/quotations/[id].vue only when the quotation exists.
const quotationId = computed(() => quotation.value!.id);
const hasBuses = computed(() => quotationStore.getBusesByQuotation(quotationId.value).length > 0);

const isAddBusModalOpen = shallowRef(false);
</script>

<template>
  <div class="space-y-6">
    <QuotationBusSection
      :quotation-id="quotationId"
      :readonly="readonly"
      @add="isAddBusModalOpen = true"
    />

    <!-- Operators and coordinators: they belong to the travel and are assigned in its Autobuses tab -->
    <UAlert
      v-if="hasBuses"
      icon="i-lucide-users"
      color="neutral"
      variant="subtle"
      title="Coordinadores y operadores"
      description="Se asignan en el viaje, en la pestaña Autobuses."
      :actions="[{ label: 'Ir al viaje', icon: 'i-lucide-arrow-right', trailing: true, to: { name: 'travel-buses', params: { id: travelId } } }]"
    />

    <QuotationBusForm
      :open="isAddBusModalOpen"
      :quotation-id="quotationId"
      @update:open="(v) => isAddBusModalOpen = v"
      @added="isAddBusModalOpen = false"
    />
  </div>
</template>
