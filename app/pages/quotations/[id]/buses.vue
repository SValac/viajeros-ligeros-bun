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

    <!-- Operadores y coordinadores: editable también con la cotización confirmada -->
    <UCard v-if="hasBuses">
      <template #header>
        <h2 class="font-semibold flex items-center gap-2">
          <span class="i-lucide-users w-5 h-5 text-muted" />
          Asignación de Autobuses
        </h2>
      </template>
      <TravelBusesSection :travel-id="travelId" editable />
    </UCard>

    <CotizacionBusForm
      :open="isAgregarBusModalOpen"
      :quotation-id="quotationId"
      @update:open="(v) => isAgregarBusModalOpen = v"
      @bus-agregado="isAgregarBusModalOpen = false"
    />
  </div>
</template>
