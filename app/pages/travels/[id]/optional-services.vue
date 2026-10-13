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

// Quotation services charged per person (a tour, a meal): the provider is paid
// for the travelers who take them. Everyone takes them except those unchecked here.

const route = useRoute();
const router = useRouter();
const toast = useToast();
const providerStore = useProviderStore();
const quotationStore = useQuotationStore();

const { travelId, travel } = useTravelRoute();

// The services come from the quotation. The query copies it into the store and refetches it after
// travelers are added or deleted, which changes what is owed to each service.
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

// The picked service lives in the URL (?service=) so it isn't lost on reload; without a
// valid one the first is shown.
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

// travelerId → adjustment they pay in the picked service.
const selectedAdjustmentByTraveler = computed(() => new Map(
  quotationStore.travelerPriceAdjustments
    .filter(a => a.quotationProviderId === selectedService.value?.id)
    .map(a => [a.travelerId, a.adjustmentId]),
));

// Coordinators included: they count for the payment unless the provider gives them a courtesy.
const travelersQuery = useQuery(() => travelersByTravelQuery(travelId.value));
const { data: travelerData, refetch: refetchTravelers } = travelersQuery;
const travelersLoad = useQueryLoadState(travelersQuery);
const occupants = computed(() => travelerData.value?.travelers ?? []);

// Service being saved, to lock its checkboxes meanwhile.
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
    <!-- The header and navigation come from app/pages/travels/[id].vue -->
    <div class="space-y-6">
      <!-- Until the quotation loads (or if it fails), "sin servicios" would be a lie -->
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
