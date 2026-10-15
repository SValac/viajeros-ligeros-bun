<script setup lang="ts">
import { useRedirectIfMissing } from '~/composables/use-redirect-if-missing';
import { travelDetailQuery } from '~/queries/travels';

definePageMeta({
  name: 'payments-travel',
});

const route = useRoute();

const travelId = computed(() => route.params.id as string);
const { data: travel, status } = useQuery(() => travelDetailQuery(travelId.value));

useRedirectIfMissing({ status, data: travel }, {
  to: { name: 'payments-index' },
  active: () => !!travelId.value,
});
</script>

<template>
  <div v-if="travel" class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <UButton
          icon="i-lucide-arrow-left"
          variant="ghost"
          color="neutral"
          size="sm"
          aria-label="Volver a pagos"
          :to="{ name: 'payments-index' }"
        />
        <div>
          <h1 class="text-2xl font-bold">
            Pagos — {{ travel.label }}
          </h1>
          <p class="text-sm text-muted">
            Gestión de pagos de viajeros inscritos
          </p>
        </div>
      </div>
      <UButton
        icon="i-lucide-map"
        label="Ver viaje"
        variant="outline"
        color="neutral"
        :to="{ name: 'travel-detail', params: { id: travelId } }"
      />
    </div>

    <TravelPaymentsPanel :travel-id="travelId" />
  </div>
</template>
