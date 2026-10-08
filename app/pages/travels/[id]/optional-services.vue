<script setup lang="ts">
import type { QuotationProvider } from '~/types/quotation';

import { useTravelRoute } from '~/composables/travels/use-travel-route';

definePageMeta({
  name: 'travel-optional-services',
});

// Servicios de la cotización que se le pagan al proveedor por los viajeros que los toman
// (un tour, una comida). El precio del asiento no cambia; solo lo que se le debe.

const toast = useToast();
const travelerStore = useTravelerStore();
const providerStore = useProviderStore();
const cotizacionStore = useCotizacionStore();

const { travelId } = useTravelRoute();

const cotizacion = computed(() => cotizacionStore.getCotizacionByTravel(travelId.value));

const services = computed<QuotationProvider[]>(() => {
  if (!cotizacion.value)
    return [];
  return cotizacionStore.getProveedoresByQuotation(cotizacion.value.id).filter(p => p.isOptional);
});

// Coordinadores incluidos: cuentan para el pago salvo que el proveedor les dé cortesía.
const occupants = computed(() => travelerStore.getOccupantsByTravel(travelId.value));

// Servicio que se está guardando, para bloquear sus casillas mientras tanto.
const savingServiceId = shallowRef<string | null>(null);

watch(travelId, async (id) => {
  if (!id)
    return;
  await Promise.all([
    travelerStore.fetchByTravel(id),
    cotizacionStore.fetchByTravel(id),
    cotizacionStore.fetchProviderOptOuts(id),
  ]);
  // Viajeros agregados o borrados desde la última carga cambian lo que se debe.
  await cotizacionStore.refreshProviderPayableCosts(id);
}, { immediate: true });

function getProviderName(providerId: string): string {
  return providerStore.getProviderById(providerId)?.name ?? 'Proveedor desconocido';
}

async function onChange(service: QuotationProvider, travelerIds: string[], toman: boolean) {
  savingServiceId.value = service.id;
  const error = await cotizacionStore.setTomanServicio(service.id, travelId.value, travelerIds, toman);
  savingServiceId.value = null;

  if (error)
    toast.add({ title: 'No se pudo guardar', description: error, color: 'error' });
}
</script>

<template>
  <div>
    <!-- El encabezado y la navegación los pone app/pages/travels/[id].vue -->
    <div class="space-y-6">
      <UCard v-if="services.length === 0">
        <div class="text-center py-8 text-muted">
          <UIcon name="i-lucide-ticket-check" class="size-10 mx-auto mb-2 opacity-40" />
          <p>Este viaje no tiene servicios opcionales.</p>
          <p class="text-sm mt-1">
            En la cotización, marca como opcional un servicio cobrado por persona para pagarle al proveedor solo por los viajeros que lo toman.
          </p>
          <UButton
            label="Ir a los servicios de la cotización"
            variant="ghost"
            class="mt-3"
            :to="{ name: 'quotation-services', params: { id: travelId } }"
          />
        </div>
      </UCard>

      <TravelOptionalServiceCard
        v-for="service in services"
        :key="service.id"
        :service="service"
        :provider-name="getProviderName(service.providerId)"
        :occupants="occupants"
        :opted-out="cotizacionStore.getOptOutsByProveedor(service.id)"
        :paid="cotizacionStore.getAnticipadoProveedor(service.id)"
        :busy="savingServiceId === service.id"
        @change="(ids, toman) => onChange(service, ids, toman)"
      />
    </div>
  </div>
</template>
