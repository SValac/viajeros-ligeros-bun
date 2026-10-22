<script setup lang="ts">
import { useRedirectIfMissing } from '~/composables/use-redirect-if-missing';
import { useQueryWithLoadState } from '~/queries/load-state';
import { travelDetailQuery } from '~/queries/travels';

definePageMeta({
  name: 'payments-travel',
});

const route = useRoute();

const travelId = computed(() => route.params.id as string);
const { data: travel, status, refetch, loadState: travelLoad } = useQueryWithLoadState(() => travelDetailQuery(travelId.value));

useRedirectIfMissing({ status, data: travel }, {
  to: { name: 'payments-index' },
  active: () => !!travelId.value,
});
</script>

<template>
  <!-- `null` = it doesn't exist: keep the skeleton while useRedirectIfMissing leaves, not a blank page -->
  <LoadState
    v-bind="travelLoad"
    :is-loaded="!!travel"
    label="el viaje"
    skeleton="detail"
    @retry="refetch()"
  >
    <div v-if="travel" class="space-y-6">
      <PageHeader
        :title="`Pagos — ${travel.label}`"
        description="Gestión de pagos de viajeros inscritos"
        :to="{ name: 'payments-index' }"
        back-label="Volver a pagos"
      >
        <template #actions>
          <UButton
            icon="i-lucide-map"
            label="Ver viaje"
            variant="outline"
            color="neutral"
            :to="{ name: 'travel-detail', params: { id: travelId } }"
          />
        </template>
      </PageHeader>

      <TravelPaymentsPanel :travel-id="travelId" />
    </div>
  </LoadState>
</template>
