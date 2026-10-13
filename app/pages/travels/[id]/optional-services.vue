<script setup lang="ts">
import type { OptionalServiceListItem } from '~/components/travel/travel-optional-service-list.vue';
import type { QuotationProvider } from '~/types/quotation';

import { isPerPersonProvider } from '~/composables/quotation/use-quotation-domain';
import { useTravelRoute } from '~/composables/travels/use-travel-route';
import { useQueryLoadState } from '~/queries/load-state';
import { quotationByTravelQuery } from '~/queries/quotations';
import { travelersByTravelQuery } from '~/queries/travelers';

definePageMeta({
  name: 'travel-optional-services',
});

// Servicios de la cotización cobrados por persona (un tour, una comida): al proveedor se le
// paga por los viajeros que los toman. Todos lo toman salvo los que se desmarcan aquí.

const route = useRoute();
const router = useRouter();
const toast = useToast();
const providerStore = useProviderStore();
const quotationStore = useQuotationStore();

const { travelId, travel } = useTravelRoute();

// Los servicios salen de la cotización. La query la copia al store y la vuelve a pedir tras
// agregar o borrar viajeros, que cambian lo que se le debe a cada servicio.
const quotationQuery = useQuery(() => quotationByTravelQuery(travelId.value));
const { refetch: refetchQuotation } = quotationQuery;
const quotationLoad = useQueryLoadState(quotationQuery);
const quotation = computed(() => quotationStore.getQuotationByTravel(travelId.value));

const services = computed<QuotationProvider[]>(() => {
  if (!quotation.value)
    return [];
  return quotationStore.getProvidersByQuotation(quotation.value.id).filter(isPerPersonProvider);
});

const sellableSeats = computed(() => (quotation.value ? quotationStore.getSellableSeats(quotation.value.id, travel.value?.coordinatorIds.length ?? 0) : 0));

const listItems = computed<OptionalServiceListItem[]>(() => services.value.map(s => ({
  id: s.id,
  label: s.serviceDescription,
  providerName: getProviderName(s.providerId),
  takers: s.unitCost ? Math.round(s.payableCost / s.unitCost) : 0,
  payableCost: s.payableCost,
  overpaid: quotationStore.getProviderOverpayment(s.id) > 0,
})));

// El servicio elegido vive en la URL (?service=) para no perderlo al recargar; sin uno
// válido se muestra el primero.
const selectedServiceId = computed<string | undefined>({
  get: () => {
    const fromQuery = route.query.service;
    return services.value.find(s => s.id === fromQuery)?.id ?? services.value[0]?.id;
  },
  set: (id) => {
    router.replace({ query: { ...route.query, service: id } });
  },
});

const selectedService = computed(() => services.value.find(s => s.id === selectedServiceId.value));

const selectedAdjustments = computed(() => (selectedService.value ? quotationStore.getAdjustmentsByProvider(selectedService.value.id) : []));

// travelerId → ajuste que paga en el servicio elegido.
const selectedAdjustmentByTraveler = computed(() => new Map(
  quotationStore.travelerPriceAdjustments
    .filter(a => a.quotationProviderId === selectedService.value?.id)
    .map(a => [a.travelerId, a.adjustmentId]),
));

// Coordinadores incluidos: cuentan para el pago salvo que el proveedor les dé cortesía.
const travelersQuery = useQuery(() => travelersByTravelQuery(travelId.value));
const { data: travelerData, refetch: refetchTravelers } = travelersQuery;
const travelersLoad = useQueryLoadState(travelersQuery);
const occupants = computed(() => travelerData.value?.travelers ?? []);

// Servicio que se está guardando, para bloquear sus casillas mientras tanto.
const savingServiceId = shallowRef<string | null>(null);

watch(travelId, async (id) => {
  if (!id)
    return;
  await Promise.all([
    quotationStore.fetchProviderOptOuts(id),
    quotationStore.fetchTravelerAdjustments(id),
  ]);
}, { immediate: true });

function getProviderName(providerId: string): string {
  return providerStore.getProviderById(providerId)?.name ?? 'Proveedor desconocido';
}

async function onAdjust(travelerIds: string[], adjustmentId: string | null) {
  const service = selectedService.value;
  if (!service)
    return;

  savingServiceId.value = service.id;
  const error = await quotationStore.setTravelerAdjustment(service.id, travelId.value, travelerIds, adjustmentId);
  savingServiceId.value = null;

  if (error)
    toast.add({ title: 'No se pudo guardar el precio', description: error, color: 'error' });
}

async function onChange(travelerIds: string[], takes: boolean) {
  const service = selectedService.value;
  if (!service)
    return;

  savingServiceId.value = service.id;
  const error = await quotationStore.setServiceTakers(service.id, travelId.value, travelerIds, takes);
  savingServiceId.value = null;

  if (error)
    toast.add({ title: 'No se pudo guardar', description: error, color: 'error' });
}
</script>

<template>
  <div>
    <!-- El encabezado y la navegación los pone app/pages/travels/[id].vue -->
    <div class="space-y-6">
      <!-- Hasta que la cotización cargue (o si falla), "sin servicios" sería mentira -->
      <LoadState
        v-bind="quotationLoad"
        label="la cotización"
        @retry="refetchQuotation()"
      >
        <UCard v-if="services.length === 0">
          <EmptyState
            section="services"
            :actions="[{ label: 'Ir a los servicios de la cotización', icon: 'i-lucide-arrow-right', trailing: true, color: 'neutral', variant: 'outline', to: { name: 'quotation-services', params: { id: travelId } } }]"
          />
        </UCard>

        <div v-else class="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)] items-start">
          <UCard :ui="{ body: 'p-2 sm:p-2' }" class="lg:sticky lg:top-4">
            <TravelOptionalServiceList v-model="selectedServiceId" :items="listItems" />
          </UCard>

          <!-- Until the travelers load (or if they fail), the card's "no travelers" would be a lie -->
          <LoadState
            v-bind="travelersLoad"
            label="los viajeros"
            @retry="refetchTravelers()"
          >
            <TravelOptionalServiceCard
              v-if="selectedService"
              :key="selectedService.id"
              :service="selectedService"
              :provider-name="getProviderName(selectedService.providerId)"
              :occupants="occupants"
              :opted-out="quotationStore.getOptOutsByProvider(selectedService.id)"
              :paid="quotationStore.getPaidByProvider(selectedService.id)"
              :sellable-seats="sellableSeats"
              :adjustments="selectedAdjustments"
              :adjustment-by-traveler="selectedAdjustmentByTraveler"
              :busy="savingServiceId === selectedService.id"
              @change="onChange"
              @adjust="onAdjust"
            />
          </LoadState>
        </div>
      </LoadState>
    </div>
  </div>
</template>
