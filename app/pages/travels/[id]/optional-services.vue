<script setup lang="ts">
import type { OptionalServiceListItem } from '~/components/travel/travel-optional-service-list.vue';
import type { QuotationProvider } from '~/types/quotation';

import { countServiceTakers, isPerPersonProvider } from '~/composables/quotation/use-quotation-domain';
import { useTravelQuotation } from '~/composables/quotation/use-travel-quotation';
import { useTravelRoute } from '~/composables/travels/use-travel-route';
import { useQueryWithLoadState } from '~/queries/load-state';
import { travelersByTravelQuery } from '~/queries/travelers';
import { toErrorMessage } from '~/utils/error-message';

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
const { quotation, load: quotationLoad, refetch: refetchQuotation } = useTravelQuotation(travelId);

const services = computed<QuotationProvider[]>(() => {
  if (!quotation.value)
    return [];
  return quotationStore.getProvidersByQuotation(quotation.value.id).filter(isPerPersonProvider);
});

const sellableSeats = computed(() => (quotation.value ? quotationStore.getSellableSeats(quotation.value.id, travel.value?.coordinatorIds.length ?? 0) : 0));

const listItems = computed<OptionalServiceListItem[]>(() => services.value.map(s => ({
  id: s.id,
  label: s.serviceDescription,
  providerName: providerStore.getProviderName(s.providerId),
  takers: countServiceTakers(s),
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
const { data: travelerData, refetch: refetchTravelers, loadState: travelersLoad } = useQueryWithLoadState(() => travelersByTravelQuery(travelId.value));
const occupants = computed(() => travelerData.value?.travelers ?? []);

// Service being saved, to lock its checkboxes meanwhile.
const savingServiceId = shallowRef<string | null>(null);

watch(travelId, async (id) => {
  if (!id)
    return;
  try {
    await Promise.all([
      quotationStore.fetchProviderOptOuts(id),
      quotationStore.fetchTravelerAdjustments(id),
    ]);
  }
  catch (e) {
    toast.add({ title: 'No se pudo cargar quién toma cada servicio', description: toErrorMessage(e, 'Recarga la página'), color: 'error' });
  }
}, { immediate: true });

async function onAdjust(travelerIds: string[], adjustmentId: string | null) {
  const service = selectedService.value;
  if (!service)
    return;

  savingServiceId.value = service.id;
  try {
    await quotationStore.setTravelerAdjustment(service.id, travelId.value, travelerIds, adjustmentId);
  }
  catch (e) {
    toast.add({ title: 'No se pudo guardar el precio', description: toErrorMessage(e, 'Intenta de nuevo'), color: 'error' });
  }
  finally {
    savingServiceId.value = null;
  }
}

async function onChange(travelerIds: string[], takes: boolean) {
  const service = selectedService.value;
  if (!service)
    return;

  savingServiceId.value = service.id;
  try {
    await quotationStore.setServiceTakers(service.id, travelId.value, travelerIds, takes);
  }
  catch (e) {
    toast.add({ title: 'No se pudo guardar', description: toErrorMessage(e, 'Intenta de nuevo'), color: 'error' });
  }
  finally {
    savingServiceId.value = null;
  }
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
              :provider-name="providerStore.getProviderName(selectedService.providerId)"
              :occupants="occupants"
              :opted-out="quotationStore.getOptOutsByProvider(selectedService.id)"
              :paid="quotationStore.getPaidByProvider(selectedService.id)"
              :pending="quotationStore.getPendingBalanceByProvider(selectedService.id)"
              :overpaid="quotationStore.getProviderOverpayment(selectedService.id)"
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
