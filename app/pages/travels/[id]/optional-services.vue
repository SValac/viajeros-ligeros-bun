<script setup lang="ts">
import type { OptionalServiceListItem } from '~/components/travel-optional-service-list.vue';
import type { QuotationProvider } from '~/types/quotation';

import { isPerPersonProvider } from '~/composables/quotation/use-quotation-domain';
import { useTravelRoute } from '~/composables/travels/use-travel-route';

definePageMeta({
  name: 'travel-optional-services',
});

// Servicios de la cotización cobrados por persona (un tour, una comida): al proveedor se le
// paga por los viajeros que los toman. Todos lo toman salvo los que se desmarcan aquí.

const route = useRoute();
const router = useRouter();
const toast = useToast();
const travelerStore = useTravelerStore();
const providerStore = useProviderStore();
const cotizacionStore = useCotizacionStore();

const { travelId } = useTravelRoute();

const cotizacion = computed(() => cotizacionStore.getCotizacionByTravel(travelId.value));

const services = computed<QuotationProvider[]>(() => {
  if (!cotizacion.value)
    return [];
  return cotizacionStore.getProveedoresByQuotation(cotizacion.value.id).filter(isPerPersonProvider);
});

const sellableSeats = computed(() => (cotizacion.value ? cotizacionStore.getAsientosVendibles(cotizacion.value.id) : 0));

const listItems = computed<OptionalServiceListItem[]>(() => services.value.map(s => ({
  id: s.id,
  label: s.serviceDescription,
  providerName: getProviderName(s.providerId),
  takers: s.unitCost ? Math.round(s.payableCost / s.unitCost) : 0,
  payableCost: s.payableCost,
  overpaid: cotizacionStore.getSobrepagoProveedor(s.id) > 0,
})));

// El servicio elegido vive en la URL (?servicio=) para no perderlo al recargar; sin uno
// válido se muestra el primero.
const selectedServiceId = computed<string | undefined>({
  get: () => {
    const fromQuery = route.query.servicio;
    return services.value.find(s => s.id === fromQuery)?.id ?? services.value[0]?.id;
  },
  set: (id) => {
    router.replace({ query: { ...route.query, servicio: id } });
  },
});

const selectedService = computed(() => services.value.find(s => s.id === selectedServiceId.value));

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

async function onChange(travelerIds: string[], toman: boolean) {
  const service = selectedService.value;
  if (!service)
    return;

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
          <p>Este viaje no tiene servicios cobrados por persona.</p>
          <p class="text-sm mt-1">
            En la cotización, agrega un servicio con "Costo por persona" para pagarle al proveedor solo por los viajeros que lo toman.
          </p>
          <UButton
            label="Ir a los servicios de la cotización"
            variant="ghost"
            class="mt-3"
            :to="{ name: 'quotation-services', params: { id: travelId } }"
          />
        </div>
      </UCard>

      <div v-else class="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)] items-start">
        <UCard :ui="{ body: 'p-2 sm:p-2' }" class="lg:sticky lg:top-4">
          <TravelOptionalServiceList v-model="selectedServiceId" :items="listItems" />
        </UCard>

        <TravelOptionalServiceCard
          v-if="selectedService"
          :key="selectedService.id"
          :service="selectedService"
          :provider-name="getProviderName(selectedService.providerId)"
          :occupants="occupants"
          :opted-out="cotizacionStore.getOptOutsByProveedor(selectedService.id)"
          :paid="cotizacionStore.getAnticipadoProveedor(selectedService.id)"
          :sellable-seats="sellableSeats"
          :busy="savingServiceId === selectedService.id"
          @change="onChange"
        />
      </div>
    </div>
  </div>
</template>
