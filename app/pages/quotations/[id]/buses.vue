<script setup lang="ts">
import { useQuotationRoute } from '~/composables/quotation/use-quotation-route';

definePageMeta({
  name: 'quotation-buses',
});

const cotizacionStore = useCotizacionStore();

const { travelId, quotation, readonly } = useQuotationRoute();

// Renderizada por app/pages/quotations/[id].vue solo cuando la cotización existe.
const quotationId = computed(() => quotation.value!.id);
const hasBuses = computed(() => cotizacionStore.getBusesByQuotation(quotationId.value).length > 0);

const isAgregarBusModalOpen = shallowRef(false);
</script>

<template>
  <div class="space-y-6">
    <CotizacionBusesSection
      :quotation-id="quotationId"
      :readonly="readonly"
      @agregar-bus="isAgregarBusModalOpen = true"
    />

    <!-- Operadores y coordinadores: son del viaje, se asignan en su pestaña Autobuses -->
    <UAlert
      v-if="hasBuses"
      icon="i-lucide-users"
      color="neutral"
      variant="subtle"
      title="Coordinadores y operadores"
      description="Se asignan en el viaje, en la pestaña Autobuses."
      :actions="[{ label: 'Ir al viaje', icon: 'i-lucide-arrow-right', trailing: true, to: { name: 'travel-buses', params: { id: travelId } } }]"
    />

    <CotizacionBusForm
      :open="isAgregarBusModalOpen"
      :quotation-id="quotationId"
      @update:open="(v) => isAgregarBusModalOpen = v"
      @bus-agregado="isAgregarBusModalOpen = false"
    />
  </div>
</template>
